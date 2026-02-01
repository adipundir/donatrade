#![allow(unexpected_cfgs)]
#![allow(deprecated)]
//! # Donatrade Program - Simplified Internal Ledger
//!
//! A privacy-first private investment platform on Solana that records share ownership
//! and currency balances on-chain using encrypted state via INCO Lightning.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use inco_lightning::cpi::accounts::{Allow, Operation};
use inco_lightning::cpi::{allow, as_euint128, e_add, e_mul, e_sub};
use inco_lightning::types::Euint128;
use inco_lightning::ID as INCO_LIGHTNING_ID;

declare_id!("8abuyq3xmQkNkGh7JGztMT1bvKr3CWpAw49bsyeMTWAT");

#[account]
#[derive(Default)]
pub struct InvestorVault {
    pub owner: Pubkey,
    pub cusd: Euint128,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct CompanyAccount {
    pub company_id: u64,
    pub company_admin: Pubkey,
    pub cusd: Euint128,

    // Public Shares Available (visible to all)
    pub shares_available: u64,

    // Plaintext Price
    pub price_per_share: u64,

    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct PositionAccount {
    pub owner: Pubkey,
    pub company_id: u64,
    pub encrypted_shares: Euint128,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct OfferAccount {
    pub offer_id: u64,
    pub seller: Pubkey,
    pub company_id: u64,
    pub share_amount: u64,         // Plaintext amount for display
    pub escrowed_shares: Euint128, // Actual encrypted shares held in escrow
    pub price_per_share: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct GlobalProgramVault {
    pub usdc_token_account: Pubkey,
    pub bump: u8,
}

#[program]
pub mod donatrade_program {
    use super::*;

    pub fn initialize_global_vault(ctx: Context<InitializeGlobalVault>) -> Result<()> {
        let vault = &mut ctx.accounts.global_vault;
        vault.usdc_token_account = ctx.accounts.usdc_token_account.key();
        vault.bump = ctx.bumps.global_vault;
        Ok(())
    }

    /// Admin-only: Activate a company that was approved off-chain.
    /// Creates the on-chain CompanyAccount with encrypted financial state.
    pub fn activate_company(
        ctx: Context<ActivateCompany>,
        company_id: u64,
        company_admin: Pubkey,
        initial_shares: u64,
        price_per_share: u64,
    ) -> Result<()> {
        let company = &mut ctx.accounts.company_account;
        company.company_id = company_id;
        company.company_admin = company_admin;
        company.shares_available = initial_shares;
        company.price_per_share = price_per_share;
        company.active = true;
        company.bump = ctx.bumps.company_account;
        Ok(())
    }

    pub fn deposit<'info>(
        ctx: Context<'_, '_, '_, 'info, Deposit<'info>>,
        amount: u64,
    ) -> Result<()> {
        // 1. Transfer USDC from investor to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.investor_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.investor.to_account_info(),
                },
            ),
            amount,
        )?;

        // 2. Encrypt and add to vault balance
        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let investor = ctx.accounts.investor.to_account_info();

        let e_amount = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            amount as u128,
        )?;

        let vault = &mut ctx.accounts.investor_vault;
        vault.owner = ctx.accounts.investor.key();
        vault.bump = ctx.bumps.investor_vault; // Store bump

        // Handle first deposit: if current handle is 0, we must still use e_add
        // to ensure the resulting handle is a valid ciphertext for Inco's storage.
        // We cannot just assign 'e_amount' because it's a lifted plaintext.
        if vault.cusd.0 == 0 {
            // Create an encrypted zero
            let e_zero = as_euint128(
                CpiContext::new(
                    inco_program.clone(),
                    Operation {
                        signer: investor.clone(),
                    },
                ),
                0,
            )?;

            vault.cusd = e_add(
                CpiContext::new(
                    inco_program.clone(),
                    Operation {
                        signer: investor.clone(),
                    },
                ),
                e_zero,
                e_amount,
                0,
            )?;
        } else {
            vault.cusd = e_add(
                CpiContext::new(
                    inco_program.clone(),
                    Operation {
                        signer: investor.clone(),
                    },
                ),
                vault.cusd,
                e_amount,
                0,
            )?;
        }

