/**
 * Client-side encryption utilities for Donatrade.
 * 
 * These functions mirror the mock encryption in the on-chain program.
 * 
 * INCO INTEGRATION NOTES:
 * ----------------------
 * In production with INCO Lightning, these functions would be replaced with:
 * 
 * 1. `encrypt(value)` -> Would call INCO's client SDK to encrypt the value
 *    using a shared key derived from the investor and company public keys.
 *    The encryption happens client-side but uses INCO's key management.
 * 
 * 2. `decrypt(encrypted)` -> Would call INCO's client SDK to request decryption.
 *    This would require proving ownership (signing a message) and INCO would
 *    return the decrypted value only if the caller is authorized.
 * 
 * The current implementation uses simple XOR encryption for demo purposes.
 * This is NOT secure - it's purely to demonstrate the privacy architecture.
 */

// Mock encryption key (same as on-chain program)
const MOCK_KEY = [0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE];

/**
 * Encrypts a number into bytes using mock XOR encryption.
 * 
 * INCO: Replace with inco.encrypt(value) in production.
 */
export function mockEncrypt(value: number): number[] {
    // Convert to 8-byte little-endian representation
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(value), true); // little-endian

    const bytes = new Uint8Array(buffer);
    const encrypted: number[] = [];

    for (let i = 0; i < 8; i++) {
        encrypted.push(bytes[i] ^ MOCK_KEY[i % MOCK_KEY.length]);
    }

    return encrypted;
}

/**
 * Decrypts bytes back to a number using mock XOR decryption.
 * 
 * INCO: Replace with inco.decrypt(encrypted) in production.
 * The INCO version would require authorization/attestation.
 */
export function mockDecrypt(encrypted: number[]): number {
    if (encrypted.length < 8) return 0;

    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = encrypted[i] ^ MOCK_KEY[i % MOCK_KEY.length];
    }

    const view = new DataView(bytes.buffer);
    return Number(view.getBigUint64(0, true));
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
