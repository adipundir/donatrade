import { db } from '../lib/db';
import { companies } from '../lib/db/schema';

async function main() {
    console.log("Cleaning up database...");

    // The companies table is the main one. 
    // Since this is a demo/hackathon env, we clear it to resolve the breaking contract change.
    await db.delete(companies);

    console.log("Database cleared! You can now create fresh company applications.");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
