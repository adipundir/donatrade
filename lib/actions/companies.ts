'use server';

import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createCompanyApplication(data: {
    walletAddress: string;
    name: string;
    description: string;
    sector: string;
    offeringUrl: string;
    initialShares: number;
    pricePerShare: number;
    logoUrl?: string;
}) {
    try {
        const newCompany = await db.insert(companies).values({
            walletAddress: data.walletAddress,
            name: data.name,
            description: data.description,
            sector: data.sector,
            offeringUrl: data.offeringUrl,
            logoUrl: data.logoUrl || '',
            initialShares: data.initialShares,
            pricePerShare: data.pricePerShare,
            status: 'pending',
        }).returning();

        return { success: true, company: newCompany[0] };
    } catch (error: any) {
        console.error('Error creating company:', error);
        return { success: false, error: error.message || 'Failed to create company' };
    }
}

export async function getCompanies(status?: string) {
    try {
        let result;
        if (status) {
            result = await db.select().from(companies).where(eq(companies.status, status));
        } else {
            result = await db.select().from(companies);
        }
        return { success: true, companies: result };
    } catch (error: any) {
        console.error('Error fetching companies:', error);
        return { success: false, error: error.message, companies: [] };
    }
}

export async function getCompanyByWallet(walletAddress: string) {
    try {
        const result = await db.select().from(companies).where(eq(companies.walletAddress, walletAddress));
        return { success: true, company: result[0] || null };
    } catch (error: any) {
        console.error('Error fetching company by wallet:', error);
        return { success: false, error: error.message, company: null };
    }
}

/**
 * Combined approve and activate - called after on-chain tx succeeds.
 * Sets legal agreement URL, chainId, and status to 'active' in one step.
 */
export async function approveAndActivateCompany(
    companyId: number,
    legalAgreementUrl: string,
    chainId: number
) {
    try {
        const updated = await db
            .update(companies)
            .set({
                status: 'active',
                legalAgreementUrl,
                chainId
            })
            .where(eq(companies.id, companyId))
            .returning();

        if (updated.length === 0) {
            return { success: false, error: 'Company not found' };
        }

        return { success: true, company: updated[0] };
    } catch (error: any) {
        console.error('Error approving and activating company:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get a specific company by its database ID.
 */
export async function getCompanyById(id: number) {
    try {
        const result = await db.select().from(companies).where(eq(companies.id, id));
        return { success: true, company: result[0] || null };
    } catch (error: any) {
        console.error('Error fetching company by id:', error);
        return { success: false, error: error.message, company: null };
    }
}
