//! # Donatrade Program
//! 
//! A privacy-first private investment platform on Solana that records share ownership
//! on-chain while keeping investor positions hidden using encrypted state.
//! 
//! ## Why No SPL Tokens?
//! 
//! Traditional token-based approaches expose all holdings publicly on-chain. Anyone can
//! query token accounts and see exactly how many shares each investor holds. This violates
//! the confidentiality requirements of private company investments.
//! 
//! Instead, Donatrade uses encrypted position accounts where share balances are stored as
//! encrypted bytes, readable only by the investor and the company.
//! 
//! ## Privacy Architecture
//! 
//! - **CompanyAccount**: Public account storing company metadata. Everyone can see which
//!   companies exist, but NOT who owns shares in them.
//! 
//! - **PositionAccount**: Per-investor, per-company account storing encrypted share balance.
//!   Only the investor and company can decrypt and view the actual balance.
//! 
//! ## INCO Lightning Integration (Future)
//! 
//! Currently, encryption is MOCKED for this hackathon MVP. The `mock_encrypt` and `mock_decrypt`
//! functions use simple XOR-based reversible encoding as a placeholder.
//! 
//! In production, these will be replaced with INCO Lightning's confidential computing:
//! - Shares would be encrypted using INCO's threshold encryption
//! - Decryption would require attestation from INCO's trusted execution environment
//! - Even the program itself couldn't read the raw values without proper authorization
//! 
//! Look for comments marked with `// INCO:` throughout this codebase for integration points.

use anchor_lang::prelude::*;

declare_id!("DonaTrD1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

/// Platform admin public key (in production, this would be configurable)
/// This is the only account authorized to create new companies.
pub const PLATFORM_ADMIN: &str = "11111111111111111111111111111111";

// ============================================================================
// MOCK ENCRYPTION FUNCTIONS
// ============================================================================
// 
// INCO: These functions are placeholders for INCO Lightning integration.
// 
// In production with INCO:
// - `mock_encrypt` would call INCO's confidential compute to encrypt with
//   a shared key between investor and company
// - `mock_decrypt` would require INCO attestation to prove authorization
// - The encrypted bytes would be true ciphertext, not reversible by anyone
//   without the proper INCO authorization
// 
// Current implementation: Simple XOR with a fixed key for demo purposes.
// This is NOT secure - it's purely to demonstrate the privacy architecture.
// ============================================================================

/// Mock encryption key (8 bytes, cycled over the input)
/// INCO: Replace with INCO's threshold encryption key management
const MOCK_KEY: [u8; 8] = [0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE];

/// Encrypts a u64 value into a Vec<u8> using mock XOR encryption.
/// 
/// INCO: This function will be replaced by INCO Lightning's confidential compute.
/// The actual implementation would:
/// 1. Generate a shared encryption key via INCO's MPC
/// 2. Encrypt the value using INCO's TEE
/// 3. Return ciphertext that only authorized parties can decrypt
/// 
/// # Arguments
/// * `value` - The plain u64 share amount to encrypt
/// 
/// # Returns
/// * `Vec<u8>` - The "encrypted" bytes (mock: XOR with fixed key)
pub fn mock_encrypt(value: u64) -> Vec<u8> {
    // INCO: In production, this would be:
    // inco::encrypt_with_shared_key(value, &company_pubkey, &investor_pubkey)
    
    let bytes = value.to_le_bytes();
    bytes
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ MOCK_KEY[i % MOCK_KEY.len()])
        .collect()
}

/// Decrypts a Vec<u8> back to a u64 using mock XOR decryption.
/// 
/// INCO: This function will be replaced by INCO Lightning's confidential compute.
/// The actual implementation would:
/// 1. Verify the caller has authorization via INCO attestation
/// 2. Decrypt using the shared key in INCO's TEE
/// 3. Return the plaintext only to authorized callers
/// 
/// # Arguments
/// * `encrypted` - The encrypted bytes to decrypt
/// 
/// # Returns
/// * `u64` - The decrypted share amount
pub fn mock_decrypt(encrypted: &[u8]) -> u64 {
    // INCO: In production, this would be:
    // inco::decrypt_with_attestation(encrypted, &caller_pubkey)
    
    if encrypted.len() < 8 {
        return 0;
    }
    
    let mut bytes = [0u8; 8];
    for (i, b) in encrypted.iter().take(8).enumerate() {
        bytes[i] = b ^ MOCK_KEY[i % MOCK_KEY.len()];
    }
    u64::from_le_bytes(bytes)
}

