'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    ArrowLeft,
    Lock,
    FileCheck,
    Send,
    ShoppingCart,
    Copy,
    Check
} from 'lucide-react';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { SharesDisplay } from '@/components/SharesDisplay';
import {
    getProgram,
    getCompanyPDA,
    getInvestorVaultPDA,
    getPositionPDA,
    getAllowancePDA,
    buildBuySharesTx,
    buildSellSharesTx,
    BN
} from '@/lib/solana';
import { useConnection } from '@solana/wallet-adapter-react';
import { getCompanyById, getMockPositionForCompany, formatPricePerShare } from '@/lib/mockData';

/**
 * Company Detail Page - Comic-style view and manage position.
 */
export default function CompanyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { connection } = useConnection();
    const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();

    const [buyAmount, setBuyAmount] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferRecipient, setTransferRecipient] = useState('');
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [copied, setCopied] = useState(false);
    const [txPending, setTxPending] = useState(false);
    const [txSuccess, setTxSuccess] = useState('');

    const companyId = Number(params.id);
    const company = getCompanyById(companyId);

    const [position, setPosition] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (connected && publicKey && companyId) {
            loadPosition();
        }
    }, [connected, publicKey, companyId]);

    const loadPosition = async () => {
        if (!publicKey) return;
        setIsLoading(true);
        try {
            const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions });
            if (program) {
                const [positionPDA] = getPositionPDA(companyId, publicKey);
                try {
                    const data = await (program.account as any).position.fetch(positionPDA);
                    if (data) setPosition(data);
                } catch (e) {
                    // Position doesn't exist yet, which is fine
                    setPosition(null);
                }
            }
        } catch (error) {
            console.error("Failed to load position:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle copying legal hash
    const copyHash = () => {
        if (company) {
            navigator.clipboard.writeText(company.legalAgreementHash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Real participate in Confidential Share Offering
    const handleBuyShares = async () => {
        if (!buyAmount || !company || !publicKey || !signTransaction || !signAllTransactions) return;

        setTxPending(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, {
                publicKey,
                signTransaction,
                signAllTransactions,
            });
            if (!program) throw new Error("Program not initialized");

            const shareAmount = BigInt(buyAmount);
            const companyPDA = getCompanyPDA(companyId)[0];
            const [vaultPDA] = getInvestorVaultPDA(publicKey);
            const [positionPDA] = getPositionPDA(companyId, publicKey);

            // Fetch allowance handle if needed (simplified for hackathon demo)
            const [allowancePDA] = getAllowancePDA(BigInt(Date.now()), publicKey);

            const tx = await buildBuySharesTx(
                program,
                publicKey,
                companyId,
                companyPDA,
                shareAmount,
                [
                    { pubkey: allowancePDA, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: false, isWritable: false },
                ]
            );

            const signature = await tx.rpc();
            setTxSuccess(`BOOM! Your Confidential Share Allocation (CSA) of ${buyAmount} shares is confirmed! Sig: ${signature.slice(0, 8)}...`);
            setBuyAmount('');
        } catch (error: any) {
            console.error("Buy shares failed:", error);
            setTxSuccess(`ERROR: ${error.message || 'Transaction failed.'}`);
        } finally {
            setTxPending(false);
            setTimeout(() => setTxSuccess(''), 5000);
        }
    };

    // Real sell shares
    const handleSellShares = async () => {
        if (!transferAmount || !company || !publicKey || !signTransaction || !signAllTransactions) return;

        setTxPending(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, {
                publicKey,
                signTransaction,
                signAllTransactions,
            });
            if (!program) throw new Error("Program not initialized");

            const shareAmount = BigInt(transferAmount);
            const companyPDA = getCompanyPDA(companyId)[0];
            const [positionPDA] = getPositionPDA(companyId, publicKey);

            const tx = await buildSellSharesTx(
                program,
                publicKey,
                companyId,
                companyPDA,
                shareAmount,
                []
            );

            const signature = await tx.rpc();
            setTxSuccess(`WHOOSH! Successfully sold back ${transferAmount} shares! Sig: ${signature.slice(0, 8)}...`);
            setTransferAmount('');
        } catch (error: any) {
            console.error("Sell shares failed:", error);
            setTxSuccess(`ERROR: ${error.message || 'Transaction failed.'}`);
        } finally {
            setTxPending(false);
            setTimeout(() => setTxSuccess(''), 5000);
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
                            Connect your Phantom wallet to view company details.
                        </p>
                        <button onClick={() => router.push('/')} className="btn btn-primary">
                            Go to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Company not found
    if (!company) {
        return (
            <div className="min-h-screen pt-24 hero-comic">
                <div className="container">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <span className="exclaim text-2xl mb-4">OOPS!</span>
                        <h1 className="text-3xl mb-2">Company Not Found</h1>
                        <p className="text-secondary mb-6" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            The company you&apos;re looking for doesn&apos;t exist.
                        </p>
                        <button onClick={() => router.push('/companies')} className="btn btn-primary">
                            View All Companies
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 hero-comic">
            <div className="container max-w-4xl">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/companies')}
                    className="btn btn-ghost mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Companies
                </button>

                {/* Company Header */}
                <div className="card mb-6 animate-pop">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl">{company.name}</h1>
                                {company.active ? (
                                    <span className="badge badge-active">Active</span>
                                ) : (
                                    <span className="badge badge-inactive">Closed</span>
                                )}
                            </div>
                            <PrivacyBadge variant="large" />
                        </div>
                    </div>

                    <p className="text-foreground mb-6 opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>{company.description}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 border-2 border-black">
                            <p className="text-xs text-foreground uppercase tracking-wide mb-1 opacity-70" style={{ fontFamily: "'Bangers', cursive" }}>Total Shares Issued</p>
                            <p className="font-mono text-2xl font-bold text-foreground">{company.totalSharesIssued.toLocaleString()}</p>
                        </div>
                        <div className="p-4 border-2 border-black">
                            <p className="text-xs text-foreground uppercase tracking-wide mb-1 opacity-70" style={{ fontFamily: "'Bangers', cursive" }}>Company ID</p>
                            <p className="font-mono text-2xl font-bold text-foreground">{company.companyId}</p>
                        </div>
                    </div>
                </div>

                {/* Legal Agreement Hash */}
                <div className="card mb-6 animate-pop stagger-1">
                    <div className="flex items-start gap-3 mb-3">
                        <FileCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-lg mb-1 text-foreground">Legal Agreement Hash</h3>
                            <p className="text-foreground text-sm mb-3 opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                SHA-256 hash of the investment agreement. Verify your copy matches this hash!
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 p-3 bg-surface border-2 border-black font-mono text-xs break-all text-foreground opacity-80">
                                    {company.legalAgreementHash}
                                </code>
                                <button onClick={copyHash} className="btn btn-ghost p-2 shrink-0">
                                    {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Your Confidential Share Allocation */}
                <div className="card mb-6 animate-pop stagger-2">
                    <h3 className="text-lg mb-4 text-foreground">Your Confidential Share Allocation (CSA)</h3>
                    {position ? (
                        <SharesDisplay
                            encryptedShares={position.shares.inner as number[]}
                            label="Your Private Allocation"
                        />
                    ) : (
                        <div className="p-4 border-2 border-dashed border-black text-center">
                            <Lock className="w-8 h-8 text-foreground opacity-60 mx-auto mb-2" />
                            <p className="text-foreground text-sm opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                You don&apos;t have a Confidential Share Allocation (CSA) in this company yet. Participate in the offering below!
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {company.active && (
                    <div className="card animate-pop stagger-3">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setActiveTab('buy')}
                                className={`btn flex-1 ${activeTab === 'buy' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Participate in Offering
                            </button>
                            <button
                                onClick={() => setActiveTab('sell')}
                                className={`btn flex-1 ${activeTab === 'sell' ? 'btn-primary' : 'btn-secondary'}`}
                                disabled={!position}
                            >
                                <Send className="w-4 h-4" />
                                Sell back to Company
                            </button>
                        </div>

                        {/* Success Message */}
                        {txSuccess && (
                            <div className="p-4 border-3 border-accent bg-accent-light mb-4">
                                <p className="text-accent font-bold" style={{ fontFamily: "'Bangers', cursive" }}>{txSuccess}</p>
                            </div>
                        )}

                        {/* Participate in Confidential Share Offering Form */}
                        {activeTab === 'buy' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-2" style={{ fontFamily: "'Bangers', cursive" }}>Allocation Amount</label>
                                    <input
                                        type="number"
                                        value={buyAmount}
                                        onChange={(e) => setBuyAmount(e.target.value)}
                                        placeholder="Enter number of shares for your CSA"
                                        className="input"
                                        min="1"
                                    />
                                </div>
                                <div className="p-3 border-2 border-accent bg-accent-light">
                                    <p className="text-sm text-accent" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                        <Lock className="w-4 h-4 inline mr-1" />
                                        Your Confidential Share Allocation (CSA) will be encrypted before storing on-chain!
                                    </p>
                                </div>
                                <button
                                    onClick={handleBuyShares}
                                    disabled={!buyAmount || txPending}
                                    className="btn btn-primary w-full"
                                >
                                    {txPending ? 'Processing...' : 'Participate in Offering!'}
                                </button>
                            </div>
                        )}

                        {/* Sell Form */}
                        {activeTab === 'sell' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-2" style={{ fontFamily: "'Bangers', cursive" }}>Share Amount</label>
                                    <input
                                        type="number"
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(e.target.value)}
                                        placeholder="Enter number of shares to sell"
                                        className="input"
                                        min="1"
                                    />
                                </div>
                                <div className="p-3 border-2 border-accent bg-accent-light">
                                    <p className="text-sm text-accent" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                        <Lock className="w-4 h-4 inline mr-1" />
                                        Selling back to company is private. No one can see your exit amount!
                                    </p>
                                </div>
                                <button
                                    onClick={handleSellShares}
                                    disabled={!transferAmount || txPending}
                                    className="btn btn-primary w-full"
                                >
                                    {txPending ? 'Processing...' : 'Sell Shares!'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Inactive Notice */}
                {!company.active && (
                    <div className="card border-warning" style={{ borderColor: 'var(--warning)' }}>
                        <p className="text-warning" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            ⚠️ This Confidential Share Offering is no longer accepting new participants.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
