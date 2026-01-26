/**
 * Types for Donatrade accounts and transactions.
 * 
 * These types mirror the on-chain account structures defined in the Anchor program.
 */

import { PublicKey } from "@solana/web3.js";

/**
 * Euint128 type - encrypted 128-bit unsigned integer
 * This is a handle/reference to encrypted data stored by Inco Lightning
 */
export interface Euint128 {
    handle: bigint;
}

/**
 * InvestorVault - Stores an investor's internal encrypted USDC balance
 */
export interface InvestorVaultAccount {
    /** Public key of the vault owner */
    owner: string;
    /** Encrypted USDC balance (Inco handle) */
    encryptedUsdcBalance: number[];
    /** PDA bump seed */
    bump: number;
}

/**
 * Company account data as stored on-chain.
 * Includes both public metadata and private internal USDC balance.
 */
export interface CompanyAccount {
    /** Unique identifier for this company */
    companyId: number;
    /** Public key of the company administrator */
    companyAdmin: string;
    /** Internal encrypted USDC balance (from share sales) */
    encryptedUsdcBalance: number[];
    /** Total shares that have been issued/sold */
    totalSharesIssued: number;
    /** Total shares available for sale */
    sharesAvailable: number;
    /** Price per share in USDC (6 decimals) */
    pricePerShare: number;
    /** SHA-256 hash of the legal investment agreement */
    legalAgreementHash: number[];
    /** Whether this company is active and accepting investments */
    active: boolean;
    /** PDA bump seed */
    bump: number;
}

/**
 * Position account data as stored on-chain.
 * Share balance is ENCRYPTED.
 */
export interface PositionAccount {
    /** Public key of the position owner */
    owner: string;
    /** Company ID this position is for */
    companyId: number;
    /** Encrypted share balance (Inco handle) */
    encryptedShares: number[];
    /** PDA bump seed */
    bump: number;
}

/**
 * GlobalProgramVault - Holds the physical USDC in escrow
 */
export interface GlobalProgramVaultAccount {
    /** The token account holding USDC */
    usdcTokenAccount: string;
    /** Bump seed */
    bump: number;
}

/**
 * Company data for UI display (enhanced with UI-specific fields).
 */
export interface Company {
    /** On-chain account address */
    address: string;
    /** Company display name (stored off-chain or in metadata) */
    name: string;
    /** Company description */
    description: string;
    /** Company ID */
    companyId: number;
    /** Whether accepting new investments */
    active: boolean;
    /** Legal agreement hash (hex string) */
    legalAgreementHash: string;
    /** Total shares issued */
    totalSharesIssued: number;
    /** Shares still available for purchase */
    sharesAvailable: number;
    /** Price per share in USDC (6 decimals, e.g., 1000000 = $1.00) */
    pricePerShare: number;
    /** Company logo URL (optional) */
    logo?: string;
    /** Last date to apply for the offering (ISO date string) */
    lastDateToApply?: string;
    /** Sector/industry (optional) */
    sector?: string;
}

/**
 * User's position in a company for UI display.
 */
export interface Position {
    /** Position account address */
    address: string;
    /** Company details */
    company: Company;
    /** Encrypted shares (raw bytes) */
    encryptedShares: number[];
    /** Decrypted share count (null if not yet decrypted) */
    decryptedShareCount?: number | null;
    /** Whether position is active */
    active: boolean;
}

/**
 * User's vault for UI display.
 */
export interface Vault {
    /** Vault account address */
    address: string;
    /** Owner's public key */
    owner: string;
    /** Encrypted USDC balance (raw bytes) */
    encryptedBalance: number[];
    /** Decrypted USDC balance (null if not yet decrypted) */
    decryptedBalance?: bigint | null;
    /** Whether vault is active */
    active: boolean;
}

/**
 * Transaction history entry
 */
export interface Transaction {
    /** Transaction signature */
    signature: string;
    /** Type of transaction */
    type: 'deposit' | 'withdraw' | 'buy' | 'sell' | 'transfer';
    /** Amount (may be encrypted for some types) */
    amount?: number;
    /** Company involved (for buy/sell/transfer) */
    companyId?: number;
    /** Timestamp */
    timestamp: Date;
    /** Status */
    status: 'confirmed' | 'pending' | 'failed';
}
