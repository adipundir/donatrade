'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { ShieldCheck, CheckCircle, Clock } from 'lucide-react';
import {
    getProgram,
    buildApproveCompanyTx,
    getCompanyPDA,
    Program,
    PLATFORM_ADMIN
} from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';

const ADMIN_ADDRESS = PLATFORM_ADMIN.toBase58();

export default function AdminPage() {
    const wallet = useWallet();
    const { connected, publicKey } = wallet;
    const { connection } = useConnection();

    const [isLoading, setIsLoading] = useState(false);
    const [pendingCompanies, setPendingCompanies] = useState<any[]>([]);
    const [txSuccess, setTxSuccess] = useState('');
    const [links, setLinks] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        if (connected && publicKey) {
            loadPendingCompanies();
        }
    }, [connected, publicKey]);

    const loadPendingCompanies = async () => {
        if (!publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;
        setIsLoading(true);
        try {
            const program = getProgram(connection, wallet);
            if (!program) return;

            // Mock Scan: Check IDs 1-20
            const foundPending = [];
            for (let i = 1; i <= 20; i++) {
                const [pda] = getCompanyPDA(i);
                try {
                    const data = await (program.account as any).companyAccount.fetch(pda);
                    // Filter for isApproved == false (but account exists)
                    // Note: If isApproved field doesn't exist on older accounts, we treat as true or skip.
                    // New implementation adds isApproved.
                    if (data && data.active && !data.isApproved) {
                        foundPending.push({
                            ...data,
                            companyId: i,
                            companyAccount: pda
                        });
                    }
                } catch (e) {
                    // Account not found
                }
            }
            setPendingCompanies(foundPending);

        } catch (e) {
            console.error("Error loading pending companies:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (companyId: number) => {
        if (!publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;

        setIsLoading(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program error");

            const pending = pendingCompanies.find(p => p.companyId === companyId);
            if (!pending) throw new Error("Company not found in pending list");

            const txBuilder = buildApproveCompanyTx(
                program,
                publicKey, // platformAdmin
                pending.companyAdmin,
                companyId
            );

            console.log("[DonaTrade] Approving company via wallet.sendTransaction()...");
            const transaction = await txBuilder.transaction();
            const signature = await wallet.sendTransaction(transaction, connection);

            console.log("[DonaTrade] Approval submitted, signature:", signature);
            await connection.confirmTransaction(signature, 'confirmed');

            setTxSuccess(`APPROVED Company #${companyId}! Sig: ${signature.slice(0, 8)}...`);
            setTimeout(() => setTxSuccess(''), 5000);

            // Refresh list
            setTimeout(loadPendingCompanies, 1000);
        } catch (error: any) {
            console.error("Approval failed:", error);
            setTxSuccess(`ERROR: ${error.message || 'Transaction failed.'}`);
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
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 hero-comic">
            <div className="container">
                <h1 className="text-4xl mb-2">Admin Console</h1>
                <p className="text-secondary mb-8" style={{ fontFamily: "'Comic Neue', cursive" }}>
                    Manage company applications and platform settings.
                </p>

                {txSuccess && (
                    <div className="p-4 border-3 border-accent bg-accent-light mb-6">
                        <p className="font-bold" style={{ fontFamily: "'Bangers', cursive" }}>{txSuccess}</p>
                    </div>
                )}

                <div className="card">
                    <h2 className="text-2xl mb-4 flex items-center gap-2">
                        <Clock className="w-6 h-6" /> Pending Applications
                    </h2>

                    {isLoading && pendingCompanies.length === 0 ? (
                        <p className="text-center py-8 opacity-50">Scanning for applications...</p>
                    ) : pendingCompanies.length === 0 ? (
                        <p className="text-center py-8 opacity-50">No pending applications found.</p>
                    ) : (
                        <div className="space-y-4">
                            {pendingCompanies.map((company) => (
                                <div key={company.companyId} className="flex items-center justify-between p-4 border-b border-border/20 last:border-0 hover:bg-white/5 transition-colors">
                                    <div>
                                        <h3 className="font-bold text-lg">Company #{company.companyId}</h3>
                                        <div className="text-sm text-secondary">
                                            Admin: <span className="font-mono">{company.companyAdmin.toBase58().slice(0, 6)}...</span>
                                        </div>
                                        {company.legalAgreementLink && (
                                            <a href={company.legalAgreementLink} target="_blank" className="text-xs text-accent underline">
                                                View Legal Agreement
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleApprove(company.companyId)}
                                            className="btn btn-primary btn-sm flex items-center gap-2 justify-center py-4 h-auto"
                                            disabled={isLoading}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve Company
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