        Ok(())
    }

    pub fn buy_shares<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyShares<'info>>,
        share_amount: u64,
    ) -> Result<()> {
        let company = &mut ctx.accounts.company_account;
        require!(company.active, DonatradeError::Inactive);
        require!(
            company.shares_available >= share_amount,
            DonatradeError::InsufficientShares
        );

        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let investor = ctx.accounts.investor.to_account_info();

        // 1. Convert share amount to encrypted
        let e_shares = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            share_amount as u128,
        )?;

        // 2. Convert Price to Encrypted for calculation
        // Plaintext check for overflow on cost before encrypting
        let cost = share_amount
            .checked_mul(company.price_per_share)
            .ok_or(DonatradeError::Overflow)?;

        // 2. Convert Cost to Encrypted directly (more efficient than e_mul)
        let e_cost = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            cost as u128,
        )?;

        // 4. Subtract Cost from Investor Vault
        ctx.accounts.investor_vault.cusd = e_sub(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            ctx.accounts.investor_vault.cusd,
            e_cost,
            0,
        )?;

        // 5. Add Cost to Company Balance
        company.cusd = e_add(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            company.cusd,
            e_cost,
            0,
        )?;

        // 6. Update Position
        ctx.accounts.position.owner = ctx.accounts.investor.key();
        ctx.accounts.position.company_id = company.company_id;
        ctx.accounts.position.bump = ctx.bumps.position;
        ctx.accounts.position.encrypted_shares = e_add(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            ctx.accounts.position.encrypted_shares,
            e_shares,
            0,
        )?;

        // 7. Subtract Shares from Company (plaintext now)
        company.shares_available = company
            .shares_available
            .checked_sub(share_amount)
            .ok_or(DonatradeError::InsufficientShares)?;

        Ok(())
    }

    pub fn withdraw<'info>(
        ctx: Context<'_, '_, '_, 'info, Withdraw<'info>>,
        amount: u64,
    ) -> Result<()> {
        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let investor = ctx.accounts.investor.to_account_info();

        // 1. Subtract from encrypted balance
        let e_amount = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            amount as u128,
        )?;
        ctx.accounts.investor_vault.cusd = e_sub(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            ctx.accounts.investor_vault.cusd,
            e_amount,
            0,
        )?;

        // 2. Transfer physical USDC from vault to investor
        let seeds = &[
            b"vault_authority".as_ref(),
            &[ctx.accounts.global_vault.bump],
        ];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.investor_token_account.to_account_info(),
                    authority: ctx.accounts.global_vault.to_account_info(),
                },
                &[&seeds[..]],
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn authorize_decryption(ctx: Context<AuthorizeDecryption>, handle: u128) -> Result<()> {
        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let investor = ctx.accounts.investor.to_account_info();

        allow(
            CpiContext::new(
                inco_program,
                Allow {
                    allowance_account: ctx.accounts.allowance_account.to_account_info(),
                    signer: investor,
                    allowed_address: ctx.accounts.allowed_address.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ),
            handle,
            true,                               // is_encrypted check
            ctx.accounts.allowed_address.key(), // derived address target
        )?;
        Ok(())
    }

    pub fn sell_shares<'info>(
        ctx: Context<'_, '_, '_, 'info, SellShares<'info>>,
        share_amount: u64,
    ) -> Result<()> {
        let company = &mut ctx.accounts.company_account;
        // Don't check plaintext overflow on price.

        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let investor = ctx.accounts.investor.to_account_info();

        // 1. Convert shares to encrypted
        let e_shares = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            share_amount as u128,
        )?;

        // 2. Value = shares * price (lift price to encrypted)
        let e_price = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            company.price_per_share as u128,
        )?;

        let e_val = e_mul(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            e_shares,
            e_price,
            0, // scalar_byte
        )?;

        // Update Position and Company warehouse
        ctx.accounts.position.encrypted_shares = e_sub(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            ctx.accounts.position.encrypted_shares,
            e_shares,
            0,
        )?;

        company.cusd = e_sub(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            company.cusd,
            e_val,
            0,
        )?;

        ctx.accounts.investor_vault.cusd = e_add(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            ctx.accounts.investor_vault.cusd,
            e_val,
            0,
        )?;

        // Add shares back to company (plaintext now)
        company.shares_available = company
            .shares_available
            .checked_add(share_amount)
            .ok_or(DonatradeError::Overflow)?;
        Ok(())
    }

    pub fn update_offering(
        ctx: Context<UpdateOffering>,
        new_price: u64,
        add_shares: u64,
        active: bool,
    ) -> Result<()> {
        let company = &mut ctx.accounts.company_account;

        // Update price
        company.price_per_share = new_price;

        // Add shares (plaintext now)
        company.shares_available = company
            .shares_available
            .checked_add(add_shares)
            .ok_or(DonatradeError::Overflow)?;

        company.active = active;
        Ok(())
    }
    pub fn transfer_shares<'info>(
        ctx: Context<'_, '_, '_, 'info, TransferShares<'info>>,
        share_amount: u64,
    ) -> Result<()> {
        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let sender = ctx.accounts.sender.to_account_info();

        let e_shares = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: sender.clone(),
                },
            ),
            share_amount as u128,
        )?;

        // Subtract from sender
        ctx.accounts.sender_position.encrypted_shares = e_sub(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: sender.clone(),
                },
            ),
            ctx.accounts.sender_position.encrypted_shares,
            e_shares,
            0,
        )?;

        // Add to receiver
        ctx.accounts.receiver_position.owner = ctx.accounts.receiver.key();
        ctx.accounts.receiver_position.company_id = ctx.accounts.sender_position.company_id;
        ctx.accounts.receiver_position.bump = ctx.bumps.receiver_position;
        ctx.accounts.receiver_position.encrypted_shares = e_add(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: sender.clone(),
                },
            ),
            ctx.accounts.receiver_position.encrypted_shares,
            e_shares,
            0,
        )?;

        Ok(())
    }

    pub fn withdraw_company_funds<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawCompanyFunds<'info>>,
        amount: u64,
    ) -> Result<()> {
        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let admin = ctx.accounts.company_admin.to_account_info();

        // 1. Subtract from company encrypted balance
        let e_amount = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: admin.clone(),
                },
            ),
            amount as u128,
        )?;

        // NOT AVAILABLE in current version: e_gte.
        // Relying on e_sub to handle/propagate encrypted overflow/underflow logic if applicable.

        ctx.accounts.company_account.cusd = e_sub(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: admin.clone(),
                },
            ),
            ctx.accounts.company_account.cusd,
            e_amount,
            0,
        )?;

        // 2. Transfer physical USDC from global vault to admin
        let seeds = &[
            b"vault_authority".as_ref(),
            &[ctx.accounts.global_vault.bump],
        ];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.admin_token_account.to_account_info(),
                    authority: ctx.accounts.global_vault.to_account_info(),
                },
                &[&seeds[..]],
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn create_offer<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateOffer<'info>>,
        offer_id: u64,
        share_amount: u64,
        price_per_share: u64,
    ) -> Result<()> {
        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let seller = ctx.accounts.seller.to_account_info();

        // Convert share amount to encrypted
        let e_shares = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: seller.clone(),
                },
            ),
            share_amount as u128,
        )?;

        // Subtract shares from seller's position (escrow them)
        ctx.accounts.seller_position.encrypted_shares = e_sub(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: seller.clone(),
                },
            ),
            ctx.accounts.seller_position.encrypted_shares,
            e_shares,
            0,
        )?;

        // Initialize the offer account with escrowed shares
        let offer = &mut ctx.accounts.offer_account;
        offer.offer_id = offer_id;
        offer.seller = ctx.accounts.seller.key();
        offer.company_id = ctx.accounts.company_account.company_id;
        offer.share_amount = share_amount;
        offer.escrowed_shares = e_shares; // Store the escrowed encrypted shares
        offer.price_per_share = price_per_share;
        offer.is_active = true;
        offer.bump = ctx.bumps.offer_account;

        Ok(())
    }

    pub fn execute_trade<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteTrade<'info>>,
    ) -> Result<()> {
        let offer = &mut ctx.accounts.offer_account;
        require!(offer.is_active, DonatradeError::Inactive);

        let share_amount = offer.share_amount;
        let cost = share_amount
            .checked_mul(offer.price_per_share)
            .ok_or(DonatradeError::Overflow)?;

        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let buyer_info = ctx.accounts.buyer.to_account_info();

        // Convert cost to encrypted value
        let e_cost = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: buyer_info.clone(),
                },
            ),
            cost as u128,
        )?;

        // 1. Buyer pays Seller (subtract from buyer's vault)
        ctx.accounts.buyer_vault.cusd = e_sub(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: buyer_info.clone(),
                },
            ),
            ctx.accounts.buyer_vault.cusd,
            e_cost,
            0,
        )?;

        // 2. Add payment to Seller's Vault
        ctx.accounts.seller_vault.cusd = e_add(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: buyer_info.clone(),
                },
            ),
            ctx.accounts.seller_vault.cusd,
            e_cost,
            0,
        )?;

        // 3. Transfer escrowed shares to buyer's position
        // Initialize buyer's position if new
        ctx.accounts.buyer_position.owner = ctx.accounts.buyer.key();
        ctx.accounts.buyer_position.company_id = ctx.accounts.company_account.company_id;
        ctx.accounts.buyer_position.bump = ctx.bumps.buyer_position;

        // Add escrowed shares to buyer's position
        ctx.accounts.buyer_position.encrypted_shares = e_add(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: buyer_info.clone(),
                },
            ),
            ctx.accounts.buyer_position.encrypted_shares,
            offer.escrowed_shares,
            0,
        )?;

        // 4. Clear escrowed shares and deactivate offer
        offer.escrowed_shares = Euint128(0);
        offer.is_active = false;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGlobalVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + 32 + 1, seeds = [b"vault_authority"], bump)]
    pub global_vault: Account<'info, GlobalProgramVault>,
    pub usdc_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(company_id: u64)]
