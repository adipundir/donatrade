
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { IDL } from "../lib/idl";

// Polyfill Buffer
import { Buffer } from "buffer";
if (typeof global !== "undefined") { (global as any).Buffer = Buffer; }

const provider: any = {
    connection: new Connection("http://127.0.0.1:8899"),
    publicKey: new PublicKey("11111111111111111111111111111111"),
};

async function main() {
    console.log("Starting minimal debug...");
    console.log("IDL Types:", IDL.types?.map(t => t.name));

    try {
        new Program(IDL as any, provider);
        console.log("SUCCESS");
    } catch (e: any) {
        console.log("FAILED:", e.message);
        console.log("Full Error:", JSON.stringify(e, null, 2));
    }
}

main();