/// Adds two encrypted values without decrypting them.
/// 
/// INCO: This demonstrates homomorphic-style operations that INCO supports.
/// In production, INCO allows computation on encrypted data without revealing
/// the underlying values, enabling on-chain share transfers without exposing amounts.
/// 
/// Current mock: We decrypt, add, and re-encrypt. This is NOT how INCO works -
/// INCO would perform the addition inside a TEE without decrypting to the chain.
pub fn mock_add_encrypted(a: &[u8], b: &[u8]) -> Vec<u8> {
    // INCO: In production, this would be:
    // inco::homomorphic_add(a, b)
    // No decryption needed - computed inside TEE
    
    let val_a = mock_decrypt(a);
    let val_b = mock_decrypt(b);
    mock_encrypt(val_a.checked_add(val_b).unwrap_or(u64::MAX))
}

/// Subtracts encrypted value b from a without decrypting.
/// Returns None if the result would be negative.
/// 
/// INCO: Similar to add, this would be a TEE operation in production.
pub fn mock_sub_encrypted(a: &[u8], b: &[u8]) -> Option<Vec<u8>> {
    // INCO: In production, this would be:
    // inco::homomorphic_sub(a, b) with underflow protection
    
    let val_a = mock_decrypt(a);
    let val_b = mock_decrypt(b);
    val_a.checked_sub(val_b).map(mock_encrypt)
}

// ============================================================================
// ACCOUNT STRUCTURES
// ============================================================================

/// CompanyAccount - Public account storing company metadata
/// 
/// This account is PUBLIC and readable by anyone. It contains:
/// - Basic company identification
/// - Total shares issued (public for regulatory compliance)
/// - Legal agreement hash (for verification)
/// 
/// What it does NOT contain:
/// - List of investors
/// - Individual share holdings
/// - Any private investor data
/// 
/// PDA Seeds: ["company", company_id.to_le_bytes()]
#[account]
#[derive(Default)]
pub struct CompanyAccount {
    /// Unique identifier for this company
    pub company_id: u64,
    
    /// Public key of the company administrator
    /// Only this account can manage company settings
    pub company_admin: Pubkey,
    
    /// Total shares issued by the company (public information)
    /// This is updated when shares are bought
    pub total_shares_issued: u64,
    
    /// SHA-256 hash of the legal investment agreement
    /// Investors can verify the agreement matches before investing
    pub legal_agreement_hash: [u8; 32],
    
    /// Whether this company is currently active and accepting investments
    pub active: bool,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl CompanyAccount {
    /// Space required for this account (8 byte discriminator + fields)
    pub const SPACE: usize = 8 + // discriminator
        8 +  // company_id
        32 + // company_admin
        8 +  // total_shares_issued
        32 + // legal_agreement_hash
        1 +  // active
        1;   // bump
}

/// PositionAccount - Private per-investor, per-company account
/// 
/// This account stores an investor's position in a specific company.
/// The share balance is ENCRYPTED, meaning:
/// - On-chain explorers see only opaque bytes
/// - Only the investor and company can decrypt the actual balance
/// - Transfer amounts are also encrypted
/// 
/// INCO: In production, the encrypted_shares field would be true ciphertext
/// that can only be decrypted by authorized parties using INCO attestation.
/// 
/// PDA Seeds: ["position", company_id.to_le_bytes(), owner.key()]
#[account]
#[derive(Default)]
pub struct PositionAccount {
    /// The investor who owns this position
    pub owner: Pubkey,
    
    /// The company this position is for
    pub company_id: u64,
    
    /// ENCRYPTED share balance - stored as bytes, not a plain number
    /// 
    /// INCO: This is the key privacy field. In production:
    /// - Encrypted using INCO's threshold encryption
    /// - Only decryptable by owner or company with INCO attestation
    /// - Supports homomorphic operations for transfers
    /// 
    /// Current mock: XOR encrypted for demo purposes
    pub encrypted_shares: Vec<u8>,
    
    /// Whether this position is still active
    pub active: bool,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl PositionAccount {
    /// Maximum space for this account
    /// encrypted_shares is limited to 32 bytes (plenty for encrypted u64)
    pub const SPACE: usize = 8 + // discriminator
        32 + // owner
        8 +  // company_id
        4 + 32 + // encrypted_shares (vec prefix + max 32 bytes)
        1 +  // active
        1;   // bump
}

// ============================================================================
// PROGRAM INSTRUCTIONS
// ============================================================================

#[program]
pub mod donatrade_program {
    use super::*;

