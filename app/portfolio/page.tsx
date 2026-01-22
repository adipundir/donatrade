'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Building2, ExternalLink, Shield } from 'lucide-react';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { SharesDisplay } from '@/components/SharesDisplay';
import { getMockPositions } from '@/lib/mockData';

/**
 * Portfolio Page - Comic-style view of private positions.
 */
export default function PortfolioPage() {
    const { connected, publicKey } = useWallet();
    const router = useRouter();

    const positions = publicKey
        ? getMockPositions(publicKey.toBase58())
        : [];

    // Require wallet connection
    if (!connected) {
        return (
            <div className="min-h-screen pt-24 hero-comic">
                <div className="container">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <div className="w-16 h-16 border-3 border-black flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl mb-2">Secret Identity Required!</h1>
                        <p className="text-secondary mb-6" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            Connect your Phantom wallet to view your secret portfolio.
                        </p>
                        <button onClick={() => router.push('/')} className="btn btn-primary">
                            Go to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 hero-comic">
            <div className="container max-w-3xl">
                {/* Header */}
                <div className="mb-8 text-center">
                    <span className="exclaim text-xl">SHAZAM!</span>
                    <h1 className="text-4xl mt-4 mb-2">Your Secret Portfolio</h1>
                    <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                        Your private investment positions. Balances are hidden by default!
                    </p>
                </div>

                {/* Privacy Notice */}
                <div className="card bg-accent-light border-accent mb-8 animate-pop" style={{ borderColor: 'var(--accent)' }}>
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm mb-1" style={{ fontFamily: "'Bangers', cursive" }}>Privacy Protected!</h3>
                            <p className="text-secondary text-sm" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                All your positions are encrypted on-chain. Decryption happens only in your browser
                                — your balance never leaves your device!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Positions */}
                {positions.length === 0 ? (
                    <div className="card text-center py-12 animate-pop">
                        <div className="w-16 h-16 border-3 border-black flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl mb-2">No Positions Yet!</h3>
                        <p className="text-secondary text-sm mb-6" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            You haven&apos;t invested in any companies yet. Time to start your adventure!
                        </p>
                        <button
                            onClick={() => router.push('/companies')}
                            className="btn btn-primary"
                        >
                            Browse Companies
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {positions.map((position, index) => (
                            <div
                                key={position.address}
                                className={`card animate-pop stagger-${index + 1}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 border-3 border-black flex items-center justify-center bg-accent-light">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl">{position.company.name}</h3>
                                            <PrivacyBadge />
                                        </div>
                                    </div>
                                    <Link
                                        href={`/companies/${position.company.companyId}`}
                                        className="btn btn-ghost p-2"
                                        title="View company"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                </div>

                                <SharesDisplay
                                    encryptedShares={position.encryptedShares}
                                    label="Your Private Shares"
                                />

                                <div className="mt-4 pt-4 border-t-2 border-black flex justify-between items-center">
                                    <span className="text-xs text-muted uppercase" style={{ fontFamily: "'Bangers', cursive" }}>
                                        Position: {position.active ? '✓ Active' : '✗ Closed'}
                                    </span>
                                    <Link
                                        href={`/companies/${position.company.companyId}`}
                                        className="text-sm text-accent hover:underline font-bold"
                                    >
                                        Manage Position →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Summary Card */}
                {positions.length > 0 && (
                    <div className="mt-8 card bg-surface animate-pop stagger-4">
                        <h3 className="text-lg mb-3">Portfolio Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 border-2 border-black">
                                <p className="text-xs text-muted uppercase tracking-wide mb-1" style={{ fontFamily: "'Bangers', cursive" }}>Total Positions</p>
                                <p className="text-3xl font-bold">{positions.length}</p>
                            </div>
                            <div className="p-3 border-2 border-black">
                                <p className="text-xs text-muted uppercase tracking-wide mb-1" style={{ fontFamily: "'Bangers', cursive" }}>Total Value</p>
                                <p className="text-3xl font-bold text-muted flex items-center gap-2">
                                    <Lock className="w-6 h-6" />
                                    ???
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted mt-4" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            Total value is hidden for privacy. Reveal individual positions above to see balances!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
