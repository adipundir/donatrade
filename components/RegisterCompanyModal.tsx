'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
    X,
    Shield,
    Sparkles,
    Plus,
    Info,
    Lock,
    CheckCircle,
    ArrowRight
} from 'lucide-react';
import {
    getProgram,
    buildSubmitApplicationTx,
    PLATFORM_ADMIN
} from '@/lib/solana';
import { encryptMetadata } from '@/lib/encryption';

interface RegisterCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function RegisterCompanyModal({ isOpen, onClose, onSuccess }: RegisterCompanyModalProps) {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { connection } = useConnection();

    const [isLoading, setIsLoading] = useState(false);
    const [txSuccess, setTxSuccess] = useState('');
    const [signature, setSignature] = useState('');
    const [form, setForm] = useState({
        name: '',
        description: '',
        sector: '',
        initialShares: '',
        pricePerShare: '',
        offeringUrl: '',
    });

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setTxSuccess('');
            setSignature('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        if (!publicKey) {
            setTxSuccess('Error: Wallet not connected');
            return;
        }

        setIsLoading(true);
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program not initialized");

            const companyId = Date.now();
            console.log(`[DonaTrade] Registering company with ID: ${companyId}`);

            const initialShares = BigInt(form.initialShares);
            const pricePerShare = BigInt(parseFloat(form.pricePerShare) * 1_000_000); // 6 decimals

            // 1. Generate Metadata Key (Random 16-byte handle)
            const metadataKeySeed = Math.floor(Math.random() * 1000000000).toString();
            // In a real app we'd use a stronger random handle
            const metadataKeyHandle = BigInt(metadataKeySeed);

            // 2. Encrypted Metadata Blob (The entire form is private)
            const metadataBlob = JSON.stringify({
                name: form.name,
                sector: form.sector,
                description: form.description,
                offeringUrl: form.offeringUrl
            });
            const encryptedMetadata = encryptMetadata(metadataBlob, metadataKeySeed);

            // 3. Build & Submit Consolidated Application (Using wallet.sendTransaction for stability)
            const txBuilder = buildSubmitApplicationTx(
                program,
                publicKey,
                publicKey, // Creator is the company admin
                companyId,
                initialShares,
                pricePerShare,
                encryptedMetadata,
                metadataKeyHandle
            );

            console.log("[DonaTrade] Submitting transaction via wallet.sendTransaction()...");

            // Get the transaction object from Anchor builder
            const transaction = await txBuilder.transaction();

            // Explicitly set the fee payer and recent blockhash
            transaction.feePayer = publicKey;
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;

            const sig = await wallet.sendTransaction(transaction, connection, {
                skipPreflight: true
            });

            console.log("[DonaTrade] Transaction submitted, signature:", sig);

            // Wait for confirmation
            await connection.confirmTransaction(sig, 'confirmed');
            console.log("[DonaTrade] Transaction confirmed!");

            setSignature(sig);
            setTxSuccess('Application Submitted Successfully!');

            // Wait a moment then close/refresh
            setTimeout(() => {
                onSuccess();
            }, 2000);

        } catch (error: any) {
            console.error("Registration failed:", error);
            const msg = error.message || 'Transaction failed.';
            setTxSuccess(`ERROR: ${msg}`);

            if (error.logs) {
                console.log("Program Logs:", error.logs);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container: White bg, Thick Black Border, Deep Hard Shadow */}
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">

                {/* Header: Clean Comic Style */}
                <div className="bg-white p-6 border-b-4 border-black flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-accent text-white p-2 border-2 border-black">
                            <Plus className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-wider text-black" style={{ fontFamily: "'Bangers', cursive" }}>
                            REGISTER COMPANY
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-ghost hover:bg-black/5 p-2 rounded-full"
                        disabled={isLoading}
                    >
                        <X className="w-8 h-8 text-black" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {signature ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-green-100 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-3xl mb-2 font-bold text-black" style={{ fontFamily: "'Bangers', cursive" }}>
                                APPLICATION SUBMITTED
                            </h3>
                            <p className="text-lg text-secondary mb-8 font-mono">
                                Request sent to platform admin.
                            </p>
                            <p className="text-xs text-secondary opacity-50">
                                Redirecting...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-6">
                            {txSuccess && txSuccess.startsWith('ERROR') && (
                                <div className="p-4 bg-error/10 border-2 border-error text-error font-bold">
                                    {txSuccess}
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: "'Bangers', cursive" }}>
                                        Company Name
                                    </label>
                                    <input
                                        required
                                        name="name"
                                        value={form.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Acme Space Corp"
                                        className="input w-full bg-white border-3 border-black p-3 text-lg focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: "'Bangers', cursive" }}>
                                        Sector
                                    </label>
                                    <input
                                        required
                                        name="sector"
                                        value={form.sector}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Aerospace"
                                        className="input w-full bg-white border-3 border-black p-3 text-lg focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: "'Bangers', cursive" }}>
                                    Description
                                </label>
                                <textarea
                                    required
                                    name="description"
                                    value={form.description}
                                    onChange={handleInputChange}
                                    placeholder="Briefly describe your company's mission..."
                                    className="input w-full min-h-[120px] bg-white border-3 border-black p-3 text-lg focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: "'Bangers', cursive" }}>
                                    Offering URL
                                </label>
                                <input
                                    required
                                    name="offeringUrl"
                                    value={form.offeringUrl}
                                    onChange={handleInputChange}
                                    placeholder="https://docsend.com/..."
                                    className="input w-full bg-white border-3 border-black p-3 text-lg focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2">
                                    <label className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: "'Bangers', cursive" }}>
                                        Initial Shares
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        name="initialShares"
                                        value={form.initialShares}
                                        onChange={handleInputChange}
                                        placeholder="1,000,000"
                                        className="input w-full bg-white border-3 border-black p-3 text-lg focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="1"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: "'Bangers', cursive" }}>
                                        Price (USDC)
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        name="pricePerShare"
                                        value={form.pricePerShare}
                                        onChange={handleInputChange}
                                        placeholder="10.00"
                                        className="input w-full bg-white border-3 border-black p-3 text-lg focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="0.01"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 border-2 border-black">
                                <p className="text-xs text-secondary font-mono">
                                    <strong>Privacy Notice:</strong> All details are client-side encrypted. Only you and Donatrade can access this data until your application is approved.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary w-full py-4 text-xl tracking-widest flex items-center justify-center gap-2"
                                style={{ fontFamily: "'Bangers', cursive" }}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {isLoading ? 'PROCESSING...' : 'SUBMIT APPLICATION'}
                                </span>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
