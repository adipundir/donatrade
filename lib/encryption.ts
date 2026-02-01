import { decrypt } from '@inco/solana-sdk/attested-decrypt';

/**
 * Client-side encryption utilities for Donatrade using Inco Lightning TEE / Confidential Computing.
 */

/**
 * Converts a 16-byte EUINT128 handle (from the contract) to a decimal string.
 * The Inco SDK requires handles as decimal strings for decryption requests.
 */
export function bytesToHandle(input: any): string {
    if (input === undefined || input === null) return "0";
    if (typeof input === 'string') return input.trim() || "0";
    if (typeof input === 'bigint') return input.toString();

    // Handle Anchor BN or other numeric objects
    if (typeof input.toString === 'function' && !Array.isArray(input)) {
        const str = input.toString();
        if (/^\d+$/.test(str)) return str;
    }

    // Handle Tuple Structs or Object Wrappers { 0: ..., ... } or { inner: ... } or { handle: ... }
    if (typeof input === 'object') {
        if (input[0] !== undefined) return bytesToHandle(input[0]);
        if (input.inner !== undefined) return bytesToHandle(input.inner);
        if (input.handle !== undefined) return bytesToHandle(input.handle);
    }

    // Handle raw byte arrays (u128 is Little Endian on-chain)
    if ((Array.isArray(input) || input instanceof Uint8Array) && input.length === 16) {
        let result = BigInt(0);
        for (let i = 15; i >= 0; i--) {
            result = (result << BigInt(8)) | BigInt(input[i]);
        }
        return result.toString();
    }

    console.warn("[Encryption] Unexpected handle input format:", typeof input, input);
    return "0";
}

/**
 * Decrypts a confidential handle via Inco's Attested Reveal.
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
 * Simple symmetric encryption for metadata strings.
 * The 'key' used here should be derived from the TEE handle on-chain.
 */
export function encryptMetadata(text: string, keySeed: string): string {
    if (!text) return "";
    // Basic XOR encryption for the demo to ensure privacy without complex dependencies
    // In a real app, this would be AES-GCM
    const key = keySeed.repeat(Math.ceil(text.length / keySeed.length));
    let result = "";
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i));
    }
    return Buffer.from(result).toString('base64');
}

export function decryptMetadata(ciphertext: string, keySeed: string): string {
    if (!ciphertext) return "";
    try {
        const text = Buffer.from(ciphertext, 'base64').toString();
        const key = keySeed.repeat(Math.ceil(text.length / keySeed.length));
        let result = "";
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i));
        }
        return result;
    } catch (e) {
        console.error("[Encryption] Decryption failed:", e);
        return "Decryption error";
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
