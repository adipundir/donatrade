'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Building2,
    Shield,
    ExternalLink,
    CheckCircle2,
    Clock,
    AlertCircle,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Unlock
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
    PROGRAM_ID,
    getProgram,
    buildApproveCompanyTx,
    fetchInvestorVault,
    getAllowancePDA,
    buildAuthorizeDecryptionTx,
    PLATFORM_ADMIN
} from '@/lib/solana';
import { bytesToHandle, decryptHandle, decryptMetadata } from '@/lib/encryption';
import { PrivacyBadge } from './PrivacyBadge';
import { formatUSDC } from '@/lib/inco';

interface ApplicationReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    application: any; // The decoded CompanyAccount data
}

export const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({ isOpen, onClose, application }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey, connected, signMessage, signTransaction, signAllTransactions } = wallet;

    const [revealedFunds, setRevealedFunds] = useState<bigint | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [revealStatus, setRevealStatus] = useState<'idle' | 'auth' | 'decrypting' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [isRevealingMetadata, setIsRevealingMetadata] = useState(false);
    const [decryptedMetadata, setDecryptedMetadata] = useState<any | null>(null);
    const [metadataError, setMetadataError] = useState('');

    const handleReveal = async () => {
        if (!publicKey || !application?.cusd || !signMessage) return;

        setIsDecrypting(true);
        setRevealStatus('auth');
        setErrorMsg('');

        try {
            const handleStr = bytesToHandle(application.cusd);
            const handle = BigInt(handleStr);

            // 1. Check/Authorize
            const [allowanceAccount] = getAllowancePDA(handle, publicKey);
            const accountInfo = await connection.getAccountInfo(allowanceAccount);

            if (!accountInfo) {
                const program = getProgram(connection, wallet);
                if (!program) throw new Error("Program not ready");

                const authTxBuilder = await buildAuthorizeDecryptionTx(
                    program,
                    publicKey,
                    handle,
                    publicKey
                );
                const transaction = await authTxBuilder.transaction();
                const signature = await wallet.sendTransaction(transaction, connection);
                await connection.confirmTransaction(signature, 'confirmed');
            }

            // 2. Decrypt
            setRevealStatus('decrypting');
            const decrypted = await decryptHandle(handleStr, { publicKey, signMessage });

            if (decrypted !== null) {
                setRevealedFunds(decrypted);
                setRevealStatus('idle');
            } else {
                throw new Error("Decryption returned null");
            }
        } catch (e: any) {
            console.error("Reveal failed:", e);
            setRevealStatus('error');
            setErrorMsg(e.message || "Decryption failed");
        } finally {
            setIsDecrypting(false);
        }
    };

    const revealMetadata = async (handleStr: string) => {
        if (!publicKey || !signMessage) return;

        setIsRevealingMetadata(true);
        setMetadataError('');

        try {
            const handle = BigInt(handleStr);

            // 1. Check/Authorize (same as funds decryption)
            const [allowanceAccount] = getAllowancePDA(handle, publicKey);
            const accountInfo = await connection.getAccountInfo(allowanceAccount);

            if (!accountInfo) {
                const program = getProgram(connection, wallet);
                if (!program) throw new Error("Program not ready");

                const authTxBuilder = await buildAuthorizeDecryptionTx(
                    program,
                    publicKey,
                    handle,
                    publicKey
                );
                const transaction = await authTxBuilder.transaction();
                const signature = await wallet.sendTransaction(transaction, connection);
                await connection.confirmTransaction(signature, 'confirmed');
            }

            // 2. Decrypt the HANDLE via Inco Reveal
            const revealedKey = await decryptHandle(handleStr, { publicKey, signMessage });

            if (revealedKey !== null) {
                // 3. Use revealed key to decrypt the metadata JSON blob
                const decryptedBlob = decryptMetadata(application.offeringUrl, revealedKey.toString());
                try {
                    const parsed = JSON.parse(decryptedBlob);
                    setDecryptedMetadata(parsed);
                } catch (e) {
                    // Fallback for non-JSON or older test data
                    setDecryptedMetadata({ offeringUrl: decryptedBlob });
                }
            } else {
                throw new Error("Reveal failed");
            }
        } catch (e: any) {
            console.error("Metadata reveal failed:", e);
            setMetadataError(e.message || "Metadata decryption failed");
        } finally {
            setIsRevealingMetadata(false);
        }
    };

    useEffect(() => {
        if (isOpen && application && !decryptedMetadata && !isRevealingMetadata) {
            const handle = bytesToHandle(application.metadataKey);
            if (handle && handle !== "0") {
                revealMetadata(handle);
            }
        }
    }, [isOpen, application?.pubkey?.toBase58()]);

    if (!isOpen || !application) return null;

    const status = application.isApproved ? 'Approved' : 'Pending Review';
    const StatusIcon = application.isApproved ? CheckCircle2 : Clock;
    const statusColor = application.isApproved ? 'text-success' : 'text-accent';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="card w-full max-w-lg relative animate-in zoom-in duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-surface rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bangers', cursive" }}>Application Details</h2>
                    <p className="text-secondary text-sm">
                        Review your submitted company details and status.
                    </p>
                </div>

                {/* Status Box */}
                <div className={`p-4 border-2 border-black mb-6 flex items-center gap-3 ${application.isApproved ? 'bg-green-50' : 'bg-blue-50'}`}>
                    <StatusIcon className={`w-6 h-6 ${statusColor}`} />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider">Status</p>
                        <p className={`text-lg font-bold ${statusColor}`} style={{ fontFamily: "'Bangers', cursive" }}>{status}</p>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-4 mb-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="card p-3 rounded-none bg-surface border-2">
                            <p className="text-[10px] text-secondary font-bold uppercase mb-1">Company ID</p>
                            <p className="font-bold">#{application.companyId.toString()}</p>
                        </div>
                        <div className="card p-3 rounded-none bg-surface border-2">
                            <p className="text-[10px] text-secondary font-bold uppercase mb-1">Pricing</p>
                            <p className="font-bold">${(Number(application.pricePerShare) / 1_000_000).toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Form Decryption Section */}
                    <div className="bg-surface p-4 border-2 border-black">
                        {isRevealingMetadata ? (
                            <div className="flex flex-col items-center gap-2 text-primary animate-pulse py-4 text-center">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="font-bold uppercase tracking-widest text-sm" style={{ fontFamily: "'Bangers', cursive" }}>Fetching Details...</span>
                            </div>
                        ) : decryptedMetadata ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div>
                                    <p className="text-[10px] text-secondary font-bold uppercase mb-1">Company Name</p>
                                    <p className="font-bold text-lg">{decryptedMetadata.name || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-secondary font-bold uppercase mb-1">Sector</p>
                                    <p className="font-bold">{decryptedMetadata.sector || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-secondary font-bold uppercase mb-1">Description</p>
                                    <p className="text-sm border-l-3 border-black pl-3 py-1 bg-white/50">{decryptedMetadata.description || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-secondary font-bold uppercase mb-1">Offering URL</p>
                                    {decryptedMetadata.offeringUrl ? (
                                        <a
                                            href={decryptedMetadata.offeringUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-accent font-bold flex items-center gap-1 hover:underline break-all"
                                        >
                                            {decryptedMetadata.offeringUrl}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : (
                                        <p className="text-secondary opacity-50 italic">None provided</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => revealMetadata(bytesToHandle(application.metadataKey))}
                                className="btn btn-primary w-full py-4 text-lg tracking-widest"
                                style={{ fontFamily: "'Bangers', cursive" }}
                            >
                                <Lock className="w-5 h-5 mr-3" />
                                VIEW APPLICATION INFO
                            </button>
                        )}
                        {metadataError && (
                            <p className="text-[10px] text-error font-bold mt-2 text-center">
                                {metadataError}
                            </p>
                        )}
                    </div>


                    {application.legalAgreementLink && (
                        <div className="card p-4 rounded-none bg-surface border-2 border-success/50">
                            <p className="text-[10px] text-secondary font-bold uppercase mb-1">Legal Agreement (Approved)</p>
                            <a
                                href={application.legalAgreementLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-success font-bold flex items-center gap-1 hover:underline"
                            >
                                View Signed Agreement
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}

                    {/* Encrypted Funds Section */}
                    <div className="card p-4 rounded-none bg-surface border-3 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] text-secondary font-bold uppercase">Confidential Funds Raised</p>
                            <PrivacyBadge />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-baseline gap-2">
                                {isDecrypting ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                                ) : (
                                    <>
                                        <span className="text-3xl font-bold" style={{ fontFamily: "'Bangers', cursive" }}>
                                            {revealedFunds !== null ? formatUSDC(revealedFunds) : '••••••'}
                                        </span>
                                        {revealedFunds === null && <span className="text-xs text-secondary font-bold uppercase tracking-tighter">Encrypted</span>}
                                    </>
                                )}
                            </div>

                            {revealedFunds === null && !isDecrypting && (
                                <button
                                    onClick={handleReveal}
                                    className="px-3 py-1 border-2 border-foreground bg-background hover:bg-surface font-bold uppercase text-[10px] flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
                                    style={{ fontFamily: "'Bangers', cursive" }}
                                >
                                    <Eye className="w-3 h-3" />
                                    Reveal
                                </button>
                            )}
                        </div>

                        {revealStatus === 'auth' && (
                            <p className="text-[9px] text-accent font-bold mt-2 animate-pulse uppercase tracking-tight">
                                ⚠️ Sign with wallet to authorize decryption...
                            </p>
                        )}
                        {revealStatus === 'decrypting' && (
                            <p className="text-[9px] text-accent font-bold mt-2 animate-pulse uppercase tracking-tight">
                                🔒 Decrypting via Inco Lightning...
                            </p>
                        )}
                        {errorMsg && (
                            <p className="text-[9px] text-error font-bold mt-2 uppercase tracking-tight">
                                ❌ Error: {errorMsg}
                            </p>
                        )}
                    </div>
                </div>

                {/* Privacy Footer */}
                <div className="p-4 bg-blue-50 border-2 border-black">
                    <p className="text-xs text-secondary">
                        <strong>Privacy Notice:</strong> Sensitive details are only visible to authorized reviewers after decryption.
                    </p>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={onClose} className="btn btn-primary px-8">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
