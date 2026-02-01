import { Buffer } from './buffer-polyfill';
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    Keypair,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token"; // Using spl-token for types, but direct program ID for calls

export { BN, Program };

// --- Constants ---
// Program ID
export const PROGRAM_ID = new PublicKey("2CuAjUWhAPfFuY6tCxxpqjnb43yZyRXnBM6fF7M6Y8ho");

// Inco Devnet Network settings - aligns with standard Solana Devnet
export const INCO_NETWORK = "https://api.devnet.solana.com";
// Inco Lightning Program ID
export const INCO_LIGHTNING_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");

// Circle Devnet USDC Mint - needed for depositing USDC tokens into the vault
export const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // Devnet USDC

// Platform Admin (DonaTrade official address for reviews)
export const PLATFORM_ADMIN = new PublicKey("3va6LFUv6M21AnFwVETmKbEpJfNHD48D2Aegpwm1PGDh");

/**
 * Derives the offer PDA
 */
export const getOfferPDA = (seller: PublicKey, offerId: bigint) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("offer"), seller.toBuffer(), new BN(offerId.toString()).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID // Assuming getProgramId() refers to PROGRAM_ID
    );
};

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
    // handles are little-endian u128
    const dv = new DataView(handleBuffer.buffer);
    dv.setBigUint64(0, handle & BigInt('0xFFFFFFFFFFFFFFFF'), true);
    dv.setBigUint64(8, handle >> BigInt(64), true);

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
            // Bind functions to preserve 'this' context, which is lost when destructuring useWallet
            signTransaction: wallet.signTransaction?.bind(wallet),
            signAllTransactions: wallet.signAllTransactions?.bind(wallet),
            signMessage: wallet.signMessage?.bind(wallet),
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

        console.log(`[DonaTrade] IDL Instructions (${IDL.instructions.length}):`, IDL.instructions.map(i => i.name));
        const program = new Program(IDL as any, provider as any);
        console.log("[DonaTrade] Program initialized. Available methods:", Object.keys(program.methods));

        // Final check
        if (!(program.methods as any).submitApplication && !(program.methods as any).submit_application) {
            console.error("[DonaTrade] CRITICAL: submit_application not found in program methods!");
        }

        return program;
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
export function buildDepositTx(
    program: Program,
    investor: PublicKey,
    vault: PublicKey,
    investorTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey,
    amount: bigint
) {
    return (program as any).methods
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
export function buildAuthorizeDecryptionTx(
    program: Program,
    investor: PublicKey,
    handle: bigint,
    allowedAddress: PublicKey
) {
    const [allowancePDA] = getAllowancePDA(handle, allowedAddress);

    const method = (program.methods as any).authorizeDecryption || (program.methods as any).authorize_decryption;
    if (!method) throw new Error("authorizeDecryption method not found");

    return method(new BN(handle.toString()))
        .accounts({
            investor,
            allowedAddress,
            allowanceAccount: allowancePDA,
            incoLightningProgram: INCO_LIGHTNING_ID,
            systemProgram: SystemProgram.programId,
        });
}

/**
 * Builds a buy shares instruction
 */
export function buildBuySharesTx(
    program: Program<any>,
    investor: PublicKey,
    companyId: number,
    companyAccount: PublicKey,
    shareAmount: bigint,
    remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean; }[]
) {
    const [vault] = getInvestorVaultPDA(investor);
    const [position] = getPositionPDA(companyId, investor);

    return (program.methods as any).buyShares(new BN(shareAmount.toString()))
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
export function buildSellSharesTx(
    program: Program<any>,
    investor: PublicKey,
    companyId: number,
    companyAccount: PublicKey,
    shareAmount: bigint,
    remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean; }[]
) {
    const [vault] = getInvestorVaultPDA(investor);
    const [position] = getPositionPDA(companyId, investor);

    return (program.methods as any).sellShares(new BN(shareAmount.toString()))
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
 * Builds a create company instruction
 */
export function buildCreateCompanyTx(
    program: Program<any>,
    payer: PublicKey,
    companyAdmin: PublicKey,
    companyId: number,
    initialShares: bigint,
    pricePerShare: bigint,
    offeringUrl: string, // Ciphertext
    metadataKey: bigint  // FHE Key handle
) {
    const [companyAccount] = getCompanyPDA(companyId);

    const method = (program.methods as any).createCompany || (program.methods as any).create_company;
    if (!method) throw new Error("createCompany method not found");

    return method(
        new BN(companyId.toString()),
        new BN(initialShares.toString()),
        new BN(pricePerShare.toString()),
        offeringUrl,
        new BN(metadataKey.toString())
    )
        .accounts({
            payer,
            companyAdmin,
            companyAccount,
            systemProgram: SystemProgram.programId,
        });
}

/**
 * Builds a consolidated submit application instruction.
 * This combines create_company + allow(Admin) + allow(Self) into one call.
 */
export function buildSubmitApplicationTx(
    program: Program<any>,
    payer: PublicKey,
    companyAdmin: PublicKey,
    companyId: number,
    initialShares: bigint,
    pricePerShare: bigint,
    offeringUrl: string,
    metadataHandle: bigint
) {
    const [companyAccount] = getCompanyPDA(companyId);
    const [adminAllowanceAccount] = getAllowancePDA(metadataHandle, PLATFORM_ADMIN);
    const [selfAllowanceAccount] = getAllowancePDA(metadataHandle, companyAdmin);

    const method = (program.methods as any).submitApplication || (program.methods as any).submit_application;
    if (!method) throw new Error("submitApplication method not found");

    return method(
        new BN(companyId.toString()),
        new BN(initialShares.toString()),
        new BN(pricePerShare.toString()),
        offeringUrl,
        new BN(metadataHandle.toString())
    )
        .accounts({
            payer,
            companyAdmin,
            companyAccount,
            adminAllowanceAccount,
            selfAllowanceAccount,
            platformAdmin: PLATFORM_ADMIN,
            incoLightningProgram: INCO_LIGHTNING_ID,
            systemProgram: SystemProgram.programId,
        });
}

/**
 * Builds an update offering instruction
 */
export function buildUpdateOfferingTx(
    program: Program<any>,
    companyAdmin: PublicKey,
    companyId: number,
    newPrice: bigint,
    addShares: bigint,
    active: boolean,
    offeringUrl: string | null = null,
) {
    const [companyAccount] = getCompanyPDA(companyId);

    return (program.methods as any).updateOffering(
        new BN(newPrice.toString()),
        new BN(addShares.toString()),
        active,
        offeringUrl,
    )
        .accounts({
            companyAdmin,
            companyAccount,
        });
}

/**
 * Builds a transfer shares instruction (P2P trading)
 */
export function buildTransferSharesTx(
    program: Program<any>,
    sender: PublicKey,
    receiver: PublicKey,
    companyId: number,
    shareAmount: bigint
) {
    const [senderPosition] = getPositionPDA(companyId, sender);
    const [receiverPosition] = getPositionPDA(companyId, receiver);

    return (program.methods as any).transferShares(new BN(shareAmount.toString()))
        .accounts({
            sender,
            receiver,
            senderPosition,
            receiverPosition,
            incoLightningProgram: INCO_LIGHTNING_ID,
            systemProgram: SystemProgram.programId,
        });
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
    console.log("[DonaTrade] Fetching vault for:", investor.toBase58(), "PDA:", vaultPDA.toBase58());
    try {
        const account = await (program.account as any).investorVault.fetch(vaultPDA);
        console.log("[DonaTrade] Vault found:", account);
        return account;
    } catch (e: any) {
        // Suppress expected error for new users who haven't created a vault yet
        if (e.message?.includes("Account does not exist") || (e.message?.includes("Account") && e.message?.includes("not found"))) {
            console.log("[DonaTrade] Vault does not exist (New user).");
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

/**
 * Fetches all investors (PositionAccounts) for a specific company.
 * Note: Since we don't have a getProgramAccounts filter setup perfectly for encrypted data,
 * we will filter by discriminator and check the company_id field (offset 8+32=40 usually, but let's check struct).
 * PositionStruct: owner(32) + company_id(8) + encrypted_shares(16) + bump(1)
 * Actually: Account discriminator (8) + owner(32) + company_id(8)...
 * So company_id is at offset 8+32 = 40.
 */
export async function fetchCompanyInvestors(connection: Connection, companyId: number): Promise<any[]> {
    try {
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
            filters: [
                {
                    memcmp: {
                        offset: 40, // Discriminator (8) + Owner (32)
                        bytes: new BN(companyId).toArrayLike(Buffer, 'le', 8).toString('base64'),
                        encoding: "base64"
                    }
                },
                {
                    memcmp: {
                        offset: 0,
                        // PositionAccount discriminator: [60, 125, 250, 193, 181, 109, 238, 86] (from IDL)
                        bytes: "PH36wbVt7lY=",
                        encoding: "base64"
                    }
                }
            ]
        });

        return accounts.map(acc => ({
            pubkey: acc.pubkey,
            owner: new PublicKey(acc.account.data.slice(8, 40))
        }));
    } catch (e) {
        console.error("Error fetching investors:", e);
        return [];
    }
}

/**
 * Fetches a company account owned by a specific admin.
 */
export async function fetchCompanyByAdmin(connection: Connection, admin: PublicKey): Promise<any | null> {
    try {
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
            filters: [
                {
                    memcmp: {
                        offset: 0,
                        // CompanyAccount discriminator: [37, 215, 171, 200, 8, 141, 69, 96] (from IDL)
                        bytes: "JderyAiNRWA=",
                        encoding: "base64"
                    }
                },
                {
                    memcmp: {
                        offset: 16, // Discriminator (8) + company_id (8)
                        bytes: admin.toBuffer().toString('base64'),
                        encoding: "base64"
                    }
                }
            ]
        });

        if (accounts.length === 0) return null;

        const account = accounts[0];
        console.log(`[DonaTrade] fetchCompanyByAdmin: Found account ${account.pubkey.toBase58()}, length: ${account.account.data.length}`);

        return {
            pubkey: account.pubkey,
            data: account.account.data,
        };
    } catch (e) {
        console.error("Error fetching company by admin:", e);
        return null;
    }
}

