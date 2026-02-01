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
    Check,
    DollarSign,
    ExternalLink
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
    buildTransferSharesTx,
    BN
} from '@/lib/solana';
import { PublicKey } from "@solana/web3.js";
import { useConnection } from '@solana/wallet-adapter-react';
import { formatPricePerShare } from '@/lib/mockData';

/**
 * Company Detail Page - Comic-style view and manage position.
 */
export default function CompanyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { connection } = useConnection();
    const wallet = useWallet();
    const { connected, publicKey } = wallet;

    const [buyAmount, setBuyAmount] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferRecipient, setTransferRecipient] = useState('');
    const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'transfer'>('buy');
    const [copied, setCopied] = useState(false);
    const [txPending, setTxPending] = useState(false);
    const [txSuccess, setTxSuccess] = useState('');

    const [position, setPosition] = useState<any>(null);
    const [onChainCompany, setOnChainCompany] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const companyId = Number(params.id);

    // Derived "company" object from on-chain data or loading state
    const company = onChainCompany ? {
        companyId: Number(onChainCompany.companyId),
        name: `Private Company #${onChainCompany.companyId}`,
        description: "This company's details are confidential.",
        sector: "Private Sector",
        pricePerShare: Number(onChainCompany.pricePerShare),
        sharesAvailable: Number(onChainCompany.sharesAvailable),
        valuation: Number(onChainCompany.pricePerShare) * 1000000, // Roughly
        totalSharesIssued: 1000000,
        active: onChainCompany.active,
        image: "/placeholder-company.png", // or generic
        legalAgreementLink: onChainCompany.offeringUrl || "#",
        offeringUrl: onChainCompany.offeringUrl,
        metadataKey: onChainCompany.metadataKey
    } : null;

    useEffect(() => {
        if (connected && publicKey && companyId) {
            loadOnChainData();
            loadPosition();
        }
    }, [connected, publicKey, companyId]);

    const loadOnChainData = async () => {
        try {
            const program = getProgram(connection, wallet);
            if (!program) return;
            const [companyPDA] = getCompanyPDA(companyId);
            const data = await (program.account as any).companyAccount.fetch(companyPDA);
            if (data) {
                setOnChainCompany(data);
            }
        } catch (e) {
            console.error("Failed to load on-chain company data:", e);
        }
    };

    const loadPosition = async () => {
        if (!publicKey) return;
        setIsLoading(true);
        try {
            const program = getProgram(connection, wallet);
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

    // Handle copying legal link
    const copyLink = () => {
        const link = onChainCompany?.legalAgreementLink || company?.legalAgreementLink;

        if (link) {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Real participate in Confidential Share Offering
    const handleBuyShares = async () => {
        if (!buyAmount || !company || !publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;

        setTxPending(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, wallet);
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

            const transaction = await tx.transaction();
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

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
        if (!transferAmount || !company || !publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;

        setTxPending(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, wallet);
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

            const transaction = await tx.transaction();
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

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

    // Handle P2P Transfer (Secondary Market)
    const handleTransfer = async () => {
        if (!transferAmount || !transferRecipient || !publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;

        setTxPending(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program not initialized");

            const shareAmount = BigInt(transferAmount);
            const receiver = new PublicKey(transferRecipient);

            const tx = await buildTransferSharesTx(
                program,
                publicKey,
                receiver,
                companyId,
                shareAmount
            );

            const transaction = await tx.transaction();
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            setTxSuccess(`Success! Transferred ${transferAmount} shares to ${transferRecipient.slice(0, 8)}... Sig: ${signature.slice(0, 8)}`);
            setTransferAmount('');
            setTransferRecipient('');
            loadPosition(); // refresh your shares
        } catch (error: any) {
            console.error("Transfer failed:", error);
            setTxSuccess(`ERROR: ${error.message || 'Transfer failed.'}`);
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
                            <p className="text-xs text-foreground uppercase tracking-wider mb-1 opacity-70" style={{ fontFamily: "'Bangers', cursive" }}>Total Shares Issued</p>
                            <p className="font-mono text-2xl font-bold text-foreground">
                                {/* Only show shares to the admin */}
                                {publicKey?.toBase58() === onChainCompany?.companyAdmin.toBase58()
                                    ? company.totalSharesIssued.toLocaleString()
                                    : <span className="text-secondary flex items-center gap-1 text-sm"><Lock className="w-3 h-3" /> HIDDEN</span>
                                }
                            </p>
                        </div>
                        <div className="p-4 border-2 border-black">
                            <p className="text-xs text-foreground uppercase tracking-wider mb-1 opacity-70" style={{ fontFamily: "'Bangers', cursive" }}>Company ID</p>
                            <p className="font-mono text-2xl font-bold text-foreground">{company.companyId}</p>
                        </div>
                    </div>
                </div>

                {/* Legal Agreement Hash */}
                <div className="card mb-6 animate-pop stagger-1">
                    <div className="flex items-start gap-3 mb-3">
                        <FileCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-lg mb-1 text-foreground tracking-wider">Legal & Offering Details</h3>
                            <p className="text-foreground text-sm mb-3 opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                Official legal agreement and offering prospectus.
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-secondary mb-1">Agreement Link</p>
                                    <div className="flex items-center gap-2 p-3 bg-surface border-2 border-black">
                                        <p className="font-mono text-xs flex-1 break-all flex items-center gap-2">
                                            <a
                                                href={onChainCompany?.legalAgreementLink || company.legalAgreementLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-accent underline hover:text-accent-dark"
                                            >
                                                View Legal Agreement
                                                <ExternalLink className="w-3 h-3 inline ml-1" />
                                            </a>
                                        </p>
                                    </div>
                                </div>

                                {onChainCompany?.offeringUrl && (
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-secondary mb-1 tracking-wider">Offering / Prospectus URL</p>
                                        <div className="p-3 bg-surface border-2 border-dashed border-accent">
                                            <p className="text-accent text-sm font-mono break-all" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                                {onChainCompany.offeringUrl.startsWith('http') ? (
                                                    <a href={onChainCompany.offeringUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-dark">
                                                        {onChainCompany.offeringUrl}
                                                        <ExternalLink className="w-3 h-3 inline ml-1" />
                                                    </a>
                                                ) : (
                                                    onChainCompany.offeringUrl
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Your Confidential Share Allocation */}
                < div className="card mb-6 animate-pop stagger-2" >
                    <h3 className="text-lg mb-4 text-foreground">Your Confidential Share Allocation (CSA)</h3>
                    {
                        position ? (
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
                        )
                    }
                </div >

                {/* Actions */}
                {
                    company.active && (
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
                                    <DollarSign className="w-4 h-4" />
                                    SELL BACK
                                </button>
                                <button
                                    onClick={() => setActiveTab('transfer')}
                                    className={`btn flex-1 ${activeTab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                                    disabled={!position}
                                >
                                    <Send className="w-4 h-4" />
                                    TRANSFER
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
                                        <label className="block text-sm font-bold uppercase mb-2 tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>Allocation Amount</label>
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

                            {/* Transfer Form (Secondary P2P) */}
                            {activeTab === 'transfer' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold uppercase mb-2 tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>Recipient Address</label>
                                        <input
                                            type="text"
                                            value={transferRecipient}
                                            onChange={(e) => setTransferRecipient(e.target.value)}
                                            placeholder="Solana wallet address"
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold uppercase mb-2 tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>Share Amount</label>
                                        <input
                                            type="number"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(e.target.value)}
                                            placeholder="0"
                                            className="input"
                                            min="1"
                                        />
                                    </div>
                                    <div className="p-3 border-2 border-accent bg-accent-light">
                                        <p className="text-sm text-accent" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                            <Lock className="w-4 h-4 inline mr-1" />
                                            Transfers on DonaTrade are peer-to-peer and fully encrypted.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleTransfer}
                                        disabled={!transferAmount || !transferRecipient || txPending}
                                        className="btn btn-primary w-full"
                                    >
                                        {txPending ? 'Processing...' : 'TRANSFER SHARES!'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Inactive Notice */}
                {
                    !company.active && (
                        <div className="card border-warning" style={{ borderColor: 'var(--warning)' }}>
                            <p className="text-warning" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                ⚠️ This Confidential Share Offering is no longer accepting new participants.
                            </p>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
