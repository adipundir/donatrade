'use client';

import { useState } from 'react';
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
import { getCompanyById, getMockPositionForCompany } from '@/lib/mockData';

/**
 * Company Detail Page - Comic-style view and manage position.
 */
export default function CompanyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { connected, publicKey } = useWallet();

    const [buyAmount, setBuyAmount] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferRecipient, setTransferRecipient] = useState('');
    const [activeTab, setActiveTab] = useState<'buy' | 'transfer'>('buy');
    const [copied, setCopied] = useState(false);
    const [txPending, setTxPending] = useState(false);
    const [txSuccess, setTxSuccess] = useState('');

    const companyId = Number(params.id);
    const company = getCompanyById(companyId);
    const position = publicKey
        ? getMockPositionForCompany(publicKey.toBase58(), companyId)
        : undefined;

    // Handle copying legal hash
    const copyHash = () => {
        if (company) {
            navigator.clipboard.writeText(company.legalAgreementHash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Mock buy shares
    const handleBuyShares = async () => {
        if (!buyAmount || !company) return;

        setTxPending(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setTxPending(false);
        setTxSuccess(`BOOM! You got ${buyAmount} shares!`);
        setBuyAmount('');
        setTimeout(() => setTxSuccess(''), 3000);
    };

    // Mock transfer shares
    const handleTransferShares = async () => {
        if (!transferAmount || !transferRecipient) return;

        setTxPending(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setTxPending(false);
        setTxSuccess(`WHOOSH! Transferred ${transferAmount} shares!`);
        setTransferAmount('');
        setTransferRecipient('');
        setTimeout(() => setTxSuccess(''), 3000);
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

                    <p className="text-secondary mb-6" style={{ fontFamily: "'Comic Neue', cursive" }}>{company.description}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 border-2 border-black">
                            <p className="text-xs text-muted uppercase tracking-wide mb-1" style={{ fontFamily: "'Bangers', cursive" }}>Total Shares Issued</p>
                            <p className="font-mono text-2xl font-bold">{company.totalSharesIssued.toLocaleString()}</p>
                        </div>
                        <div className="p-4 border-2 border-black">
                            <p className="text-xs text-muted uppercase tracking-wide mb-1" style={{ fontFamily: "'Bangers', cursive" }}>Company ID</p>
                            <p className="font-mono text-2xl font-bold">{company.companyId}</p>
                        </div>
                    </div>
                </div>

                {/* Legal Agreement Hash */}
                <div className="card mb-6 animate-pop stagger-1">
                    <div className="flex items-start gap-3 mb-3">
                        <FileCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-lg mb-1">Legal Agreement Hash</h3>
                            <p className="text-secondary text-sm mb-3" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                SHA-256 hash of the investment agreement. Verify your copy matches this hash!
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 p-3 bg-surface border-2 border-black font-mono text-xs break-all text-muted">
                                    {company.legalAgreementHash}
                                </code>
                                <button onClick={copyHash} className="btn btn-ghost p-2 shrink-0">
                                    {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Your Position */}
                <div className="card mb-6 animate-pop stagger-2">
                    <h3 className="text-lg mb-4">Your Secret Stash</h3>
                    {position ? (
                        <SharesDisplay
                            encryptedShares={position.encryptedShares}
                            label="Your Private Shares"
                        />
                    ) : (
                        <div className="p-4 border-2 border-dashed border-black text-center">
                            <Lock className="w-8 h-8 text-muted mx-auto mb-2" />
                            <p className="text-secondary text-sm" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                You don&apos;t have a position in this company yet. Time to invest!
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
                                Buy Shares
                            </button>
                            <button
                                onClick={() => setActiveTab('transfer')}
                                className={`btn flex-1 ${activeTab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                                disabled={!position}
                            >
                                <Send className="w-4 h-4" />
                                Transfer Shares
                            </button>
                        </div>

                        {/* Success Message */}
                        {txSuccess && (
                            <div className="p-4 border-3 border-accent bg-accent-light mb-4">
                                <p className="text-accent font-bold" style={{ fontFamily: "'Bangers', cursive" }}>{txSuccess}</p>
                            </div>
                        )}

                        {/* Buy Form */}
                        {activeTab === 'buy' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-2" style={{ fontFamily: "'Bangers', cursive" }}>Share Amount</label>
                                    <input
                                        type="number"
                                        value={buyAmount}
                                        onChange={(e) => setBuyAmount(e.target.value)}
                                        placeholder="Enter number of shares to buy"
                                        className="input"
                                        min="1"
                                    />
                                </div>
                                <div className="p-3 border-2 border-accent bg-accent-light">
                                    <p className="text-sm text-accent" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                        <Lock className="w-4 h-4 inline mr-1" />
                                        Your share amount will be encrypted before storing on-chain!
                                    </p>
                                </div>
                                <button
                                    onClick={handleBuyShares}
                                    disabled={!buyAmount || txPending}
                                    className="btn btn-primary w-full"
                                >
                                    {txPending ? 'Processing...' : 'Buy Shares!'}
                                </button>
                            </div>
                        )}

                        {/* Transfer Form */}
                        {activeTab === 'transfer' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-2" style={{ fontFamily: "'Bangers', cursive" }}>Recipient Wallet</label>
                                    <input
                                        type="text"
                                        value={transferRecipient}
                                        onChange={(e) => setTransferRecipient(e.target.value)}
                                        placeholder="Enter recipient wallet address"
                                        className="input font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-2" style={{ fontFamily: "'Bangers', cursive" }}>Share Amount</label>
                                    <input
                                        type="number"
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(e.target.value)}
                                        placeholder="Enter number of shares to transfer"
                                        className="input"
                                        min="1"
                                    />
                                </div>
                                <div className="p-3 border-2 border-accent bg-accent-light">
                                    <p className="text-sm text-accent" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                        <Lock className="w-4 h-4 inline mr-1" />
                                        Transfer amounts are encrypted. Only you and the recipient can see the value!
                                    </p>
                                </div>
                                <button
                                    onClick={handleTransferShares}
                                    disabled={!transferAmount || !transferRecipient || txPending}
                                    className="btn btn-primary w-full"
                                >
                                    {txPending ? 'Processing...' : 'Transfer Shares!'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Inactive Notice */}
                {!company.active && (
                    <div className="card border-warning" style={{ borderColor: 'var(--warning)' }}>
                        <p className="text-warning" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            ⚠️ This company is no longer accepting new investments.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
