
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC_URL = "https://validator.testnet.inco.org";
const PROGRAM_ID = new PublicKey("9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax");

async function debug() {
    const connection = new Connection(RPC_URL, 'confirmed');
    console.log(`Fetching accounts for program ${PROGRAM_ID.toBase58()}...`);

    // CompanyAccount discriminator: [37, 215, 171, 200, 8, 141, 69, 96]
    // Base64: JderyAiNRWA=
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

    console.log(`Found ${accounts.length} CompanyAccounts.`);

    for (const acc of accounts) {
        console.log(`\n--- Account: ${acc.pubkey.toBase58()} ---`);
        console.log(`Data Length: ${acc.account.data.length} bytes`);
        const data = acc.account.data;
        console.log(`Hex Data: ${data.toString('hex')}`);

        if (data.length >= 83) {
            console.log(`Offsets analysis:`);
            console.log(`  Disc: ${data.slice(0, 8).toString('hex')}`);
            // id is 8-16
            // admin is 16-48
            // handles is 48-64
            // shares is 64-72
            // price is 72-80
            // active is 80
            // approved is 81
            console.log(`  Active (bool) at 80: ${data[80]}`);
            console.log(`  Approved (bool) at 81: ${data[81]}`);
            if (data.length > 82) {
                console.log(`  Byte 82: ${data[82]}`);
            }
        }
    }
}

debug().catch(console.error);
