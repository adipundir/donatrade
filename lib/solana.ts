import { Buffer } from './buffer-polyfill';
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

// Program ID
export const PROGRAM_ID = new PublicKey("9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax");

// Inco Lightning Program ID
export const INCO_LIGHTNING_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");

// Circle Devnet USDC Mint - needed for depositing USDC tokens into the vault
export const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

/**
 * Derives the investor vault PDA
 */
export function getInvestorVaultPDA(investor: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("vault"), investor.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derives the global program vault config PDA
 */
export function getGlobalVaultPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("vault_authority")],
        PROGRAM_ID
    );
}

/**
 * Derives the company account PDA
 */
export function getCompanyPDA(companyId: number): [PublicKey, number] {
    const companyIdBuffer = new Uint8Array(8);
    new DataView(companyIdBuffer.buffer).setBigUint64(0, BigInt(companyId), true);
    return PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("company"), companyIdBuffer],
        PROGRAM_ID
    );
}

/**
 * Derives the position account PDA
 */
export function getPositionPDA(companyId: number, investor: PublicKey): [PublicKey, number] {
    const companyIdBuffer = new Uint8Array(8);
    new DataView(companyIdBuffer.buffer).setBigUint64(0, BigInt(companyId), true);
    return PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("position"), companyIdBuffer, investor.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derives the allowance PDA for Inco Lightning access control
 */
export function getAllowancePDA(handle: bigint, allowedAddress: PublicKey): [PublicKey, number] {
    const handleBuffer = new Uint8Array(16);
    new DataView(handleBuffer.buffer).setBigUint64(0, handle & BigInt('0xFFFFFFFFFFFFFFFF'), true);
    new DataView(handleBuffer.buffer).setBigUint64(8, handle >> BigInt(64), true);

    return PublicKey.findProgramAddressSync(
        [handleBuffer, allowedAddress.toBuffer()],
        INCO_LIGHTNING_ID
    );
}


import { IDL } from "./idl";

/**
 * Returns an Anchor Program instance for the DonaTrade program.
 */
export const getProgram = (connection: Connection, wallet: any): Program<any> | null => {
    if (!wallet || !wallet.publicKey) return null;

    try {
        if (typeof window !== 'undefined') {
            console.log("[DonaTrade] Buffer status:", {
                globalBuffer: typeof Buffer !== 'undefined',
                windowBuffer: typeof (window as any).Buffer !== 'undefined',
                isBuffer: Buffer.isBuffer(Uint8Array.from([1]))
            });
        }

        // Force re-instantiation of PublicKey to avoid "Expected Buffer" issues
        const publicKey = new PublicKey(wallet.publicKey.toString());

        const anchorWallet = {
            publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        };

        const provider = new AnchorProvider(connection, anchorWallet as any, {
            preflightCommitment: "processed",
            commitment: "processed",
        });

        const pid = new PublicKey(IDL.address);
        console.log(`[DonaTrade] Initializing program ${pid.toBase58()} with wallet ${publicKey.toBase58()}`);

        // Try creating program with explicit address if IDL metadata fails
        // Use global Buffer reference to ensure it's available for borsh
        if (typeof window !== 'undefined' && !(window as any).Buffer) {
            (window as any).Buffer = Buffer;
        }

        return new Program(IDL as any, provider as any);
    } catch (e: any) {
        console.error("[DonaTrade] Critical error during program initialization:", e);
        // Log more detail if it's the Buffer error
        if (e.message?.includes("Buffer")) {
            console.warn("[DonaTrade] Detected Buffer-related error. Ensure Buffer is polyfilled or use Uint8Array.");
        }
        return null;
    }
};

/**
 * Builds a deposit instruction
 */
export async function buildDepositTx(
    program: Program,
    investor: PublicKey,
    vault: PublicKey,
    investorTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey,
    amount: number
) {
    return await (program as any).methods
        .deposit(new BN(amount.toString()))
        .accounts({
            investor,
            investorVault: vault,
            investorTokenAccount,
            vaultTokenAccount,
            incoLightningProgram: INCO_LIGHTNING_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        });
}

/**
 * Authorizes the current user to decrypt a specific handle.
 */
export async function buildAuthorizeDecryptionTx(
    program: Program,
    investor: PublicKey,
    handle: bigint
) {
    const [allowancePDA] = getAllowancePDA(handle, investor);

    return await (program as any).methods
        .authorizeDecryption(new BN(handle.toString()))
        .accounts({
            investor,
            allowanceAccount: allowancePDA,
            incoLightningProgram: INCO_LIGHTNING_ID,
            systemProgram: SystemProgram.programId,
        });
}

/**
 * Builds a buy shares instruction
 */
export async function buildBuySharesTx(
    program: Program<any>,
    investor: PublicKey,
    companyId: number,
    companyAccount: PublicKey,
    shareAmount: bigint,
    remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean; }[]
) {
    const [vault] = getInvestorVaultPDA(investor);
    const [position] = getPositionPDA(companyId, investor);

    return await (program as any).methods
        .buyShares(new BN(shareAmount.toString()))
        .accounts({
            investor,
            investorVault: vault,
            companyAccount,
            position,
            incoLightningProgram: INCO_LIGHTNING_ID,
            systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts);
}

/**
 * Builds a sell shares instruction
 */
export async function buildSellSharesTx(
    program: Program<any>,
    investor: PublicKey,
    companyId: number,
    companyAccount: PublicKey,
    shareAmount: bigint,
    remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean; }[]
) {
    const [vault] = getInvestorVaultPDA(investor);
    const [position] = getPositionPDA(companyId, investor);

    return await (program as any).methods
        .sellShares(new BN(shareAmount.toString()))
        .accounts({
            investor,
            investorVault: vault,
            companyAccount,
            position,
            incoLightningProgram: INCO_LIGHTNING_ID,
            systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts);
}

/**
 * Gets the user's USDC token account
 */
export async function getUserUSDCAccount(owner: PublicKey): Promise<PublicKey> {
    return getAssociatedTokenAddress(USDC_MINT, owner);
}

/**
 * Fetches the investor vault account data
 */
export async function fetchInvestorVault(program: Program<any>, investor: PublicKey) {
    const [vaultPDA] = getInvestorVaultPDA(investor);
    try {
        const account = await (program.account as any).investorVault.fetch(vaultPDA);
        return account;
    } catch (e: any) {
        // Suppress expected error for new users who haven't created a vault yet
        if (e.message?.includes("Account does not exist") || e.message?.includes("Account") && e.message?.includes("not found")) {
            return null;
        }
        console.error("Error fetching investor vault:", e);
        return null;
    }
}

/**
 * Fetches all positions for an investor (real on-chain data)
 */
export async function fetchInvestorPositions(program: Program<any>, investor: PublicKey) {
    // In a real app, we might use gPA with filters, but for simplified demo 
    // we can fetch positions for specific companies or iterate.
    // For now, let's fetch based on the MOCK_COMPANIES IDs to bridge the UI.
    const positions = [];
    const companyIds = [1, 2, 3, 4, 5]; // Match mock data IDs

    for (const id of companyIds) {
        const [positionPDA] = getPositionPDA(id, investor);
        try {
            const data = await (program.account as any).position.fetch(positionPDA);
            if (data) {
                positions.push({ ...data, companyId: id });
            }
        } catch (e) {
            // Position doesn't exist for this company, skip
        }
    }
    return positions;
}

export { TOKEN_PROGRAM_ID, SystemProgram, BN };
