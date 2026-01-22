/**
 * Types for Donatrade accounts and transactions.
 * 
 * These types mirror the on-chain account structures defined in the Anchor program.
 */

/**
 * Company account data as stored on-chain.
 * This is PUBLIC information - everyone can see company existence and metadata.
 */
export interface CompanyAccount {
    /** Unique identifier for this company */
    companyId: number;
    /** Public key of the company administrator */
    companyAdmin: string;
    /** Total shares that have been issued/sold */
    totalSharesIssued: number;
    /** SHA-256 hash of the legal investment agreement */
    legalAgreementHash: number[];
    /** Whether this company is active and accepting investments */
    active: boolean;
    /** PDA bump seed */
    bump: number;
}

/**
 * Position account data as stored on-chain.
 * This contains PRIVATE information - only the investor can decrypt their balance.
 */
export interface PositionAccount {
    /** Public key of the position owner */
    owner: string;
    /** Company ID this position is for */
    companyId: number;
    /** Encrypted share balance - NOT a plain number */
    encryptedShares: number[];
    /** Whether this position is active */
    active: boolean;
    /** PDA bump seed */
    bump: number;
}

/**
 * Company data for UI display (enhanced with UI-specific fields).
 */
export interface Company {
    /** On-chain account address */
    address: string;
    /** Company display name (stored off-chain) */
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
    /** Company logo URL (optional) */
    logo?: string;
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
    /** Whether position is active */
    active: boolean;
}
