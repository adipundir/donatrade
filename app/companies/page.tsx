'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Building2, ArrowRight, Lock, Users } from 'lucide-react';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { MOCK_COMPANIES } from '@/lib/mockData';

/**
 * Companies Page - Comic-style list of companies.
 */
export default function CompaniesPage() {
    const { connected } = useWallet();
    const router = useRouter();

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
                            Connect your Phantom wallet to access the companies.
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
            <div className="container">
                {/* Header */}
                <div className="mb-10 text-center">
                    <span className="exclaim text-xl">KAPOW!</span>
                    <h1 className="text-4xl mt-4 mb-2">Private Companies</h1>
                    <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                        Browse companies accepting confidential investments. Your holdings remain private!
                    </p>
                </div>

                {/* Company Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {MOCK_COMPANIES.map((company, index) => (
                        <Link
                            key={company.companyId}
                            href={`/companies/${company.companyId}`}
                            className="group"
                        >
                            <div className={`card h-full animate-pop stagger-${index + 1}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 border-3 border-black flex items-center justify-center bg-accent-light">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl group-hover:text-accent transition-colors">
                                                {company.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <PrivacyBadge />
                                                {company.active ? (
                                                    <span className="badge badge-active">Active</span>
                                                ) : (
                                                    <span className="badge badge-inactive">Closed</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                </div>

                                <p className="text-secondary text-sm mb-4 line-clamp-2" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                    {company.description}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t-2 border-black">
                                    <div>
                                        <p className="text-xs text-muted uppercase tracking-wide" style={{ fontFamily: "'Bangers', cursive" }}>Shares Issued</p>
                                        <p className="font-mono font-bold text-lg">{company.totalSharesIssued.toLocaleString()}</p>
                                    </div>
                                    <span className="btn btn-ghost text-sm uppercase">
                                        View Details →
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Info Card */}
                <div className="mt-12 card border-accent" style={{ borderColor: 'var(--accent)' }}>
                    <div className="flex items-start gap-4">
                        <Shield className="w-6 h-6 text-accent shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg mb-1">Privacy Notice</h3>
                            <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                While company information is publicly visible, all investor positions are encrypted.
                                When you invest in a company, no one can see your share balance except you and the company!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
