
import { Connection, PublicKey } from '@solana/web3.js';
import { IDL } from '../lib/idl';

const RPC_URL = "https://validator.testnet.inco.org";
const PROGRAM_ID = new PublicKey(IDL.address);

async function debug() {
    const connection = new Connection(RPC_URL, 'confirmed');
    console.log(`Fetching accounts for program ${PROGRAM_ID.toBase58()}...`);

    // CompanyAccount discriminator: [37, 215, 171, 200, 8, 141, 69, 96]
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
        console.log(`Hex Data: ${acc.account.data.toString('hex').match(/.{1,64}/g)?.join('\n')}`);

        // Let's try to map fields manually if size is 91 or 92
        // disc(8) + id(8) + admin(32) + handle(16) + shares(8) + price(8) + active(1) + approved(1) + strings(8) + bump(1)
        const data = acc.account.data;
        if (data.length >= 83) {
            console.log(`Offsets analysis:`);
            console.log(`  Disc: ${data.slice(0, 8).toString('hex')}`);
            console.log(`  ID (u64): ${data.readBigUInt64LE(8)}`);
            console.log(`  Admin: ${new PublicKey(data.slice(16, 48)).toBase58()}`);
            console.log(`  CUSD Handle: ${data.slice(48, 64).toString('hex')}`);
            console.log(`  Shares (u64): ${data.readBigUInt64LE(64)}`);
            console.log(`  Price (u64): ${data.readBigUInt64LE(72)}`);
            console.log(`  Active (bool): ${data[80]}`);
            if (data.length > 81) {
                console.log(`  Approved (bool): ${data[81]}`);
            }
            if (data.length > 82) {
                console.log(`  Byte 82 (start of strings or bump?): ${data[82]}`);
            }
        }
    }
}

debug().catch(console.error);
