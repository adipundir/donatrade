/**
 * Mock data for Donatrade demo.
 * 
 * This provides sample companies and positions for the frontend demo.
 * In production, this data would come from on-chain accounts.
 */

import { Company, Position, Vault } from './types';

/**
 * UTILITIES ONLY - NO MOCK DATA
 */

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