/**
 * Fetches all company accounts from the program.
 */
export async function fetchAllCompanies(connection: Connection): Promise<any[]> {
    try {
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
            filters: [
                {
                    memcmp: {
                        offset: 0,
                        bytes: "JderyAiNRWA=",
                        encoding: "base64"
                    }
                }
            ]
        });
        return accounts as any[];
    } catch (e) {
        console.error("Error fetching all companies:", e);
        return [];
    }
}

export { TOKEN_PROGRAM_ID, SystemProgram };

export function buildWithdrawCompanyFundsTx(
    program: Program,
    admin: PublicKey,
    companyId: bigint,
    amount: bigint
) {
    const [companyAccount] = getCompanyPDA(Number(companyId));
    const [globalVault] = getGlobalVaultPDA();

    // Derived tokens should be fetched outside if needed, but for builder we just need the addresses
    return (program.methods as any).withdrawCompanyFunds(new BN(amount.toString()))
        .accounts({
            companyAdmin: admin,
            companyAccount,
            globalVault,
            incoLightningProgram: INCO_LIGHTNING_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        });
}

export function buildCreateOfferTx(
    program: Program,
    seller: PublicKey,
    companyId: bigint,
    offerId: bigint,
    shareAmount: bigint,
    pricePerShare: bigint
) {
    const [companyAccount] = getCompanyPDA(Number(companyId));
    const [offerAccount] = getOfferPDA(seller, offerId);

    return (program.methods as any).createOffer(
        new BN(offerId.toString()),
        new BN(shareAmount.toString()),
        new BN(pricePerShare.toString())
    )
        .accounts({
            seller,
            companyAccount,
            offerAccount,
            systemProgram: SystemProgram.programId,
        });
}

export function buildExecuteTradeTx(
    program: Program,
    buyer: PublicKey,
    seller: PublicKey,
    offerId: bigint
) {
    const [offerAccount] = getOfferPDA(seller, offerId);
    const [buyerVault] = getInvestorVaultPDA(buyer);
    const [sellerVault] = getInvestorVaultPDA(seller);

    return (program.methods as any).executeTrade()
        .accounts({
            buyer,
            offerAccount,
            buyerVault,
            sellerVault,
            incoLightningProgram: INCO_LIGHTNING_ID,
            systemProgram: SystemProgram.programId,
        });
}

export function buildApproveCompanyTx(
    program: Program<any>,
    admin: PublicKey,
    companyAdmin: PublicKey,
    companyId: number
) {
    const [companyAccount] = getCompanyPDA(companyId);

    return (program.methods as any).approveCompany()
        .accounts({
            admin,
            companyAdmin,
            companyAccount,
            systemProgram: SystemProgram.programId,
        });
}
