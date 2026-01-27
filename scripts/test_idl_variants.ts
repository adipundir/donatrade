
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

function testVariant(name: string, modifyIdlFn: (idl: any) => void) {
    console.log(`Testing variant: ${name}`);
    const idlClone = JSON.parse(JSON.stringify(IDL));
    modifyIdlFn(idlClone);
    try {
        new Program(idlClone, provider);
        console.log(`SUCCESS: ${name}`);
    } catch (e: any) {
        console.log(`FAILED: ${name} - ${e.message}`);
    }
}

async function main() {
    // Variant 1: Current state (PascalCase accounts, type refs in instructions)
    testVariant("Current State", (idl) => { });

    // Variant 2: PascalCase accounts, NO type refs in instructions
    testVariant("PascalCase Accounts, No Instruction Types", (idl) => {
        idl.instructions.forEach((ix: any) => {
            ix.accounts.forEach((acc: any) => {
                delete acc.type;
            });
        });
    });

    // Variant 3: camelCase accounts, NO type refs in instructions
    testVariant("camelCase Accounts, No Instruction Types", (idl) => {
        idl.accounts.forEach((acc: any) => {
            acc.name = acc.name.charAt(0).toLowerCase() + acc.name.slice(1);
        });
        idl.instructions.forEach((ix: any) => {
            ix.accounts.forEach((acc: any) => {
                delete acc.type;
            });
        });
    });

    // Variant 4: camelCase accounts, camelCase type refs matching
    testVariant("camelCase Accounts, camelCase Instruction Types", (idl) => {
        idl.accounts.forEach((acc: any) => {
            acc.name = acc.name.charAt(0).toLowerCase() + acc.name.slice(1);
        });
        idl.instructions.forEach((ix: any) => {
            ix.accounts.forEach((acc: any) => {
                if (acc.type) {
                    acc.type = acc.type.charAt(0).toLowerCase() + acc.type.slice(1);
                }
            });
        });
    });

    // Variant 5: Empty accounts
    testVariant("Empty Accounts", (idl) => {
        idl.accounts = [];
    });

    // Variant 7: Only GlobalProgramVault (no change, just filter)
    testVariant("Only GlobalProgramVault", (idl) => {
        idl.accounts = idl.accounts.filter((a: any) => a.name === "GlobalProgramVault" || a.name === "globalProgramVault");
    });

    // Variant 8: Modern 0.30+ Format (Type De-inlining + Discriminators)
    testVariant("Modern 0.30+ Format", (idl) => {
        const crypto = require("crypto");
        const newTypes: any[] = [...(idl.types || [])];
        const newAccounts: any[] = [];

        idl.accounts.forEach((acc: any) => {
            // Calculate discriminator: sha256("account:<Name>")[:8]
            const name = acc.name.charAt(0).toUpperCase() + acc.name.slice(1); // Ensure PascalCase
            const preimage = `account:${name}`;
            const hash = crypto.createHash("sha256").update(preimage).digest();
            const discriminator = Array.from(hash.subarray(0, 8));

            // Add to new accounts list
            newAccounts.push({
                name: name,
                discriminator: discriminator
            });

            // Move definition to types if not already there
            if (!newTypes.find(t => t.name === name)) {
                newTypes.push({
                    name: name,
                    type: acc.type // The struct definition
                });
            }
        });

        idl.accounts = newAccounts;
        idl.types = newTypes;

        // Ensure instructions use matching PascalCase type refs (optional but good)
        idl.instructions.forEach((ix: any) => {
            ix.accounts.forEach((acc: any) => {
                if (acc.type) {
                    acc.type = acc.type.charAt(0).toUpperCase() + acc.type.slice(1);
                }
            });
        });
    });
}

main();
