/**
 * Inco Lightning SDK integration for Donatrade.
 * 
 * Uses real @inco/solana-sdk for encryption and decryption.
 */

import { PublicKey } from "@solana/web3.js";
import { INCO_LIGHTNING_ID } from "./solana";

// Re-export from real SDK
export { encryptValue } from '@inco/solana-sdk/encryption';
export { decrypt } from '@inco/solana-sdk/attested-decrypt';

/**
 * Derives the allowance PDA for a given handle and address.
 * This PDA must exist for the address to decrypt the handle.
 */
export function findAllowancePDA(handle: bigint, allowedAddress: PublicKey): [PublicKey, number] {
    const handleBuffer = Buffer.alloc(16);
    handleBuffer.writeBigUInt64LE(handle & BigInt('0xFFFFFFFFFFFFFFFF'), 0);
    handleBuffer.writeBigUInt64LE(handle >> BigInt(64), 8);

    return PublicKey.findProgramAddressSync(
        [handleBuffer, allowedAddress.toBuffer()],
        INCO_LIGHTNING_ID
    );
}

/**
 * Converts handle bytes (from on-chain account) to decimal string for SDK.
 */
export function handleToDecimalString(handleBytes: number[] | Uint8Array): string {
    let handle = BigInt(0);
    for (let i = 15; i >= 0; i--) {
        handle = handle * BigInt(256) + BigInt(handleBytes[i]);
    }
    return handle.toString();
}

/**
 * Formats USDC amount (6 decimals) for display.
 */
export function formatUSDC(amount: number | bigint | string): string {
    const value = typeof amount === 'string' ? BigInt(amount) :
        typeof amount === 'bigint' ? amount : BigInt(amount);
    const divisor = BigInt(1_000_000);
    const whole = value / divisor;
    const fraction = value % divisor;

    return `$${whole.toString()}.${fraction.toString().padStart(6, '0').slice(0, 2)}`;
}

/**
 * Parses a USDC string to raw amount (6 decimals).
 */
export function parseUSDC(usdcString: string): bigint {
    const cleaned = usdcString.replace(/[$,]/g, '');
    const parts = cleaned.split('.');
    const whole = BigInt(parts[0] || '0');
    const fraction = parts[1] ? parts[1].padEnd(6, '0').slice(0, 6) : '000000';

    return whole * BigInt(1_000_000) + BigInt(fraction);
}
