'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { ShieldCheck, CheckCircle, Clock, ExternalLink, Building2, FileText, AlertCircle } from 'lucide-react';
import { getProgram, buildActivateCompanyTx, PLATFORM_ADMIN } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';
import { getCompanies, approveAndActivateCompany } from '@/lib/actions/companies';

const ADMIN_ADDRESS = PLATFORM_ADMIN.toBase58();

interface DBCompany {
    id: number;
    walletAddress: string;
    name: string;
    description: string;
    sector: string;
    offeringUrl: string;
    initialShares: number;
    pricePerShare: number;
    status: string;
    legalAgreementUrl: string | null;
    chainId: number | null;
}

export default function AdminPage() {
    const wallet = useWallet();
    const { connected, publicKey } = wallet;
    const { connection } = useConnection();

    const [isLoading, setIsLoading] = useState(false);
    const [pendingCompanies, setPendingCompanies] = useState<DBCompany[]>([]);
    const [activeCompanies, setActiveCompanies] = useState<DBCompany[]>([]);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');

    // Legal agreement URL inputs - keyed by company ID
    const [legalUrls, setLegalUrls] = useState<Record<number, string>>({});

    useEffect(() => {
        if (connected && publicKey) {
            loadCompanies();
        }
    }, [connected, publicKey]);

    const loadCompanies = async () => {
        setIsLoading(true);
        try {
            const pendingResult = await getCompanies('pending');
            setPendingCompanies((pendingResult.companies as DBCompany[]) || []);

            const activeResult = await getCompanies('active');
            setActiveCompanies((activeResult.companies as DBCompany[]) || []);
        } catch (e) {
            console.error("Error loading companies:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveAndActivate = async (company: DBCompany) => {
        if (!publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;

        const legalUrl = legalUrls[company.id];
        if (!legalUrl || !legalUrl.trim()) {
            setMessage('ERROR: Please enter the legal agreement URL before approving.');
            return;
        }

        setIsLoading(true);
        setMessage('');
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program error");

            // Use DB id as chainId
            const chainId = company.id;
            const companyAdminPubkey = new PublicKey(company.walletAddress);

            // 1. Create on-chain entity
            const txBuilder = buildActivateCompanyTx(
                program,
                publicKey,
                chainId,
                companyAdminPubkey,
                BigInt(company.initialShares),
                BigInt(company.pricePerShare)
            );

            console.log("[DonaTrade] Activating company on-chain...");
            const transaction = await txBuilder.transaction();
            const signature = await wallet.sendTransaction(transaction, connection);

            console.log("[DonaTrade] Activation submitted:", signature);
            await connection.confirmTransaction(signature, 'confirmed');

            // 2. Update DB with legal agreement + chainId + status
            const result = await approveAndActivateCompany(company.id, legalUrl.trim(), chainId);

            if (!result.success) {
                throw new Error(result.error || 'Failed to update DB');
            }

            const explorerLink = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
            setMessage(`APPROVED "${company.name}"! Now live on-chain. | Transaction Sig: ${explorerLink}`);
            setLegalUrls(prev => ({ ...prev, [company.id]: '' })); // Clear input
            loadCompanies();

        } catch (error: any) {
            console.error("Approval failed:", error);
            setMessage(`ERROR: ${error.message || 'Transaction failed.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (publicKey?.toBase58() !== ADMIN_ADDRESS) {
        return (
            <div className="min-h-screen pt-24 hero-comic">
                <div className="container text-center">
                    <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-secondary opacity-50" />
                    <h1 className="text-3xl mb-2">Restricted Access</h1>
                    <p className="text-secondary">This page is for platform administrators only.</p>
                    <p className="text-xs text-secondary mt-2 font-mono">Required: {ADMIN_ADDRESS.slice(0, 8)}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 hero-comic">
            <div className="container">
                <h1 className="text-4xl mb-2">Admin Console</h1>
                <p className="text-secondary mb-8" style={{ fontFamily: "'Comic Neue', cursive" }}>
                    Review applications and add legal agreements to activate companies.
                </p>

                {message && (
                    <div className={`p-5 border-3 ${message.startsWith('ERROR') ? 'border-warning bg-warning-light' : 'border-accent bg-accent-light'} mb-6 shadow-md animate-pop`}>
                        {message.startsWith('ERROR') ? (
                            <p className="font-bold flex items-center gap-2" style={{ fontFamily: "'Bangers', cursive" }}>
                                <AlertCircle className="w-5 h-5" />
                                {message}
                            </p>
                        ) : (
                            <div>
                                <h3 className="text-xl font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "'Bangers', cursive" }}>
                                    <CheckCircle className="w-6 h-6" />
                                    Review Successful!
                                </h3>
                                <div className="space-y-1 text-sm font-mono opacity-90">
                                    {message.split('|').map((line, i) => {
                                        if (line.includes('http')) {
                                            const [text, url] = line.split(': ');
                                            return (
                                                <p key={i} className="flex items-center gap-2">
                                                    {text}:
                                                    <a
                                                        href={url.trim()}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline font-bold hover:text-white"
                                                    >
                                                        View on Explorer <ExternalLink className="w-3 h-3 inline" />
                                                    </a>
                                                </p>
                                            );
                                        }
                                        return <p key={i}>{line}</p>;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b-3 border-foreground mb-6">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`py-3 px-6 font-bold uppercase tracking-wide transition-colors ${activeTab === 'pending' ? 'bg-accent text-white' : 'hover:bg-surface'}`}
                    >
                        <Clock className="w-4 h-4 inline mr-2" />
                        Pending ({pendingCompanies.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`py-3 px-6 font-bold uppercase tracking-wide transition-colors ${activeTab === 'active' ? 'bg-accent text-white' : 'hover:bg-surface'}`}
                    >
                        <CheckCircle className="w-4 h-4 inline mr-2" />
                        Active ({activeCompanies.length})
                    </button>
                </div>

                <div className="card">
                    {isLoading && (pendingCompanies.length === 0 && activeCompanies.length === 0) ? (
                        <p className="text-center py-8 opacity-50">Loading applications...</p>
                    ) : activeTab === 'pending' ? (
                        pendingCompanies.length === 0 ? (
                            <p className="text-center py-8 opacity-50">No pending applications.</p>
                        ) : (
                            <div className="space-y-6">
                                {pendingCompanies.map((company) => (
                                    <div key={company.id} className="p-5 border-3 border-foreground bg-surface">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-bold text-xl flex items-center gap-2" style={{ fontFamily: "'Bangers', cursive" }}>
                                                    <Building2 className="w-5 h-5" />
                                                    {company.name}
                                                </h3>
                                                <p className="text-sm text-secondary">{company.sector}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase border-2 border-yellow-800">
                                                Pending
                                            </span>
                                        </div>

                                        <p className="text-sm mb-3" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                            {company.description}
                                        </p>

                                        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                                            <div>
                                                <span className="text-secondary">Shares:</span>
                                                <span className="font-mono ml-1">{company.initialShares.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-secondary">Price:</span>
                                                <span className="font-mono ml-1">${(company.pricePerShare / 1_000_000).toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="text-secondary">Wallet:</span>
                                                <span className="font-mono ml-1">{company.walletAddress.slice(0, 8)}...</span>
                                            </div>
                                        </div>

                                        <a href={company.offeringUrl} target="_blank" className="text-accent underline flex items-center gap-1 text-sm mb-4">
                                            <ExternalLink className="w-3 h-3" /> View Offering Documents
                                        </a>

                                        {/* Legal Agreement Input */}
                                        <div className="border-t-2 border-foreground/20 pt-4">
                                            <label className="block text-sm font-bold uppercase mb-2 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Legal Agreement URL
                                            </label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="url"
                                                    value={legalUrls[company.id] || ''}
                                                    onChange={(e) => setLegalUrls(prev => ({ ...prev, [company.id]: e.target.value }))}
                                                    placeholder="https://docusign.com/signed-agreement/..."
                                                    className="input flex-1"
                                                />
                                                <button
                                                    onClick={() => handleApproveAndActivate(company)}
                                                    className="btn btn-primary flex items-center gap-2"
                                                    disabled={isLoading || !legalUrls[company.id]}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Approve & Activate
                                                </button>
                                            </div>
                                            <p className="text-xs text-secondary mt-2">
                                                Enter the signed legal agreement link, then click to approve and create on-chain.
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        activeCompanies.length === 0 ? (
                            <p className="text-center py-8 opacity-50">No active companies yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {activeCompanies.map((company) => (
                                    <div key={company.id} className="flex items-center justify-between p-4 border-b border-border/20 last:border-0">
                                        <div>
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <Building2 className="w-5 h-5" />
                                                {company.name}
                                                <span className="text-xs font-mono text-secondary">#{company.chainId}</span>
                                            </h3>
                                            <p className="text-sm text-secondary">{company.sector}</p>
                                            {company.legalAgreementUrl && (
                                                <a href={company.legalAgreementUrl} target="_blank" className="text-xs text-accent underline flex items-center gap-1 mt-1">
                                                    <FileText className="w-3 h-3" /> Legal Agreement
                                                </a>
                                            )}
                                        </div>
                                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase border-2 border-green-800">
                                            Live
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
