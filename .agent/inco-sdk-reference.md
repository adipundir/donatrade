# Inco Lightning SDK Reference

## Core Concepts

- **Handle**: 128-bit reference to encrypted value stored off-chain by covalidator
- **Euint128**: Handle type for encrypted u128 values (16 bytes on-chain)
- **as_euint128**: Trivial encryption - convert plaintext to encrypted handle (OK for known values like deposit amounts)
- **new_euint128**: Real encryption - create handle from client-encrypted ciphertext

## Contract Operations

```rust
// Trivial encrypt (for deposit amounts, constants)
let encrypted = as_euint128(cpi_ctx, amount as u128)?;

// Add encrypted values
let new_balance = e_add(cpi_ctx, old_balance, encrypted, 0)?;

// Grant decryption access
allow(cpi_ctx, handle.0, true, user_pubkey)?;
```

## JS SDK - Encryption

```typescript
import { encryptValue } from '@inco/solana-sdk/encryption';

// Only needed for values that must be secret before reaching contract
const encrypted = await encryptValue(1000n);
```

## JS SDK - Decryption (Attested Reveal)

```typescript
import { decrypt } from '@inco/solana-sdk/attested-decrypt';

// Decrypt handle to display in UI
const result = await decrypt([handleString], {
  address: wallet.publicKey,
  signMessage: wallet.signMessage,
});

console.log(result.plaintexts[0]); // Decrypted value
```

## Allowance PDA Derivation

```typescript
const INCO_LIGHTNING_PROGRAM_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');

function getAllowancePDA(handle: bigint, allowedAddress: PublicKey): [PublicKey, number] {
  const handleBuffer = Buffer.alloc(16);
  handleBuffer.writeBigUInt64LE(handle & BigInt('0xFFFFFFFFFFFFFFFF'), 0);
  handleBuffer.writeBigUInt64LE(handle >> BigInt(64), 8);

  return PublicKey.findProgramAddressSync(
    [handleBuffer, allowedAddress.toBuffer()],
    INCO_LIGHTNING_PROGRAM_ID
  );
}
```

## Key Points

1. **Deposits**: Use `as_euint128` (trivial encryption) since amount is known
2. **Access Control**: Call `allow()` after any operation that creates a new handle
3. **Decryption**: Use `decrypt()` with wallet signMessage for attested reveal
4. **Handles are u128**: Store as 16 bytes, convert to decimal string for SDK calls
