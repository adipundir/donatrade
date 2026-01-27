
import { IDL } from "../lib/idl";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Calculate discriminator
function getDiscriminator(name: string): number[] {
    const preimage = `account:${name}`;
    const hash = crypto.createHash("sha256").update(preimage).digest();
    return Array.from(hash.subarray(0, 8));
}

function toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

async function main() {
    console.log("Regenerating IDL to Anchor 0.31 format...");

    // Deep copy
    const oldIdl = JSON.parse(JSON.stringify(IDL));
    const newTypes = [...(oldIdl.types || [])];
    const newAccounts: any[] = [];

    // Process Accounts
    oldIdl.accounts.forEach((acc: any) => {
        // Enforce PascalCase for Account/Type Name
        const name = toPascalCase(acc.name);

        // Discriminator
        const discriminator = getDiscriminator(name);

        newAccounts.push({
            name: name,
            discriminator: discriminator
        });
    });

    // Flatten Euint128 in ALL types (including those copied from oldIdl.types and those implicitly in accounts if any)
    // Wait, oldIdl.accounts in 0.31 usually don't have types.
    // If they do (legacy), we moved them?
    // Let's safe guard.

    const typesToProcess = [...newTypes];

    // Flatten logic
    typesToProcess.forEach((t: any) => {
        if (t.type && t.type.fields) {
            t.type.fields.forEach((field: any) => {
                // Check if type is defined as Euint128
                if (field.type && field.type.defined && field.type.defined === "Euint128") {
                    console.log(`Flattening Euint128 for ${t.name}.${field.name}`);
                    field.type = {
                        "array": ["u8", 16]
                    };
                }
            });
        }
    });

    // Remove Euint128 from types if it exists
    const finalTypes = newTypes.filter(t => t.name !== "Euint128");

    // Fix up instruction account references
    oldIdl.instructions.forEach((ix: any) => {
        ix.accounts.forEach((acc: any) => {
            // Anchor 0.31 validation requires types to be known
            // Attempt to match names
            // Accounts in instructions (args) usually don't have "type" field in 0.31 if names match?
            // Actually, usually explicit "type" reference is good if it matches a Type definition.
            if (acc.type) {
                acc.type = toPascalCase(acc.type);
            }
        });
    });

    const newIdl = {
        version: oldIdl.version,
        name: oldIdl.name,
        address: oldIdl.address,
        metadata: oldIdl.metadata || { address: oldIdl.address },
        instructions: oldIdl.instructions,
        accounts: newAccounts,
        types: finalTypes,
        errors: oldIdl.errors
    };

    const content = `export const IDL = ${JSON.stringify(newIdl, null, 4)};\n`;
    const filePath = path.join(__dirname, "../lib/idl.ts");

    fs.writeFileSync(filePath, content);
    console.log(`Updated IDL at ${filePath}`);
}

main();
