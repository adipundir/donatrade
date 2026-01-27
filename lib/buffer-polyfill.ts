// Comprehensive Buffer and global polyfill for Solana/Anchor in Next.js
const { Buffer } = require('buffer');

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    if (!(window as any).global) {
        (window as any).global = window;
    }
    if (!(window as any).process) {
        (window as any).process = { env: {} };
    }
}

if (typeof global !== 'undefined') {
    (global as any).Buffer = (global as any).Buffer || Buffer;
}

if (typeof globalThis !== 'undefined') {
    (globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;
}

// Side effect to ensure this isn't tree-shaken
if (typeof Buffer !== 'undefined') {
    console.log("[DonaTrade] Buffer polyfill active");
}

// Export for use in TS files if needed
export { Buffer };
