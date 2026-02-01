'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    ArrowLeft,
    Lock,
    Building2,
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
    fetchInvestorVault,
    fetchInvestorPositions,
    buildBuySharesTx,
    buildSellSharesTx,
    buildTransferSharesTx,
    BN
} from '@/lib/solana';
import { PublicKey } from "@solana/web3.js";
import { useConnection } from '@solana/wallet-adapter-react';
import { formatPricePerShare } from '@/lib/mockData';
import { getCompanyById } from '@/lib/actions/companies';
import { bytesToHandle, decryptHandle } from '@/lib/encryption';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

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
    const [rawVault, setRawVault] = useState<any>(null); // Track vault state
    const [onChainCompany, setOnChainCompany] = useState<any>(null);
    const [dbCompany, setDbCompany] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false); // for actions like buying
    const [isInitialLoading, setIsInitialLoading] = useState(true); // for first load
    const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);
    const [isRevealingBalance, setIsRevealingBalance] = useState(false);

    const companyId = Number(params.id);

    // Derived "company" object merging DB and on-chain data
    const company = (dbCompany && onChainCompany) ? {
        companyId: Number(onChainCompany.companyId),
        name: dbCompany.name,
        description: dbCompany.description,
        sector: dbCompany.sector,
        pricePerShare: Number(onChainCompany.pricePerShare),
        sharesAvailable: Number(onChainCompany.sharesAvailable),
        totalSharesIssued: dbCompany.initialShares,
        active: onChainCompany.active,
        legalAgreementUrl: dbCompany.legalAgreementUrl,
        offeringUrl: dbCompany.offeringUrl,
    } : null;

    useEffect(() => {
        // Handle initial load and wallet initialization
        let mounted = true;

        // Timeout to stop loading if wallet doesn't connect
        const timer = setTimeout(() => {
            if (mounted && !connected) setIsInitialLoading(false);
        }, 1500);

        if (connected && publicKey && companyId) {
            const initLoad = async () => {
                // Parallelize all data fetching
                await Promise.all([
                    loadOnChainData(),
                    loadDbCompany(),
                    loadPosition()
                ]);
                if (mounted) setIsInitialLoading(false);
            };
            initLoad();
            clearTimeout(timer);
        }

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [connected, publicKey, companyId]);

    const loadDbCompany = async () => {
        try {
            const result = await getCompanyById(companyId);
            if (result.success && result.company) {
                setDbCompany(result.company);
            }
        } catch (e) {
            console.error("Failed to fetch DB company:", e);
        }
    };

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
            // This happens if the account data is invalid (e.g. from an old version)
            setOnChainCompany(null);
        }
    };

    const loadPosition = async () => {
        if (!publicKey) return;
        setIsLoading(true);
        try {
            const program = getProgram(connection, wallet);
            if (program) {
                // Force re-instantiate public key from string to ensure standard Buffer format
                const investorPubkey = new PublicKey(publicKey.toString());

                console.log("[DonaTrade] Refreshing data for:", investorPubkey.toBase58());

                // Parallelize user data and on-chain company data refreshes
                const [vaultData, posData, _] = await Promise.all([
                    fetchInvestorVault(program, investorPubkey),
                    fetchInvestorPositions(program, investorPubkey),
                    loadOnChainData() // Refresh company share availability
                ]);

                setRawVault(vaultData);

                // If vault changed or disappeared, reset decrypted balance
                if (!vaultData) setDecryptedBalance(null);

                // Find current company position if it exists
                const currentPos = posData?.find((p: any) => Number(p.companyId) === companyId);
                setPosition(currentPos || null);
            }
        } catch (error) {
            console.error("[DonaTrade] Error loading user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevealBalance = async () => {
        if (!rawVault || !publicKey || !wallet.signMessage) return;
        setIsRevealingBalance(true);
        try {
            const program = getProgram(connection, wallet) as any;
            if (!program) throw new Error("Program not initialized");

            const handle = bytesToHandle(rawVault.cusd[0]);
            const signature = await decryptHandle(
                handle,
                wallet
            );

            if (signature) {
                setDecryptedBalance(BigInt(signature));
            }
        } catch (error) {
            console.error("[DonaTrade] Failed to reveal balance:", error);
        } finally {
            setIsRevealingBalance(false);
        }
    };

    // Handle copying legal link
    const copyLink = () => {
        const link = company?.legalAgreementUrl;

        if (link) {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Real participate in Confidential Share Offering
    const handleBuyShares = async () => {
        if (!buyAmount || !company || !publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;

        // Check if vault exists
        if (!rawVault) {
            setTxSuccess("ERROR: No vault found. Please deposit USDC in your Portfolio first to initialize your vault.");
            setTimeout(() => setTxSuccess(''), 5000);
            return;
        }

        // Check availability
        if (Number(buyAmount) > company.sharesAvailable) {
            setTxSuccess(`ERROR: Not enough shares available! Only ${company.sharesAvailable.toLocaleString()} left.`);
            setTimeout(() => setTxSuccess(''), 5000);
            return;
        }

        // Check against decrypted balance if available
        if (decryptedBalance !== null) {
            const cost = BigInt(buyAmount) * BigInt(company.pricePerShare);
            if (cost > decryptedBalance) {
                setTxSuccess(`ERROR: Insufficient funds! Needed: ${(Number(cost) / 1_000_000).toFixed(2)} USDC. Your Vault: ${(Number(decryptedBalance) / 1_000_000).toFixed(2)} USDC.`);
                setTimeout(() => setTxSuccess(''), 5000);
                return;
            }
        }

        setTxPending(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program not initialized");

            const shareAmount = BigInt(buyAmount);
            const companyPDA = getCompanyPDA(companyId)[0];

            console.log("[DonaTrade] Buy Shares Request:", {
                investor: publicKey.toBase58(),
                companyId,
                amount: buyAmount,
                companyPDA: companyPDA.toBase58()
            });

            // Note: lightning_program remaining_accounts are handled internally by Inco Lightning
            // if we are using the user's signature for authority.
            const tx = await buildBuySharesTx(
                program,
                publicKey,
                companyId,
                companyPDA,
                shareAmount,
                [] // No manual remaining accounts needed for standard buy
            );

            const transaction = await tx.transaction();
            const signature = await wallet.sendTransaction(transaction, connection).catch(err => {
                console.error("[DonaTrade] Transaction submission failed:", err);
                if (err.logs) {
                    console.log("[DonaTrade] On-chain Simulation Logs:\n" + err.logs.join('\n'));
                }
                throw err;
            });

            await connection.confirmTransaction(signature, 'confirmed');

            setTxSuccess(`BOOM! Your Confidential Share Allocation (CSA) of ${buyAmount} shares is confirmed! Sig: ${signature.slice(0, 8)}...`);
            setBuyAmount('');

            // Full refresh
            await Promise.all([
                loadPosition(),
                loadDbCompany(),
                // If they bought, their balance definitely changed, hide it or try to re-decrypt? 
                // Better to just null it and let them reveal again to be safe.
                setDecryptedBalance(null)
            ]);
        } catch (error: any) {
            console.error("[DonaTrade] Buy shares failed:", error);
            let msg = error.message || 'Transaction failed.';
            if (error.logs) {
                msg = "On-chain simulation failed. Possible reasons: Insufficient cUSD in vault or company inactive. Check console for details.";
            }
            setTxSuccess(`ERROR: ${msg}`);
        } finally {
            setTxPending(false);
            setTimeout(() => setTxSuccess(''), 7000);
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

            console.log("[DonaTrade] Sell Shares Request:", {
                investor: publicKey.toBase58(),
                companyId,
                amount: transferAmount
            });

            const tx = await buildSellSharesTx(
                program,
                publicKey,
                companyId,
                companyPDA,
                shareAmount,
                []
            );

            const transaction = await tx.transaction();
            const signature = await wallet.sendTransaction(transaction, connection).catch(err => {
                console.error("[DonaTrade] Sell transaction failed:", err);
                if (err.logs) console.log("[DonaTrade] Simulation Logs:\n" + err.logs.join('\n'));
                throw err;
            });
            await connection.confirmTransaction(signature, 'confirmed');

            setTxSuccess(`WHOOSH! Successfully sold back ${transferAmount} shares! Sig: ${signature.slice(0, 8)}...`);
            setTransferAmount('');
            loadPosition();
        } catch (error: any) {
            console.error("[DonaTrade] Sell failed:", error);
            let msg = error.message || 'Transaction failed.';
            if (error.logs) msg = "Simulation failed. Ensure you have enough shares and the company is active.";
            setTxSuccess(`ERROR: ${msg}`);
        } finally {
            setTxPending(false);
            setTimeout(() => setTxSuccess(''), 7000);
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

            console.log("[DonaTrade] Transfer Request:", {
                from: publicKey.toBase58(),
                to: transferRecipient,
                amount: transferAmount
            });

            const tx = await buildTransferSharesTx(
                program,
                publicKey,
                receiver,
                companyId,
                shareAmount
            );

            const transaction = await tx.transaction();
            const signature = await wallet.sendTransaction(transaction, connection).catch(err => {
                console.error("[DonaTrade] Transfer failed:", err);
                if (err.logs) console.log("[DonaTrade] Simulation Logs:\n" + err.logs.join('\n'));
                throw err;
            });
            await connection.confirmTransaction(signature, 'confirmed');

            setTxSuccess(`Success! Transferred ${transferAmount} shares to ${transferRecipient.slice(0, 8)}... Sig: ${signature.slice(0, 8)}`);
            setTransferAmount('');
            setTransferRecipient('');
            loadPosition(); // refresh your shares
        } catch (error: any) {
            console.error("[DonaTrade] Transfer failed:", error);
            let msg = error.message || 'Transfer failed.';
            if (error.logs) msg = "Simulation failed. Ensure you have enough shares to transfer.";
            setTxSuccess(`ERROR: ${msg}`);
        } finally {
            setTxPending(false);
            setTimeout(() => setTxSuccess(''), 7000);
        }
    };

    // 1. Initial loading state FIRST (prevents "Secret Identity" flash during wallet init)
    if (isInitialLoading) {
        return (
            <div className="min-h-screen pt-24 hero-comic flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-6xl tracking-widest text-foreground" style={{ fontFamily: "'Bangers', cursive" }}>LOADING...</h1>
                    <p className="text-secondary mt-2 uppercase tracking-widest text-xs font-bold">Synchronizing with Solana</p>
                </div>
            </div>
        );
    }

    // 2. Require wallet connection SECOND
    if (!connected) {
        return (
            <div className="min-h-screen pt-24 hero-comic">
                <div className="container">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <div className="w-16 h-16 border-3 border-black flex items-center justify-center mb-4 bg-accent-light">
                            <Lock className="w-8 h-8 text-accent" />
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
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h1 className="text-3xl">{company.name}</h1>
                                {company.active ? (
                                    <span className="badge badge-active">CSA ACTIVE</span>
                                ) : (
                                    <span className="badge badge-inactive">CLOSED</span>
                                )}
                                <PrivacyBadge />
                            </div>
                        </div>
                    </div>

                    <p className="text-foreground mb-6 opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>{company.description}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 border-2 border-black">
                            <p className="text-xs text-foreground uppercase tracking-wider mb-1 opacity-70" style={{ fontFamily: "'Bangers', cursive" }}>Available / Total Shares</p>
                            <p className="font-mono text-2xl font-bold text-foreground">
                                {company.sharesAvailable.toLocaleString()} <span className="text-base text-secondary font-normal">/ {company.totalSharesIssued.toLocaleString()}</span>
                            </p>
                            <div className="w-full bg-secondary/20 h-2 mt-2 rounded-full overflow-hidden border border-black/20">
                                <div
                                    className="bg-accent h-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (company.sharesAvailable / company.totalSharesIssued) * 100)}%` }}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-2 border-black">
                            <p className="text-xs text-foreground uppercase tracking-wider mb-1 opacity-70" style={{ fontFamily: "'Bangers', cursive" }}>Price per Share</p>
                            <p className="font-mono text-2xl font-bold text-foreground">${(company.pricePerShare / 1_000_000).toFixed(2)}</p>
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
                                                href={company.legalAgreementUrl || '#'}
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

                                {company.offeringUrl && (
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-secondary mb-1 tracking-wider">Offering / Prospectus URL</p>
                                        <div className="p-3 bg-surface border-2 border-dashed border-accent">
                                            <a
                                                href={company.offeringUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-accent underline hover:text-accent-dark text-sm font-mono break-all"
                                            >
                                                {company.offeringUrl}
                                                <ExternalLink className="w-3 h-3 inline ml-1" />
                                            </a>
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
                                encryptedShares={position.encryptedShares}
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
                                    className={`btn flex-1 ${activeTab === 'sell' ? 'btn-primary' : 'btn-secondary'} opacity-75`}
                                // disabled={!position} // Allow clicking to see the "Locked" message
                                >
                                    <Lock className="w-4 h-4" />
                                    SELL BACK
                                </button>
                                <button
                                    onClick={() => setActiveTab('transfer')}
                                    className={`btn flex-1 ${activeTab === 'transfer' ? 'btn-primary' : 'btn-secondary'} opacity-75`}
                                //  disabled={!position} // Allow clicking to see the "Locked" message
                                >
                                    <Lock className="w-4 h-4" />
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
                                        <p className="text-sm text-foreground font-bold" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                            <Lock className="w-4 h-4 inline mr-1" />
                                            Your Confidential Share Allocation (CSA) will be encrypted before storing on-chain!
                                        </p>
                                    </div>

                                    {/* Vault Balance Reveal for safety */}
                                    <div className="flex items-center justify-between mt-4 mb-2">
                                        <p className="text-xs uppercase font-bold tracking-wider opacity-60">Your Vault Balance</p>
                                        <button
                                            onClick={handleRevealBalance}
                                            disabled={isRevealingBalance}
                                            className="text-[10px] uppercase font-bold text-accent hover:underline flex items-center gap-1"
                                        >
                                            {isRevealingBalance ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : decryptedBalance !== null ? (
                                                <>
                                                    <EyeOff className="w-3 h-3" />
                                                    Hide
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-3 h-3" />
                                                    Reveal for safety
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="p-3 border-2 border-black bg-surface mb-6 flex items-center justify-between">
                                        <span className="font-mono text-xl font-bold">
                                            {decryptedBalance !== null ? (Number(decryptedBalance) / 1_000_000).toLocaleString() : '🔒 ••••••'}
                                        </span>
                                        <span className="text-xs font-bold opacity-70">cUSD</span>
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
                                <div className="text-center py-8">
                                    <Lock className="w-12 h-12 mx-auto mb-4 text-secondary opacity-50" />
                                    <h3 className="text-xl font-bold mb-2">Locked</h3>
                                    <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                        Transfers will be enabled once the Confidential Share Allocation (CSA) is complete.
                                    </p>
                                </div>
                            )}

                            {/* Sell Form */}
                            {activeTab === 'sell' && (
                                <div className="text-center py-8">
                                    <Lock className="w-12 h-12 mx-auto mb-4 text-secondary opacity-50" />
                                    <h3 className="text-xl font-bold mb-2">Buyback Unavailable</h3>
                                    <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                        This company is not currently offering a share buyback program.
                                    </p>
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
