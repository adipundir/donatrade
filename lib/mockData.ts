/**
 * Mock data for Donatrade demo.
 * 
 * This provides sample companies and positions for the frontend demo.
 * In production, this data would come from on-chain accounts.
 */

import { Company, Position, Vault } from './types';

/**
 * Sample companies for demo purposes.
 * These represent private companies accepting investments on Donatrade.
 */
export const MOCK_COMPANIES: Company[] = [
    {
        address: 'CompanyPDA1111111111111111111111111111111111',
        name: 'SpaceX',
        description: 'Private aerospace manufacturer and space transportation company. Building the future of space travel with reusable rockets and Starship.',
        companyId: 1,
        active: true,
        legalAgreementHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        totalSharesIssued: 250000,
        sharesAvailable: 750000,
        pricePerShare: 125_000_000, // $125.00 per share
        sector: 'Aerospace',
        lastDateToApply: '2024-06-15',
    },
    {
        address: 'CompanyPDA2222222222222222222222222222222222',
        name: 'Stripe',
        description: 'Financial infrastructure platform for the internet. Powers online payments for millions of businesses worldwide.',
        companyId: 2,
        active: true,
        legalAgreementHash: 'b2c3d4e5f67890123456789012345678901234567890abcdef1234567890abcd',
        totalSharesIssued: 500000,
        sharesAvailable: 500000,
        pricePerShare: 45_000_000, // $45.00 per share
        sector: 'Fintech',
        lastDateToApply: '2024-07-20',
    },
    {
        address: 'CompanyPDA3333333333333333333333333333333333',
        name: 'OpenAI',
        description: 'AI research laboratory developing safe and beneficial artificial general intelligence. Creators of GPT and ChatGPT.',
        companyId: 3,
        active: true,
        legalAgreementHash: 'c3d4e5f6789012345678901234567890123456789012345678901234567890ab',
        totalSharesIssued: 100000,
        sharesAvailable: 400000,
        pricePerShare: 250_000_000, // $250.00 per share
        sector: 'Artificial Intelligence',
        lastDateToApply: '2024-08-10',
    },
    {
        address: 'CompanyPDA4444444444444444444444444444444444',
        name: 'Anduril',
        description: 'Defense technology company building next-generation defense capabilities using AI and autonomous systems.',
        companyId: 4,
        active: true,
        legalAgreementHash: 'd4e5f67890123456789012345678901234567890123456789012345678901234',
        totalSharesIssued: 350000,
        sharesAvailable: 150000,
        pricePerShare: 75_000_000, // $75.00 per share
        sector: 'Defense Tech',
        lastDateToApply: '2024-05-30',
    },
    {
        address: 'CompanyPDA5555555555555555555555555555555555',
        name: 'Databricks',
        description: 'Unified analytics platform for data engineering, machine learning, and analytics. Leader in lakehouse architecture.',
        companyId: 5,
        active: false, // Closed offering
        legalAgreementHash: 'e5f678901234567890123456789012345678901234567890123456789012345',
        totalSharesIssued: 800000,
        sharesAvailable: 0,
        pricePerShare: 58_000_000, // $58.00 per share
        sector: 'Data & Analytics',
    },
];

/**
 * Mock encrypted bytes (simulates Euint128 handle)
 * In production, these would be actual encrypted handles from Inco Lightning
 */
function mockEncryptedBytes(value: number): number[] {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(value), true);
    view.setBigUint64(8, BigInt(0), true);
    return Array.from(new Uint8Array(buffer));
}

/**
 * Generates mock positions for a connected wallet.
 */
export function getMockPositions(walletAddress: string): Position[] {
    return [
        {
            address: `Position_${walletAddress.slice(0, 8)}_1`,
            company: MOCK_COMPANIES[0], // SpaceX
            encryptedShares: mockEncryptedBytes(150), // 150 shares
            decryptedShareCount: 150,
            active: true,
        },
        {
            address: `Position_${walletAddress.slice(0, 8)}_2`,
            company: MOCK_COMPANIES[1], // Stripe
            encryptedShares: mockEncryptedBytes(500), // 500 shares
            decryptedShareCount: 500,
            active: true,
        },
        {
            address: `Position_${walletAddress.slice(0, 8)}_3`,
            company: MOCK_COMPANIES[2], // OpenAI
            encryptedShares: mockEncryptedBytes(25), // 25 shares
            decryptedShareCount: 25,
            active: true,
        },
    ];
}

/**
 * Generates mock vault for a connected wallet.
 */
export function getMockVault(walletAddress: string): Vault {
    return {
        address: `Vault_${walletAddress.slice(0, 8)}`,
        owner: walletAddress,
        encryptedBalance: mockEncryptedBytes(50_000_000_000), // $50,000 USDC
        decryptedBalance: BigInt(50_000_000_000), // $50,000 with 6 decimals
        active: true,
    };
}

/**
 * Gets a single company by ID.
 */
export function getCompanyById(companyId: number): Company | undefined {
    return MOCK_COMPANIES.find(c => c.companyId === companyId);
}

/**
 * Gets active companies (accepting investments).
 */
export function getActiveCompanies(): Company[] {
    return MOCK_COMPANIES.filter(c => c.active);
}

/**
 * Gets closed companies (finished offerings).
 */
export function getClosedCompanies(): Company[] {
    return MOCK_COMPANIES.filter(c => !c.active);
}

/**
 * Gets a position for a specific company and wallet.
 */
export function getMockPositionForCompany(
    walletAddress: string,
    companyId: number
): Position | undefined {
    const positions = getMockPositions(walletAddress);
    return positions.find(p => p.company.companyId === companyId);
}

/**
 * Formats price per share for display
 */
export function formatPricePerShare(pricePerShare: number): string {
    const dollars = pricePerShare / 1_000_000;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(dollars);
}

/**
 * Calculates total portfolio value
 */
export function calculatePortfolioValue(positions: Position[]): number {
    return positions.reduce((total, position) => {
        const shares = position.decryptedShareCount || 0;
        const pricePerShare = position.company.pricePerShare;
        return total + (shares * pricePerShare);
    }, 0);
}
