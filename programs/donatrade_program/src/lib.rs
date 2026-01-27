//! # Donatrade Program - Simplified Internal Ledger
//!
//! A privacy-first private investment platform on Solana that records share ownership
//! and currency balances on-chain using encrypted state via INCO Lightning.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use inco_lightning::cpi::accounts::{Allow, Operation};
use inco_lightning::cpi::{allow, as_euint128, e_add, e_sub};
use inco_lightning::types::Euint128;
use inco_lightning::ID as INCO_LIGHTNING_ID;

declare_id!("9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax");

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
    pub shares_available: u64,
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

    pub fn create_company(
        ctx: Context<CreateCompany>,
        company_id: u64,
        initial_shares: u64,
        price_per_share: u64,
    ) -> Result<()> {
        let company = &mut ctx.accounts.company_account;
        company.company_id = company_id;
        company.company_admin = ctx.accounts.company_admin.key();
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

        let cost = share_amount
            .checked_mul(company.price_per_share)
            .ok_or(DonatradeError::Overflow)?;

        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let investor = ctx.accounts.investor.to_account_info();

        let e_cost = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            cost as u128,
        )?;
        let e_shares = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            share_amount as u128,
        )?;

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

        ctx.accounts.position.owner = ctx.accounts.investor.key();
        ctx.accounts.position.company_id = company.company_id;
        ctx.accounts.position.bump = ctx.bumps.position; // Store bump
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

        company.shares_available -= share_amount;
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
                    allowed_address: ctx.accounts.investor.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ),
            handle,
            true,
            ctx.accounts.investor.key(),
        )?;
        Ok(())
    }

    pub fn sell_shares<'info>(
        ctx: Context<'_, '_, '_, 'info, SellShares<'info>>,
        share_amount: u64,
    ) -> Result<()> {
        let company = &mut ctx.accounts.company_account;
        let value = share_amount
            .checked_mul(company.price_per_share)
            .ok_or(DonatradeError::Overflow)?;

        let inco_program = ctx.accounts.inco_lightning_program.to_account_info();
        let investor = ctx.accounts.investor.to_account_info();

        let e_val = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            value as u128,
        )?;
        let e_shares = as_euint128(
            CpiContext::new(
                inco_program.clone(),
                Operation {
                    signer: investor.clone(),
                },
            ),
            share_amount as u128,
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

        company.shares_available += share_amount;
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
pub struct CreateCompany<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub company_admin: UncheckedAccount<'info>,
    #[account(init, payer = admin, space = 8 + 8 + 32 + 16 + 8 + 8 + 1 + 1, seeds = [b"company", company_id.to_le_bytes().as_ref()], bump)]
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
    /// CHECK: Validated by Inco program
    #[account(mut)]
    pub allowance_account: UncheckedAccount<'info>,
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum DonatradeError {
    #[msg("Inactive")]
    Inactive,
    #[msg("Insufficient shares")]
    InsufficientShares,
    #[msg("Arithmetic overflow")]
    Overflow,
}
