import { decrypt } from '@inco/solana-sdk/attested-decrypt';

/**
 * Client-side encryption utilities for Donatrade using Inco Lightning FHE.
 */

/**
 * Converts a 16-byte EUINT128 handle (from the contract) to a decimal string.
 * The Inco SDK requires handles as decimal strings for decryption requests.
 */
export function bytesToHandle(input: any): string {
    if (!input) return "0";

    // Handle new Anchor 0.31 IDL format (BN or object with numeric key)
    if (typeof input === 'string') return input;
    if (typeof input === 'bigint') return input.toString();
    if (typeof input === 'object') {
        // Handle BN or tuple struct
        if (input.toString && typeof input.toString === 'function' && !Array.isArray(input)) {
            const str = input.toString();
            // If it's a numeric string, it's a handle
            if (!isNaN(Number(str)) || /^\d+$/.test(str)) return str;
        }
        // Handle the case where it's { 0: BN }
        if (input[0]) return input[0].toString();
        // Handle the case where it's { inner: number[] }
        if (input.inner) return bytesToHandle(input.inner);
    }

    if (Array.isArray(input) && input.length === 16) {
        // handles are u128 little-endian
        let handle = BigInt(0);
        for (let i = 15; i >= 0; i--) {
            handle = handle * BigInt(256) + BigInt(input[i]);
        }
        return handle.toString();
    }

    console.warn("[Encryption] Unexpected handle input format:", typeof input);
    return "0";
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
    } catch (error: any) {
        const errorMsg = error?.message || "";
        // If the error is about missing allowance, return null to trigger the two-step auth
        if (errorMsg.includes("Address is not allowed") || errorMsg.includes("403")) {
            console.log("[Encryption] Decryption permission missing, returning null for auto-authorize.");
            return null;
        }

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
