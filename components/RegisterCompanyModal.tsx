'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { X, Sparkles, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { createCompanyApplication } from '@/lib/actions/companies';

interface RegisterCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function RegisterCompanyModal({ isOpen, onClose, onSuccess }: RegisterCompanyModalProps) {
    const { publicKey, connected } = useWallet();

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        sector: '',
        initialShares: '',
        pricePerShare: '',
        offeringUrl: '',
    });

    useEffect(() => {
        if (isOpen) {
            setMessage('');
            setIsError(false);
            setIsLoading(false);
            // Don't reset isSubmitted here - we want to preserve state
        }
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLoading || isSubmitted) return;
        if (!connected || !publicKey) {
            setMessage('Error: Wallet not connected');
            setIsError(true);
            return;
        }

        setIsLoading(true);
        setMessage('');
        setIsError(false);

        try {
            if (!form.name || !form.description || !form.sector || !form.initialShares || !form.pricePerShare || !form.offeringUrl) {
                throw new Error('Please fill in all required fields');
            }

            const pricePerShare = Math.round(parseFloat(form.pricePerShare) * 1_000_000);

            const result = await createCompanyApplication({
                walletAddress: publicKey.toBase58(),
                name: form.name,
                description: form.description,
                sector: form.sector,
                offeringUrl: form.offeringUrl,
                initialShares: parseInt(form.initialShares),
                pricePerShare: pricePerShare,
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit application');
            }

            setIsSubmitted(true);
            setMessage('Application submitted successfully!');
            setIsError(false);
            onSuccess(); // Notify parent to refresh state

        } catch (error: any) {
            console.error('[DonaTrade] Registration error:', error);
            setMessage(error.message || 'An error occurred');
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-background border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative animate-pop">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b-3 border-foreground">
                    <h2 className="text-2xl uppercase tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>
                        {isSubmitted ? 'Application Submitted' : 'Register Your Company'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface transition-colors border-2 border-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isSubmitted ? (
                    /* Success State - Keep modal open */
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
                            <Clock className="w-10 h-10 text-accent" />
                        </div>
                        <h3 className="text-2xl mb-3" style={{ fontFamily: "'Bangers', cursive" }}>
                            Awaiting Admin Review
                        </h3>
                        <p className="text-secondary mb-6" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            Your application for <span className="font-bold text-foreground">{form.name}</span> has been submitted.
                            You'll be notified once it's approved.
                        </p>
                        <button
                            onClick={onClose}
                            className="btn btn-primary"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleRegister} className="p-6 space-y-5">
                        {message && (
                            <div className={`p-4 border-3 ${isError ? 'border-warning bg-warning-light' : 'border-accent bg-accent-light'} flex items-center gap-3`}>
                                {isError ? <AlertCircle className="w-5 h-5 text-warning shrink-0" /> : <CheckCircle className="w-5 h-5 text-accent shrink-0" />}
                                <p className="font-bold" style={{ fontFamily: "'Bangers', cursive" }}>{message}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <label className="block text-sm font-bold uppercase mb-2 tracking-wide">Company Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Acme Corp"
                                    className="input w-full"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2 tracking-wide">Sector</label>
                                <input
                                    type="text"
                                    name="sector"
                                    value={form.sector}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Technology"
                                    className="input w-full"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2 tracking-wide">Offering URL</label>
                                <input
                                    type="url"
                                    name="offeringUrl"
                                    value={form.offeringUrl}
                                    onChange={handleInputChange}
                                    placeholder="https://..."
                                    className="input w-full"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold uppercase mb-2 tracking-wide">Description</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleInputChange}
                                placeholder="Describe your company and offering..."
                                rows={3}
                                className="input w-full resize-none"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold uppercase mb-2 tracking-wide">Initial Shares</label>
                                <input
                                    type="number"
                                    name="initialShares"
                                    value={form.initialShares}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 1000000"
                                    min="1"
                                    className="input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold uppercase mb-2 tracking-wide">Price per Share (USDC)</label>
                                <input
                                    type="number"
                                    name="pricePerShare"
                                    value={form.pricePerShare}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 10.00"
                                    step="0.01"
                                    min="0.01"
                                    className="input w-full"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !connected}
                            className="btn btn-primary w-full py-4 text-lg disabled:opacity-50 mt-4"
                        >
                            {!connected ? 'CONNECT WALLET FIRST' : isLoading ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
                            {connected && !isLoading && <Sparkles className="w-5 h-5 ml-2" />}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
