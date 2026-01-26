import { decrypt } from '@inco/solana-sdk/attested-decrypt';

/**
 * Client-side encryption utilities for Donatrade using Inco Lightning FHE.
 */

/**
 * Converts a 16-byte EUINT128 handle (from the contract) to a decimal string.
 * The Inco SDK requires handles as decimal strings for decryption requests.
 */
export function bytesToHandle(bytes: number[]): string {
    if (!bytes || bytes.length !== 16) {
        console.warn("[Encryption] Invalid handle bytes length:", bytes?.length);
        return "0";
    }

    // handles are u128 little-endian
    let handle = BigInt(0);
    for (let i = 15; i >= 0; i--) {
        handle = handle * BigInt(256) + BigInt(bytes[i]);
    }
    return handle.toString();
}

/**
 * Decrypts an FHE handle via Inco's Attested Reveal.
 * Requires the user to sign a message via their wallet.
 */
export async function decryptHandle(handleStr: string, wallet: any): Promise<bigint | null> {
    if (!wallet || !wallet.publicKey || !wallet.signMessage) {
        throw new Error("Wallet does not support message signing for decryption.");
    }

    try {
        const result = await decrypt([handleStr], {
            address: wallet.publicKey,
            signMessage: wallet.signMessage,
        });

        if (result && result.plaintexts && result.plaintexts.length > 0) {
            return BigInt(result.plaintexts[0]);
        }
        return null;
    } catch (error) {
        console.error("[Encryption] Decryption failed:", error);
        throw error;
    }
}

/**
 * Converts a 32-byte hash array to a hex string for display.
 */
export function hashToHex(hash: number[]): string {
    return hash.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts a hex string to a 32-byte array.
 */
export function hexToHash(hex: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}
