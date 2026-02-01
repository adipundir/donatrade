import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as fs from 'fs';

// Constants
const PROGRAM_ID = new PublicKey("9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax");
const INCO_LIGHTNING_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");
const PLATFORM_ADMIN = new PublicKey("3va6LFUv6M21AnFwVETmKbEpJfNHD48D2Aegpwm1PGDh");

async function testSubmit() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const keypairFile = './test-keypair.json';
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairFile, 'utf-8')));
    const wallet = Keypair.fromSecretKey(secretKey);
    console.log("Using wallet:", wallet.publicKey.toBase58());

    const provider = new AnchorProvider(connection, new Wallet(wallet), {
        preflightCommitment: "processed",
        commitment: "processed",
    });

    // Minimal IDL for submit_application
    const idl = {
        "address": "9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax",
        "metadata": { "name": "donatrade_program" },
        "instructions": [
            {
                "name": "submitApplication",
                "discriminator": [27, 71, 89, 170, 144, 203, 50, 8],
                "accounts": [
                    { "name": "payer", "writable": true, "signer": true },
                    { "name": "companyAdmin", "writable": true, "signer": true },
                    { "name": "companyAccount", "writable": true },
                    { "name": "adminAllowanceAccount", "writable": true },
                    { "name": "selfAllowanceAccount", "writable": true },
                    { "name": "platformAdmin" },
                    { "name": "incoLightningProgram" },
                    { "name": "systemProgram" }
                ],
                "args": [
                    { "name": "companyId", "type": "u64" },
                    { "name": "initialShares", "type": "u64" },
                    { "name": "pricePerShare", "type": "u64" },
                    { "name": "offeringUrl", "type": "string" },
                    { "name": "metadataHandle", "type": "u128" }
                ]
            }
        ]
    };

    const program = new Program(idl as any, provider);

    const companyId = Math.floor(Date.now() / 1000);
    const metadataHandle = BigInt("12345678901234567890");

    const [companyAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("company"), new BN(companyId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
    );

    const getAllowancePDA = (handle: bigint, allowedAddress: PublicKey) => {
        const handleBuffer = Buffer.alloc(16);
        handleBuffer.writeBigUInt64LE(handle & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
        handleBuffer.writeBigUInt64LE(handle >> BigInt(64), 8);
        return PublicKey.findProgramAddressSync([handleBuffer, allowedAddress.toBuffer()], INCO_LIGHTNING_ID)[0];
    };

    const adminAllowanceAccount = getAllowancePDA(metadataHandle, PLATFORM_ADMIN);
    const selfAllowanceAccount = getAllowancePDA(metadataHandle, wallet.publicKey);

    console.log("Submitting...");
    try {
        const sig = await program.methods.submitApplication(
            new BN(companyId),
            new BN(1000000),
            new BN(10),
            "https://test.com",
            new BN(metadataHandle.toString())
        ).accounts({
            payer: wallet.publicKey,
            companyAdmin: wallet.publicKey,
            companyAccount,
            adminAllowanceAccount,
            selfAllowanceAccount,
            platformAdmin: PLATFORM_ADMIN,
            incoLightningProgram: INCO_LIGHTNING_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).rpc();

        console.log("Success! Signature:", sig);
    } catch (e: any) {
        console.error("Failed:", e.message);
        if (e.logs) console.log(e.logs.join('\n'));
    }
}

testSubmit().then(() => console.log("Done")).catch(err => console.error(err));
