
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { IDL } from "../lib/idl";

// Polyfill Buffer explicitly
import { Buffer } from "buffer";
if (typeof global !== "undefined") {
    (global as any).Buffer = Buffer;
}

async function main() {
    console.log("Starting Anchor IDL debug...");

    // Mock Provider with minimal valid connection
    const connection = new Connection("http://127.0.0.1:8899");
    const provider = {
        connection: connection,
        publicKey: new PublicKey("11111111111111111111111111111111"),
        sendAndConfirm: async () => "",
        simulate: async () => ({ value: { logs: [] } }),
        wallet: {
            publicKey: new PublicKey("11111111111111111111111111111111"),
            signTransaction: async (tx: any) => tx,
            signAllTransactions: async (txs: any[]) => txs
        }
    };

    try {
        console.log("Initializing Program...");
        // Explicitly cast IDL
        const program = new Program(IDL as any, provider as any);
        console.log("Program initialized successfully!");

        // Check if account namespace is created
        if (program.account && (program.account as any).investorVault) {
            console.log("Account namespace 'investorVault' exists.");
        } else {
            console.log("Account namespace 'investorVault' MISSING.");
            // Log what IS there
            if (program.account) {
                console.log("Available accounts:", Object.keys(program.account));
            } else {
                console.log("program.account is undefined");
            }
        }

    } catch (e: any) {
        console.error("FAILED to initialize Program:");
        console.error(e.message);
        console.error(e);
    }
}

main();