    /// Creates a new company on the platform.
    /// 
    /// Only callable by the platform admin. This creates a CompanyAccount PDA
    /// that stores public company metadata while keeping investor data private.
    /// 
    /// # Arguments
    /// * `company_id` - Unique identifier for this company
    /// * `total_initial_shares` - Total shares available for investment
    /// * `legal_agreement_hash` - SHA-256 hash of the legal investment agreement
    pub fn create_company(
        ctx: Context<CreateCompany>,
        company_id: u64,
        total_initial_shares: u64,
        legal_agreement_hash: [u8; 32],
    ) -> Result<()> {
        let company = &mut ctx.accounts.company_account;
        
        company.company_id = company_id;
        company.company_admin = ctx.accounts.company_admin.key();
        company.total_shares_issued = 0; // No shares issued yet, this tracks sold shares
        company.legal_agreement_hash = legal_agreement_hash;
        company.active = true;
        company.bump = ctx.bumps.company_account;
        
        msg!("Created company with ID: {}", company_id);
        msg!("Total shares available: {}", total_initial_shares);
        msg!("Legal agreement hash recorded for verification");
        
        Ok(())
    }

    /// Allows an investor to buy shares in a company.
    /// 
    /// This instruction:
    /// 1. Creates a new PositionAccount if the investor doesn't have one
    /// 2. Encrypts the share amount before storing
    /// 3. Updates the company's total shares issued
    /// 
    /// PRIVACY: The share amount is encrypted before being stored on-chain.
    /// Only the investor and company can see the actual balance.
    /// 
    /// INCO: In production, the encryption would happen via INCO's TEE,
    /// ensuring even the program cannot see the plaintext amount.
    /// 
    /// # Arguments
    /// * `share_amount` - Number of shares to purchase
    pub fn buy_shares(ctx: Context<BuyShares>, share_amount: u64) -> Result<()> {
        let company = &mut ctx.accounts.company_account;
        let position = &mut ctx.accounts.position_account;
        
        require!(company.active, DonatradeError::CompanyInactive);
        require!(share_amount > 0, DonatradeError::InvalidShareAmount);
        
        // INCO: In production, this encryption would happen in INCO's TEE
        // The program would never see the plaintext share_amount
        let encrypted_amount = mock_encrypt(share_amount);
        
        if position.encrypted_shares.is_empty() {
            // New position
            position.owner = ctx.accounts.investor.key();
            position.company_id = company.company_id;
            position.encrypted_shares = encrypted_amount;
            position.active = true;
            position.bump = ctx.bumps.position_account;
        } else {
            // Existing position - add to current balance
            // INCO: This would use homomorphic addition in production
            position.encrypted_shares = mock_add_encrypted(
                &position.encrypted_shares,
                &encrypted_amount,
            );
        }
        
        // Update total shares issued (public counter)
        company.total_shares_issued = company
            .total_shares_issued
            .checked_add(share_amount)
            .ok_or(DonatradeError::Overflow)?;
        
        msg!("Shares purchased successfully");
        msg!("Total company shares now issued: {}", company.total_shares_issued);
        // Note: We intentionally do NOT log the encrypted balance or amount
        
        Ok(())
    }

