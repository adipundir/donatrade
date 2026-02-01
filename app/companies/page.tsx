'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Building2, ArrowRight, Lock, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { formatPricePerShare } from '@/lib/mockData';
import { ApplicationReviewModal } from '@/components/ApplicationReviewModal';
import { RegisterCompanyModal } from '@/components/RegisterCompanyModal';
import { getCompanies, getCompanyByWallet } from '@/lib/actions/companies';
import { getProgram } from '@/lib/solana';

/**
 * Companies Page - Browse private companies with active share offerings.
 */
export default function CompaniesPage() {
    const wallet = useWallet();
    const { connected, publicKey } = wallet;
    const { connection } = useConnection();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'ongoing' | 'closed'>('ongoing');
    const [companies, setCompanies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userApplication, setUserApplication] = useState<any | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    useEffect(() => {
        if (connected && publicKey) {
            fetchCompanies();
            checkUserApplication();
        }
    }, [connected, publicKey]);

    const checkUserApplication = async () => {
        if (!publicKey || !connected) return;
        try {
            const result = await getCompanyByWallet(publicKey.toBase58());
            if (result.success && result.company) {
                setUserApplication(result.company);
                console.log("[DonaTrade] User has pending application:", result.company.name);
            } else {
                setUserApplication(null);
            }
        } catch (e) {
            console.error("[DonaTrade] Error checking user application:", e);
        }
    };

    const fetchCompanies = async () => {
        setIsLoading(true);
        try {
            const result = await getCompanies('active');
            if (!result.success) {
                throw new Error('Failed to fetch companies');
            }
            const activeCompanies = result.companies || [];

            // Fetch on-chain data for real available shares
            let onChainData: any[] = [];
            try {
                const program = getProgram(connection, wallet);
                if (program) {
                    onChainData = await (program.account as any).companyAccount.all();
                }
            } catch (err) {
                console.error("[DonaTrade] Error fetching on-chain accounts:", err);
            }

            // Transform to match display format, merging on-chain data
            const fetched = activeCompanies.map((company: any) => {
                // Find matching on-chain account by company_id (which is company.chainId)
                const onChain = onChainData.find(pd =>
                    pd.account.companyId.toString() === (company.chainId?.toString() || "")
                );

                return {
                    companyId: company.chainId,
                    name: company.name,
                    description: company.description,
                    sector: company.sector,
                    offeringUrl: company.offeringUrl,
                    logoUrl: company.logoUrl,
                    pricePerShare: onChain ? Number(onChain.account.pricePerShare) : company.pricePerShare,
                    sharesAvailable: onChain ? Number(onChain.account.sharesAvailable) : company.initialShares,
                    totalSharesIssued: company.initialShares,
                    active: onChain ? onChain.account.active : true,
                    isApproved: true,
                };
            });

            setCompanies(fetched);
        } catch (e) {
            console.error("[DonaTrade] Error fetching companies:", e);
            setCompanies([]);
        } finally {
            setIsLoading(false);
        }
    };

    const ongoingCompanies = companies.filter(c => c.active);
    const closedCompanies = companies.filter(c => !c.active);

    if (!connected) {
        return (
            <div className="min-h-screen pt-24 hero-comic">
                <div className="container">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <div className="w-16 h-16 border-3 border-black flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl mb-2">Connect to Invest</h1>
                        <p className="text-secondary mb-6" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            Connect your wallet to browse and invest in private companies.
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
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Link href="/" className="text-secondary hover:text-foreground transition-colors">
                            Home
                        </Link>
                        <span className="text-secondary">/</span>
                        <span>Companies</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl mb-2">Private Companies</h1>
                            <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                Invest in top private companies. Your holdings stay encrypted.
                            </p>
                        </div>
                        {userApplication ? (
                            <button
                                onClick={() => setIsReviewModalOpen(true)}
                                className="btn btn-secondary border-accent text-accent"
                            >
                                <Building2 className="w-4 h-4 mr-1" />
                                Review Application
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsRegisterModalOpen(true)}
                                className="btn btn-primary"
                            >
                                <Building2 className="w-4 h-4 mr-1" />
                                Register Company
                            </button>
                        )}
                    </div>
                </div>

                <RegisterCompanyModal
                    isOpen={isRegisterModalOpen}
                    onClose={() => setIsRegisterModalOpen(false)}
                    onSuccess={() => {
                        // Don't close modal - just refresh application state
                        checkUserApplication();
                    }}
                />

                <ApplicationReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    application={userApplication}
                />

                {/* Tabs */}
                <div className="flex border-b-3 border-foreground mb-8">
                    <button
                        onClick={() => setActiveTab('ongoing')}
                        className={`py-3 px-6 font-bold uppercase tracking-wide transition-colors ${activeTab === 'ongoing'
                            ? 'bg-accent text-white'
                            : 'hover:bg-surface'
                            }`}
                    >
                        Active Offerings ({ongoingCompanies.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('closed')}
                        className={`py-3 px-6 font-bold uppercase tracking-wide transition-colors ${activeTab === 'closed'
                            ? 'bg-accent text-white'
                            : 'hover:bg-surface'
                            }`}
                    >
                        Closed ({closedCompanies.length})
                    </button>
                </div>

                {/* Company Grid */}
                {(activeTab === 'ongoing' ? ongoingCompanies : closedCompanies).length === 0 ? (
                    <div className="card text-center py-12">
                        <Building2 className="w-16 h-16 text-foreground opacity-50 mx-auto mb-4" />
                        <h3 className="text-xl mb-2 text-foreground">No {activeTab === 'ongoing' ? 'Active' : 'Closed'} Offerings</h3>
                        <p className="text-foreground opacity-70" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            {activeTab === 'ongoing'
                                ? 'Check back soon for new investment opportunities.'
                                : 'No offerings have closed yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {(activeTab === 'ongoing' ? ongoingCompanies : closedCompanies).map((company, index) => (
                            <Link
                                key={company.companyId}
                                href={`/companies/${company.companyId}`}
                                className="group"
                            >
                                <div className={`card h-full animate-pop stagger-${index + 1} hover:border-accent transition-colors`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <h3 className="text-xl text-foreground group-hover:text-accent transition-colors">
                                                    {company.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {company.sector && (
                                                        <span className="text-xs text-secondary uppercase">
                                                            {company.sector}
                                                        </span>
                                                    )}
                                                    {company.active ? (
                                                        <span className="badge badge-active">CSA ACTIVE</span>
                                                    ) : (
                                                        <span className="badge badge-inactive">CLOSED</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-foreground opacity-70 group-hover:text-accent group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </div>

                                    <p className="text-foreground text-sm mb-4 line-clamp-2 opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                        {company.description}
                                    </p>

                                    {/* isApproved debug (optional, not needed for production if filtered) */}

                                    {/* Price and Availability */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="p-3 bg-surface border-2 border-foreground">
                                            <p className="text-xs text-muted uppercase">Price/Share</p>
                                            <p className="text-lg font-bold">{formatPricePerShare(company.pricePerShare)}</p>
                                        </div>
                                        <div className="p-3 bg-surface border-2 border-foreground">
                                            <p className="text-xs text-muted uppercase">Available</p>
                                            <p className="text-lg font-bold">
                                                {company.sharesAvailable.toLocaleString()} / {company.totalSharesIssued.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {activeTab === 'ongoing' && company.lastDateToApply && (
                                        <div className="mb-4 p-3 border-2 border-accent bg-accent-light">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-accent" />
                                                <p className="text-sm text-foreground font-bold">
                                                    Deadline: {new Date(company.lastDateToApply).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t-2 border-black">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-muted" />
                                            <span className="text-sm text-muted">
                                                {company.totalSharesIssued.toLocaleString()} shares issued
                                            </span>
                                        </div>
                                        <span className="btn btn-ghost text-sm uppercase text-accent">
                                            Invest →
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Privacy Info Card */}
                <div className="mt-12 card border-accent" style={{ borderColor: 'var(--accent)' }}>
                    <div className="flex items-start gap-4">
                        <Shield className="w-6 h-6 text-accent shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg mb-1 text-foreground font-bold">Your Investments Stay Private</h3>
                            <p className="text-foreground opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                When you invest in a company, your share holdings are encrypted using Inco Lightning.
                                Only you and the company can see how many shares you own. Other investors, blockchain explorers,
                                and even Donatrade cannot see your position size.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
