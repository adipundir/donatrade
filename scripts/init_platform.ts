
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { IDL } from "../lib/idl";
import {
    PROGRAM_ID,
    USDC_MINT,
    getGlobalVaultPDA
} from "../lib/solana";
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Load wallet setup
const HOME = os.homedir();
const KEYPAIR_PATH = path.join(HOME, '.config/solana/id.json');

async function main() {
    console.log("🚀 Initializing Donatrade Platform...");

    // 1. Setup Connection and Wallet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const rawKey = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(rawKey));
    const provider = new AnchorProvider(connection, new Wallet(wallet), {});

    console.log(`Using wallet: ${wallet.publicKey.toBase58()}`);

    // 2. Initialize Program
    if (!IDL) {
        throw new Error("IDL Not Loaded!");
    }
    console.log("IDL loaded, instructions:", IDL.instructions.map((i: any) => i.name));
    const program = new Program(IDL as any, provider);

    // 3. Derive PDAs
    const [globalVaultConfig] = getGlobalVaultPDA();
    console.log(`Global Vault Config PDA: ${globalVaultConfig.toBase58()}`);

    // 4. Check if already initialized
    try {
        const existing = await (program.account as any).globalProgramVault.fetch(globalVaultConfig);
        console.log("✅ Platform already initialized!");
        console.log(`Vault USDC Account: ${existing.usdcTokenAccount.toBase58()}`);
        return;
    } catch (e) {
        console.log("Platform not initialized. Proceeding with setup...");
    }

    // 5. Create Vault Token Account (Owned by PDA)
    const vaultTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        globalVaultConfig,
        true // allowOwnerOffCurve
    );
    console.log(`Derived Vault Token Account: ${vaultTokenAccount.toBase58()}`);

    try {
        const info = await connection.getAccountInfo(vaultTokenAccount);
        if (!info) {
            console.log("Creating Vault Token Account...");
            const ix = createAssociatedTokenAccountInstruction(
                wallet.publicKey, // payer
                vaultTokenAccount, // associatedToken
                globalVaultConfig, // owner
                USDC_MINT         // mint
            );

            const tx = new Transaction().add(ix);
            const txSig = await provider.sendAndConfirm(tx, [wallet]);
            console.log(`Initialized Vault ATA: ${txSig}`);
        } else {
            console.log("Vault ATA already exists.");
        }
    } catch (e) {
        console.error("Error creating ATA:", e);
    }

    // 6. Initialize Global Vault Instruction
    try {
        console.log("Sending initialize_global_vault transaction...");
        const tx = await program.methods
            .initializeGlobalVault()
            .accounts({
                admin: wallet.publicKey,
                globalVault: globalVaultConfig,
                usdcTokenAccount: vaultTokenAccount,
                systemProgram: SystemProgram.programId,
            })
            // .signers([wallet]) // wallet is provider wallet, auto signed
            .rpc();

        console.log(`✅ Authorization Success! Tx: ${tx}`);
    } catch (e) {
        console.error("Initialization Failed:", e);
    }
}

main().catch(console.error);
