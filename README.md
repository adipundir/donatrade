# Donatrade

**Privacy-First Private Investment Platform on Solana**

Donatrade enables investors to hold shares in private companies on-chain without exposing their balances publicly. Share positions are encrypted and only visible to the investor and the company.

---

## 🔐 Why Donatrade?

Traditional token-based approaches expose all holdings publicly — anyone can query token accounts and see exactly how many shares each investor holds. This violates the confidentiality requirements of private company investments.

Donatrade solves this by:
- **No SPL Tokens** — Uses encrypted position accounts instead
- **Hidden Balances** — Share holdings stored as encrypted bytes
- **Client-Side Decryption** — Only your wallet can reveal your balance
- **On-Chain Security** — All positions verified by Solana

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                       On-Chain                           │
│                                                          │
│   CompanyAccount (Public)    PositionAccount (Private)   │
│   ├─ company_id              ├─ owner                    │
│   ├─ company_admin           ├─ company_id               │
│   ├─ total_shares_issued     ├─ encrypted_shares ← 🔐    │
│   └─ legal_agreement_hash    └─ active                   │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                      Frontend                            │
│                                                          │
│   Phantom Wallet → Anchor Client → Solana Devnet         │
│                          ↓                               │
│              Client-side decryption only                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔑 INCO Lightning Integration

**Current state:** Mock encryption for hackathon demo.

**Production vision:** INCO Lightning provides confidential computing via TEE (Trusted Execution Environment), enabling:
- True threshold encryption with MPC key management
- Homomorphic operations (compute on encrypted data)
- Verifiable decryption with attestation

Look for `// INCO:` comments throughout the codebase for integration points.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Phantom Wallet browser extension
- (Optional) Rust + Anchor CLI for program development

### Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect your Phantom wallet.

### Solana Program (optional)

```bash
# Build the Anchor program
anchor build

# Deploy to Devnet
anchor deploy --provider.cluster devnet
```

---

## 📁 Project Structure

```
donatrade/
├── programs/
│   └── donatrade_program/
│       └── src/lib.rs          # Anchor program with mock encryption
├── app/
│   ├── page.tsx                # Landing page
│   ├── companies/
│   │   ├── page.tsx            # Companies list
│   │   └── [id]/page.tsx       # Company detail + buy/transfer
│   └── portfolio/page.tsx      # User's private positions
├── components/
│   ├── Header.tsx              # Navigation + wallet button
│   ├── SharesDisplay.tsx       # Hidden balance with reveal toggle
│   └── PrivacyBadge.tsx        # "Private" indicator
├── lib/
│   ├── types.ts                # TypeScript types
│   ├── encryption.ts           # Client-side mock encryption
│   └── mockData.ts             # Demo data
├── Anchor.toml                 # Anchor configuration
└── README.md
```

---

## 🛡 Privacy Features

| Feature | Description |
|---------|-------------|
| **Encrypted Balances** | Share amounts stored as `encrypted_shares: Vec<u8>` |
| **Client-Only Decryption** | Balance revealed only in browser, never sent to servers |
| **No Public Tokens** | Position accounts instead of SPL token accounts |
| **Anonymous Positions** | No public list of who owns shares |

---

## 🎯 Hackathon Notes

This is an MVP for the Privacy Hackathon demonstrating:

1. **Privacy architecture** that's ready for INCO integration
2. **Clean UX** with privacy-first language
3. **Working demo** with mock data and encryption

**Not included in MVP:**
- Actual INCO Lightning integration
- Real on-chain deployment
- Payment processing

---

## 📜 License

MIT

---

Built for the Privacy Hackathon 🏆
