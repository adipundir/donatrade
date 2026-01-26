'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Building2, ExternalLink, Shield, Wallet, Eye, EyeOff, TrendingUp, ArrowDownToLine, Loader2 } from 'lucide-react';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { SharesDisplay } from '@/components/SharesDisplay';
import { getProgram, fetchInvestorVault, fetchInvestorPositions } from '@/lib/solana';
import { getCompanyById, formatPricePerShare } from '@/lib/mockData';
import { formatUSDC } from '@/lib/inco';
import { useVaultModal } from '@/components/VaultProvider';
import { useConnection } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { bytesToHandle, decryptHandle } from '@/lib/encryption';

/**
 * Portfolio Page - Real on-chain view of encrypted holdings and vault balance.
 */
export default function PortfolioPage() {
    const { connection } = useConnection();
    const { connected, publicKey, signTransaction, signAllTransactions, signMessage } = useWallet();
    const { openVault } = useVaultModal();
    const router = useRouter();

    const [positions, setPositions] = useState<any[]>([]);
    const [rawVault, setRawVault] = useState<any>(null);
    const [vaultBalance, setVaultBalance] = useState<bigint | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRevealingVault, setIsRevealingVault] = useState(false);
    const [showVaultBalance, setShowVaultBalance] = useState(false);

    useEffect(() => {
        if (connected && publicKey) {
            loadPortfolio();
        }
    }, [connected, publicKey]);

    const loadPortfolio = async () => {
        if (!publicKey) return;
        setIsLoading(true);
        try {
            const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions });
            if (program) {
                const [v, p] = await Promise.all([
                    fetchInvestorVault(program, publicKey),
                    fetchInvestorPositions(program, publicKey)
                ]);
                setRawVault(v);

                // Map positions to include company details from mock data (names, sectors)
                const enrichedPositions = p.map(pos => {
                    const companyDetails = getCompanyById(pos.companyId);
                    return {
                        ...pos,
                        company: companyDetails || { name: `Company #${pos.companyId}`, sector: 'Unknown' }
                    };
                });
                setPositions(enrichedPositions);
            }
        } catch (error) {
            console.error("Failed to load portfolio:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevealVault = async () => {
        if (!rawVault || !publicKey || !signMessage) return;
        setIsRevealingVault(true);
        try {
            const handleStr = bytesToHandle(rawVault.cusd.inner as number[]);
            const value = await decryptHandle(handleStr, { publicKey, signMessage });
            if (value !== null) {
                setVaultBalance(value);
                setShowVaultBalance(true);
            }
        } catch (error) {
            console.error("Vault reveal failed:", error);
        } finally {
            setIsRevealingVault(false);
        }
    };

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
            <div className="container max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Link href="/" className="text-secondary hover:text-foreground transition-colors">
                            Home
                        </Link>
                        <span className="text-secondary">/</span>
                        <span>Portfolio</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl mb-2">Your Portfolio</h1>
                            <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                All your holdings are encrypted. Only you can see the values.
                            </p>
                        </div>
                        <PrivacyBadge />
                    </div>
                </div>

                {/* Value Cards */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {/* Vault Balance Card */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-accent" />
                                <h2 className="text-lg font-bold">Encrypted Vault</h2>
                            </div>
                            <button
                                onClick={handleRevealVault}
                                disabled={isRevealingVault || !rawVault}
                                className="p-2 hover:bg-surface rounded transition-colors disabled:opacity-50"
                                title={showVaultBalance ? 'Hide balance' : 'Reveal balance via Inco'}
                            >
                                {isRevealingVault ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : showVaultBalance ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl font-bold">
                                {isRevealingVault ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                                ) : showVaultBalance && vaultBalance !== null
                                    ? formatUSDC(vaultBalance).replace('$', '')
                                    : '🔒 ••••••'}
                            </span>
                            <span className="text-secondary font-bold">cUSD</span>
                        </div>
                        <button
                            onClick={openVault}
                            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                        >
                            <ArrowDownToLine className="w-3 h-3" />
                            Manage Vault
                        </button>
                    </div>

                    {/* Portfolio Value Card */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-accent" />
                                <h2 className="text-lg font-bold">Portfolio Value</h2>
                            </div>
                            <div className="p-2 opacity-50">
                                <Lock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl font-bold text-muted">
                                🔒 CONFIDENTIAL
                            </span>
                        </div>
                        <p className="text-xs text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            Across {positions.length} active position{positions.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Privacy Notice */}
                <div className="card bg-accent-light border-accent mb-8" style={{ borderColor: 'var(--accent)' }}>
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm mb-1 text-foreground font-bold">Privacy Protected!</h3>
                            <p className="text-foreground text-sm opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                All balances are encrypted on-chain using Inco Lightning. Decryption happens only in your browser
                                — your data never leaves your device!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Positions */}
                <h2 className="text-2xl mb-4">Your Holdings</h2>

                {positions.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="w-16 h-16 border-3 border-black flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl mb-2">No Holdings Yet!</h3>
                        <p className="text-secondary text-sm mb-6" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            You haven&apos;t invested in any companies yet. Start your private investment journey!
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
                                key={position.companyId}
                                className={`card animate-pop stagger-${index + 1}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 border-3 border-black flex items-center justify-center bg-accent-light">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl">{position.company.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-secondary uppercase" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                                    {position.company.sector}
                                                </span>
                                                <span className="text-xs text-secondary">•</span>
                                                <span className="text-xs text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                                    {formatPricePerShare(position.company.pricePerShare)}/share
                                                </span>
                                            </div>
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <SharesDisplay
                                            encryptedShares={position.shares.inner as number[]}
                                            label="Shares Owned"
                                        />
                                    </div>
                                    <div className="p-3 border-2 border-black bg-surface">
                                        <p className="text-xs text-muted uppercase tracking-wide mb-1">Position Value</p>
                                        <p className="text-xl font-bold text-muted">
                                            🔒 Encrypted
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t-2 border-black flex justify-between items-center">
                                    <span className="text-xs text-muted uppercase">
                                        Status: {position.active ? '✓ Active' : '✗ Closed'}
                                    </span>
                                    <div className="flex gap-2">
                                        <button className="btn btn-ghost text-sm py-1 px-3">
                                            Sell Shares
                                        </button>
                                        <Link
                                            href={`/companies/${position.company.companyId}`}
                                            className="btn btn-primary text-sm py-1 px-3"
                                        >
                                            Buy More
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