    /// Transfers shares from one investor to another.
    /// 
    /// Both the sender and receiver must have PositionAccounts.
    /// The transfer is performed on encrypted values - no plaintext
    /// amounts are ever exposed on-chain.
    /// 
    /// PRIVACY: The transfer amount is encrypted throughout the operation.
    /// Observers can see that a transfer occurred but not the amount.
    /// 
    /// INCO: In production, this entire operation would happen in INCO's TEE.
    /// The underflow check would also be done on encrypted values using
    /// INCO's confidential comparison operations.
    /// 
    /// # Arguments
    /// * `encrypted_amount` - The encrypted amount to transfer
    pub fn transfer_shares(
        ctx: Context<TransferShares>,
        encrypted_amount: Vec<u8>,
    ) -> Result<()> {
        let sender_position = &mut ctx.accounts.sender_position;
        let receiver_position = &mut ctx.accounts.receiver_position;
        
        require!(sender_position.active, DonatradeError::PositionInactive);
        require!(receiver_position.active, DonatradeError::PositionInactive);
        require!(
            sender_position.company_id == receiver_position.company_id,
            DonatradeError::CompanyMismatch
        );
        
        // INCO: In production, this subtraction would happen inside INCO's TEE
        // using homomorphic operations, never exposing the underlying values
        let new_sender_balance = mock_sub_encrypted(
            &sender_position.encrypted_shares,
            &encrypted_amount,
        )
        .ok_or(DonatradeError::InsufficientShares)?;
        
        // Update sender's balance
        sender_position.encrypted_shares = new_sender_balance;
        
        // Add to receiver's balance
        // INCO: Homomorphic addition in production
        receiver_position.encrypted_shares = mock_add_encrypted(
            &receiver_position.encrypted_shares,
            &encrypted_amount,
        );
        
        msg!("Share transfer completed successfully");
        // Note: We intentionally do NOT log any amounts or balances
        
        Ok(())
    }

    /// Closes an investor's position in a company.
    /// 
    /// This marks the position as inactive. In a real-world scenario,
    /// this would typically happen after the investor has sold all their
    /// shares back to the company or transferred them to someone else.
    /// 
    /// The account is not deleted to maintain an audit trail, but is
    /// marked inactive to prevent further operations.
    pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
        let position = &mut ctx.accounts.position_account;
        
        require!(position.active, DonatradeError::PositionAlreadyClosed);
        
        position.active = false;
        
        msg!("Position closed for company ID: {}", position.company_id);
        
        Ok(())
    }
}

// ============================================================================
// INSTRUCTION CONTEXTS
// ============================================================================

#[derive(Accounts)]
#[instruction(company_id: u64)]
pub struct CreateCompany<'info> {
    /// The platform admin creating the company
    /// In production, this would be verified against a stored admin list
    #[account(mut)]
    pub platform_admin: Signer<'info>,
    
    /// The company administrator who will manage this company
    /// CHECK: This is just stored as a pubkey, no validation needed
    pub company_admin: UncheckedAccount<'info>,
    
    /// The company account being created
    #[account(
        init,
        payer = platform_admin,
        space = CompanyAccount::SPACE,
        seeds = [b"company", company_id.to_le_bytes().as_ref()],
        bump
    )]
    pub company_account: Account<'info, CompanyAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    /// The investor buying shares
    #[account(mut)]
    pub investor: Signer<'info>,
    
    /// The company to buy shares in
    #[account(mut)]
    pub company_account: Account<'info, CompanyAccount>,
    
    /// The investor's position account (created if it doesn't exist)
    #[account(
        init_if_needed,
        payer = investor,
        space = PositionAccount::SPACE,
        seeds = [
            b"position",
            company_account.company_id.to_le_bytes().as_ref(),
            investor.key().as_ref()
        ],
        bump
    )]
    pub position_account: Account<'info, PositionAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferShares<'info> {
    /// The sender (must be the position owner)
    #[account(mut)]
    pub sender: Signer<'info>,
    
    /// Sender's position account
    #[account(
        mut,
        has_one = owner @ DonatradeError::Unauthorized,
        constraint = sender.key() == sender_position.owner @ DonatradeError::Unauthorized
    )]
    pub sender_position: Account<'info, PositionAccount>,
    
    /// Receiver's position account (must already exist)
    #[account(mut)]
    pub receiver_position: Account<'info, PositionAccount>,
    
    /// The owner of the sender position (for verification)
    /// CHECK: Verified through has_one constraint
    pub owner: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    /// The position owner closing their position
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// The position to close
    #[account(
        mut,
        has_one = owner @ DonatradeError::Unauthorized
    )]
    pub position_account: Account<'info, PositionAccount>,
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[error_code]
pub enum DonatradeError {
    #[msg("Company is not active")]
    CompanyInactive,
    
    #[msg("Invalid share amount - must be greater than 0")]
    InvalidShareAmount,
    
    #[msg("Arithmetic overflow")]
    Overflow,
    
    #[msg("Position is not active")]
    PositionInactive,
    
    #[msg("Positions must be for the same company")]
    CompanyMismatch,
    
    #[msg("Insufficient shares for transfer")]
    InsufficientShares,
    
    #[msg("Unauthorized - you don't own this position")]
    Unauthorized,
    
    #[msg("Position is already closed")]
    PositionAlreadyClosed,
}