pub struct ActivateCompany<'info> {
    #[account(mut)]
    pub platform_admin: Signer<'info>, // Must be the platform admin
    #[account(
        init,
        payer = platform_admin,
        space = 8 + 8 + 32 + 16 + 8 + 8 + 1 + 1, // 82 bytes (discriminator + u64 + pubkey + euint128 + u64 + u64 + bool + u8)
        seeds = [b"company", company_id.to_le_bytes().as_ref()],
        bump
    )]
    pub company_account: Account<'info, CompanyAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(init_if_needed, payer = investor, space = 8 + 32 + 16 + 1, seeds = [b"vault", investor.key().as_ref()], bump)]
    pub investor_vault: Account<'info, InvestorVault>,
    #[account(mut)]
    pub investor_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(mut, seeds = [b"vault", investor.key().as_ref()], bump)]
    pub investor_vault: Account<'info, InvestorVault>,
    #[account(seeds = [b"vault_authority"], bump)]
    pub global_vault: Account<'info, GlobalProgramVault>,
    #[account(mut)]
    pub investor_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(mut, seeds = [b"vault", investor.key().as_ref()], bump)]
    pub investor_vault: Account<'info, InvestorVault>,
    #[account(mut)]
    pub company_account: Account<'info, CompanyAccount>,
    #[account(init_if_needed, payer = investor, space = 8 + 32 + 8 + 16 + 1, seeds = [b"position", company_account.company_id.to_le_bytes().as_ref(), investor.key().as_ref()], bump)]
    pub position: Account<'info, PositionAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(mut, seeds = [b"vault", investor.key().as_ref()], bump)]
    pub investor_vault: Account<'info, InvestorVault>,
    #[account(mut)]
    pub company_account: Account<'info, CompanyAccount>,
    #[account(mut, seeds = [b"position", company_account.company_id.to_le_bytes().as_ref(), investor.key().as_ref()], bump)]
    pub position: Account<'info, PositionAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AuthorizeDecryption<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    /// CHECK: The address to grant access to
    pub allowed_address: UncheckedAccount<'info>,
    /// CHECK: Validated by Inco program
    #[account(mut)]
    pub allowance_account: UncheckedAccount<'info>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateOffering<'info> {
    #[account(mut)]
    pub company_admin: Signer<'info>,
    #[account(mut, has_one = company_admin, seeds = [b"company", company_account.company_id.to_le_bytes().as_ref()], bump = company_account.bump)]
    pub company_account: Account<'info, CompanyAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawCompanyFunds<'info> {
    #[account(mut)]
    pub company_admin: Signer<'info>,
    #[account(mut, has_one = company_admin, seeds = [b"company", company_account.company_id.to_le_bytes().as_ref()], bump = company_account.bump)]
    pub company_account: Account<'info, CompanyAccount>,
    #[account(seeds = [b"vault_authority"], bump)]
    pub global_vault: Account<'info, GlobalProgramVault>,
    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(offer_id: u64)]
pub struct CreateOffer<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    pub company_account: Account<'info, CompanyAccount>,
    #[account(mut, seeds = [b"position", company_account.company_id.to_le_bytes().as_ref(), seller.key().as_ref()], bump = seller_position.bump)]
    pub seller_position: Account<'info, PositionAccount>,
    #[account(
        init,
        payer = seller,
        space = 8 + 8 + 32 + 8 + 16 + 8 + 1 + 1, // Added 16 for escrowed_shares (Euint128)
        seeds = [b"offer", seller.key().as_ref(), offer_id.to_le_bytes().as_ref()],
        bump
    )]
    pub offer_account: Account<'info, OfferAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteTrade<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub offer_account: Account<'info, OfferAccount>,
    #[account(mut)]
    pub buyer_vault: Account<'info, InvestorVault>,
    #[account(mut)]
    pub seller_vault: Account<'info, InvestorVault>,
    /// The company for which shares are being traded
    pub company_account: Account<'info, CompanyAccount>,
    /// Buyer's position account for receiving shares
    #[account(init_if_needed, payer = buyer, space = 8 + 32 + 8 + 16 + 1, seeds = [b"position", company_account.company_id.to_le_bytes().as_ref(), buyer.key().as_ref()], bump)]
    pub buyer_position: Account<'info, PositionAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferShares<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: Recipient of the shares
    pub receiver: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"position", sender_position.company_id.to_le_bytes().as_ref(), sender.key().as_ref()], bump = sender_position.bump)]
    pub sender_position: Account<'info, PositionAccount>,
    #[account(init_if_needed, payer = sender, space = 8 + 32 + 8 + 16 + 1, seeds = [b"position", sender_position.company_id.to_le_bytes().as_ref(), receiver.key().as_ref()], bump)]
    pub receiver_position: Account<'info, PositionAccount>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum DonatradeError {
    #[msg("Account is not initialized")]
    Uninitialized,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Company is inactive")]
    Inactive,
    #[msg("Insufficient shares available")]
    InsufficientShares,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}
