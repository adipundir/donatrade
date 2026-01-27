
const { Program, AnchorProvider, PublicKey } = require("@coral-xyz/anchor");
const { IDL } = require("../lib/idl");
// Polyfill Buffer just in case
const { Buffer } = require("buffer");
global.Buffer = Buffer;

async function main() {
    console.log("Starting Anchor IDL debug...");

    // Mock Provider
    const provider = {
        connection: {},
        wallet: {
            publicKey: new PublicKey("11111111111111111111111111111111"),
            signTransaction: () => { },
            signAllTransactions: () => { }
        },
        opts: {}
    };

    try {
        console.log("Initializing Program...");
        // Explicitly cast IDL if needed, but in JS it's just an object
        const program = new Program(IDL, provider);
        console.log("Program initialized successfully!");

        // Check if account namespace is created
        if (program.account && program.account.investorVault) {
            console.log("Account namespace 'investorVault' exists.");
        } else {
            console.log("Account namespace 'investorVault' MISSING.");
            console.log("Available accounts:", Object.keys(program.account || {}));
        }

    } catch (e) {
        console.error("FAILED to initialize Program:");
        console.error(e);
        console.error(JSON.stringify(e, null, 2));
    }
}

main();
