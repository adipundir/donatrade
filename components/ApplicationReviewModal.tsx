'use client';

import React from 'react';
import {
    X,
    Building2,
    ExternalLink,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';

interface ApplicationReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    application: any; // Database company record
}

export const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({ isOpen, onClose, application }) => {
    if (!isOpen || !application) return null;

    // Status mapping from DB
    const statusMap: { [key: string]: { label: string; color: string; icon: any; bg: string } } = {
        pending: { label: 'Pending Review', color: 'text-accent', icon: Clock, bg: 'bg-accent-light' },
        approved: { label: 'Approved - Awaiting Activation', color: 'text-success', icon: CheckCircle2, bg: 'bg-success-light' },
        active: { label: 'Live on Blockchain', color: 'text-success', icon: CheckCircle2, bg: 'bg-success-light' },
    };

    const currentStatus = statusMap[application.status] || statusMap.pending;
    const StatusIcon = currentStatus.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-background border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative animate-pop">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b-3 border-foreground">
                    <h2 className="text-2xl uppercase tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>
                        Your Application
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface transition-colors border-2 border-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Status Box */}
                    <div className={`p-4 border-3 border-foreground flex items-center gap-3 ${currentStatus.bg}`}>
                        <StatusIcon className={`w-6 h-6 ${currentStatus.color}`} />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-0.5">Status</p>
                            <p className={`text-xl font-bold tracking-widest ${currentStatus.color}`} style={{ fontFamily: "'Bangers', cursive" }}>
                                {currentStatus.label}
                            </p>
                        </div>
                    </div>

                    {/* Company Details */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-secondary font-bold uppercase mb-1">Company Name</p>
                            <p className="text-xl font-bold" style={{ fontFamily: "'Bangers', cursive" }}>{application.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-surface p-3 border-2 border-foreground">
                                <p className="text-xs text-secondary font-bold uppercase mb-1">Sector</p>
                                <p className="font-bold">{application.sector}</p>
                            </div>
                            <div className="bg-surface p-3 border-2 border-foreground">
                                <p className="text-xs text-secondary font-bold uppercase mb-1">Price per Share</p>
                                <p className="font-bold">${(application.pricePerShare / 1_000_000).toFixed(2)} USDC</p>
                            </div>
                        </div>

                        <div className="bg-surface p-3 border-2 border-foreground">
                            <p className="text-xs text-secondary font-bold uppercase mb-1">Initial Shares</p>
                            <p className="font-bold">{application.initialShares?.toLocaleString()}</p>
                        </div>

                        <div>
                            <p className="text-xs text-secondary font-bold uppercase mb-1">Description</p>
                            <p className="text-sm text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                {application.description}
                            </p>
                        </div>

                        {application.offeringUrl && (
                            <div>
                                <p className="text-xs text-secondary font-bold uppercase mb-1">Offering URL</p>
                                <a
                                    href={application.offeringUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent font-bold flex items-center gap-1 hover:underline text-sm"
                                >
                                    {application.offeringUrl}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        {application.legalAgreementUrl && (
                            <div className="bg-success-light p-3 border-2 border-success">
                                <p className="text-xs text-secondary font-bold uppercase mb-1">Legal Agreement</p>
                                <a
                                    href={application.legalAgreementUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-success font-bold flex items-center gap-1 hover:underline text-sm"
                                >
                                    View Signed Agreement
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        {application.chainId && (
                            <div className="bg-surface p-3 border-2 border-foreground">
                                <p className="text-xs text-secondary font-bold uppercase mb-1">Chain ID</p>
                                <p className="font-mono text-sm">#{application.chainId}</p>
                            </div>
                        )}
                    </div>

                    {/* Pending Notice */}
                    {application.status === 'pending' && (
                        <div className="p-4 bg-[var(--accent-light)] border-2 border-accent">
                            <p className="text-sm text-[var(--text-primary)]" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                <strong>What&apos;s next?</strong> Our team will review your application. Once approved, your company will go live for investment.
                            </p>
                        </div>
                    )}

                    {/* Active Notice */}
                    {application.status === 'active' && (
                        <div className="p-4 bg-[#e6ffe6] dark:bg-[#002b00] border-2 border-[var(--success)]">
                            <p className="text-sm text-[var(--text-primary)]" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                <strong>🎉 Live!</strong> Your company is now active and open for investment.
                            </p>
                        </div>
                    )}

                </div>

                <div className="p-6 pt-0">
                    <button onClick={onClose} className="btn btn-primary w-full py-3">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
