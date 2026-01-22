/**
 * Mock data for Donatrade demo.
 * 
 * This provides sample companies and positions for the frontend demo
 * without requiring actual on-chain deployment.
 * 
 * In production, this data would come from on-chain accounts.
 */

import { Company, Position } from './types';
import { mockEncrypt } from './encryption';

/**
 * Sample companies for demo purposes.
 * These represent private companies accepting investments on Donatrade.
 */
export const MOCK_COMPANIES: Company[] = [
    {
        address: 'CompanyPDA1111111111111111111111111111111111',
        name: 'Quantum Dynamics',
        description: 'Next-generation quantum computing solutions for enterprise applications. Our technology enables secure computation on encrypted data.',
        companyId: 1,
        active: true,
        legalAgreementHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        totalSharesIssued: 250000,
        logo: undefined,
    },
    {
        address: 'CompanyPDA2222222222222222222222222222222222',
        name: 'Privacy Labs',
        description: 'Building the infrastructure for confidential blockchain transactions. Backed by leading privacy researchers and cryptographers.',
        companyId: 2,
        active: true,
        legalAgreementHash: 'b2c3d4e5f67890123456789012345678901234567890abcdef1234567890abcd',
        totalSharesIssued: 500000,
        logo: undefined,
    },
    {
        address: 'CompanyPDA3333333333333333333333333333333333',
        name: 'Secure Capital',
        description: 'Decentralized private equity platform for accredited investors. Bringing institutional-grade privacy to digital asset management.',
        companyId: 3,
        active: true,
        legalAgreementHash: 'c3d4e5f6789012345678901234567890123456789012345678901234567890ab',
        totalSharesIssued: 1000000,
        logo: undefined,
    },
    {
        address: 'CompanyPDA4444444444444444444444444444444444',
        name: 'ZK Ventures',
        description: 'Zero-knowledge proof infrastructure for private financial applications. Enabling verifiable computation without disclosure.',
        companyId: 4,
        active: false,
        legalAgreementHash: 'd4e5f67890123456789012345678901234567890123456789012345678901234',
        totalSharesIssued: 750000,
        logo: undefined,
    },
];

/**
 * Generates mock positions for a connected wallet.
 * In production, these would be fetched from on-chain PositionAccounts.
 */
export function getMockPositions(walletAddress: string): Position[] {
    // Return positions in some of the companies
    return [
        {
            address: `Position_${walletAddress.slice(0, 8)}_1`,
            company: MOCK_COMPANIES[0],
            encryptedShares: mockEncrypt(15000), // 15,000 shares
            active: true,
        },
        {
            address: `Position_${walletAddress.slice(0, 8)}_2`,
            company: MOCK_COMPANIES[1],
            encryptedShares: mockEncrypt(42500), // 42,500 shares
            active: true,
        },
        {
            address: `Position_${walletAddress.slice(0, 8)}_3`,
            company: MOCK_COMPANIES[2],
            encryptedShares: mockEncrypt(8750), // 8,750 shares
            active: true,
        },
    ];
}

/**
 * Gets a single company by ID.
 */
export function getCompanyById(companyId: number): Company | undefined {
    return MOCK_COMPANIES.find(c => c.companyId === companyId);
}

/**
 * Gets a position for a specific company and wallet.
 * Returns undefined if no position exists.
 */
export function getMockPositionForCompany(
    walletAddress: string,
    companyId: number
): Position | undefined {
    const positions = getMockPositions(walletAddress);
    return positions.find(p => p.company.companyId === companyId);
}
