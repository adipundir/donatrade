import { pgTable, text, serial, timestamp, bigint } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
    id: serial('id').primaryKey(),
    walletAddress: text('wallet_address').notNull(), // Company admin's wallet
    name: text('name').notNull(),
    description: text('description').notNull(),
    sector: text('sector').notNull(),
    offeringUrl: text('offering_url').notNull(),
    logoUrl: text('logo_url'),
    initialShares: bigint('initial_shares', { mode: 'number' }).notNull(),
    pricePerShare: bigint('price_per_share', { mode: 'number' }).notNull(), // in micro-USDC (6 decimals)
    status: text('status').default('pending').notNull(), // pending | active
    legalAgreementUrl: text('legal_agreement_url'), // Added after admin approval
    chainId: bigint('chain_id', { mode: 'number' }), // Set after on-chain activation
    createdAt: timestamp('created_at').defaultNow(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

