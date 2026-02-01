'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowLeft, Settings, TrendingUp, DollarSign, ToggleRight, Check, Save } from 'lucide-react';
import { getProgram, buildUpdateOfferingTx, buildWithdrawCompanyFundsTx, getCompanyPDA, fetchCompanyInvestors } from '@/lib/solana';

/**
 * Manage Companies Page - Dashboard for company admins.
 */
export default function ManageCompaniesPage() {
    const wallet = useWallet();
    const { connected, publicKey } = wallet;
    const { connection } = useConnection();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [companies, setCompanies] = useState<any[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [txSuccess, setTxSuccess] = useState('');
    const [investors, setInvestors] = useState<any[]>([]);
    const [loadingInvestors, setLoadingInvestors] = useState(false);
    const [form, setForm] = useState({
        newPrice: '',
        addShares: '',
        active: true,
        offeringUrl: '',
        legalAgreementLink: '',
    });

    useEffect(() => {
        if (connected && publicKey) {
            loadUserCompanies();
        }
    }, [connected, publicKey]);

    const loadUserCompanies = async () => {
        if (!publicKey) return;
        setIsLoading(true);
        try {
            const program = getProgram(connection, wallet);
            if (!program) return;

            // Fetch accounts where companyAdmin == publicKey
            // Offset 16 = 8 (discriminator) + 8 (companyId)
            const accounts = await connection.getProgramAccounts(program.programId, {
                filters: [
                    {
                        memcmp: {
                            offset: 16,
                            bytes: publicKey.toBase58()
                        }
                    }
                ]
            });

            const userOwned: any[] = [];
            for (const acc of accounts) {
                try {
                    const data = await (program.account as any).companyAccount.fetch(acc.pubkey);
                    userOwned.push({
                        ...data,
                        name: `Company #${data.companyId}`,
                        id: Number(data.companyId)
                    });
                } catch (e) {
                    console.warn(`[DonaTrade] Failed to decode owned company ${acc.pubkey.toBase58()}`, e);
                }
            }
            setCompanies(userOwned);
        } catch (error) {
            console.error("Failed to load companies:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey || !selectedCompany || !wallet.signTransaction || !wallet.signAllTransactions) return;

        setIsLoading(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program not initialized");

            const newPrice = BigInt(parseFloat(form.newPrice) * 1_000_000); // 6 decimals
            const addShares = BigInt(form.addShares || 0);

            const tx = await buildUpdateOfferingTx(
                program,
                publicKey, // company_admin
                selectedCompany.companyId,
                newPrice,
                addShares,
                form.active,
                form.offeringUrl || null
            );

            const transaction = await tx.transaction();
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            setTxSuccess(`BAM! Offering updated successfully! Sig: ${signature.slice(0, 8)}...`);
            loadUserCompanies();
            setTimeout(() => setTxSuccess(''), 5000);
        } catch (error: any) {
            console.error("Update failed:", error);
            setTxSuccess(`ERROR: ${error.message || 'Transaction failed.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdraw = async (amount: string) => {
        if (!publicKey || !selectedCompany || !wallet.signTransaction || !wallet.signAllTransactions) return;

        setIsLoading(true);
        setTxSuccess('');
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program not initialized");

            const withdrawAmount = BigInt(parseFloat(amount) * 1_000_000); // 6 decimals

            const tx = await buildWithdrawCompanyFundsTx(
                program,
                publicKey,
                BigInt(selectedCompany.companyId),
                withdrawAmount
            );

            const transaction = await tx.transaction();
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            setTxSuccess(`CHA-CHING! Withdrew ${amount} USDC! Sig: ${signature.slice(0, 8)}...`);
            setTimeout(() => setTxSuccess(''), 5000);
        } catch (error: any) {
            console.error("Withdraw failed:", error);
            setTxSuccess(`ERROR: ${error.message || 'Transaction failed.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCompanyInvestors = async (companyId: number) => {
        setLoadingInvestors(true);
        try {
            const list = await fetchCompanyInvestors(connection, companyId);
            setInvestors(list);
        } catch (e) {
            console.error("Error loading investors", e);
        } finally {
            setLoadingInvestors(false);
        }
    };

    const selectCompany = (company: any) => {
        setSelectedCompany(company);
        // We no longer need bytesToHex since we're using a string link
        // const bytesToHex = (bytes: number[] | Uint8Array) => {
        //     if (!bytes || bytes.length === 0) return '';
        //     return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        // };

        setForm({
            newPrice: (Number(company.pricePerShare) / 1_000_000).toString(),
            addShares: '0',
            active: company.active,
            offeringUrl: company.offeringUrl || '',
            legalAgreementLink: company.legalAgreementLink || '',
        });

        // Load investors
        loadCompanyInvestors(company.companyId);
    };

    if (!connected) {
        return (
            <div className="min-h-screen pt-24 hero-comic">
                <div className="container">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <Settings className="w-16 h-16 mb-4 text-foreground opacity-20" />
                        <h1 className="text-3xl mb-2">Connect to Manage</h1>
                        <button onClick={() => router.push('/')} className="btn btn-primary">
                            Go to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 hero-comic">
            <div className="container">
                <div className="flex items-center gap-2 mb-4">
                    <Link href="/companies" className="text-secondary hover:text-foreground transition-colors">
                        Companies
                    </Link>
                    <span className="text-secondary">/</span>
                    <span>Manage</span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl mb-2 tracking-wider">Admin Dashboard</h1>
                        <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            Manage your private company offerings.
                        </p>
                    </div>
                    <Link href="/companies/register" className="btn btn-primary">
                        <Building2 className="w-4 h-4 mr-2" />
                        New Company
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Company List */}
                    <div className="lg:col-span-1 space-y-4">
                        <h2 className="text-xl uppercase tracking-wider font-bold" style={{ fontFamily: "'Bangers', cursive" }}>Your Companies</h2>

                        {isLoading && companies.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-black">
                                <p className="animate-pulse">LOADING...</p>
                            </div>
                        ) : companies.length === 0 ? (
                            <div className="card text-center py-8">
                                <p className="text-secondary mb-4" style={{ fontFamily: "'Comic Neue', cursive" }}>No companies found. Are you an admin?</p>
                                <Link href="/companies/register" className="btn btn-secondary text-sm">Register First</Link>
                            </div>
                        ) : (
                            companies.map((company) => (
                                <button
                                    key={company.id}
                                    onClick={() => selectCompany(company)}
                                    className={`w-full text-left card transition-all ${selectedCompany?.id === company.id ? 'border-accent bg-accent-light translate-x-1 shadow-none' : 'hover:border-accent'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold">{company.name || `Company #${company.id}`}</h3>
                                        <div className="flex items-center gap-1">
                                            {!company.isApproved && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-warning text-black border border-black">
                                                    Pending
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border border-black ${company.active ? 'bg-accent text-white' : 'bg-surface text-secondary'}`}>
                                                {company.active ? 'Active' : 'Paused'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-secondary mt-1">ID: {company.companyId.toString()}</p>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Management Area */}
                    <div className="lg:col-span-2">
                        {selectedCompany ? (
                            <div className="card animate-pop">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl">Manage Offering: {selectedCompany.name}</h2>
                                    <button onClick={() => setSelectedCompany(null)} className="text-secondary hover:text-foreground">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                </div>

                                {txSuccess && (
                                    <div className={`p-4 border-3 mb-6 ${txSuccess.startsWith('ERROR') ? 'border-warning bg-warning-light' : 'border-accent bg-accent-light'}`}>
                                        <p className="font-bold" style={{ fontFamily: "'Bangers', cursive" }}>{txSuccess}</p>
                                    </div>
                                )}

                                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                                    <div className="p-4 border-2 border-black">
                                        <p className="text-[10px] uppercase font-bold text-secondary mb-1">Current Price</p>
                                        <p className="text-xl font-mono">${(Number(selectedCompany.pricePerShare) / 1_000_000).toFixed(2)}</p>
                                    </div>
                                    <div className="p-4 border-2 border-black">
                                        <p className="text-[10px] uppercase font-bold text-secondary mb-1">Shares Available</p>
                                        <p className="text-xl font-mono">{selectedCompany.sharesAvailable.toString()}</p>
                                    </div>
                                    <div className="p-4 border-2 border-black">
                                        <p className="text-[10px] uppercase font-bold text-secondary mb-1">Capital Raised</p>
                                        <p className="text-xl font-mono text-accent">ENCRYPTED</p>
                                        <button
                                            onClick={() => {
                                                const amount = prompt("Enter amount to withdraw (USDC):");
                                                if (amount) handleWithdraw(amount);
                                            }}
                                            className="text-xs text-accent underline hover:text-accent-dark mt-1"
                                        >
                                            WITHDRAW
                                        </button>
                                    </div>

                                    <div className="mt-8 mb-8">
                                        <h3 className="text-xl uppercase font-bold mb-4 border-b-2 border-black pb-2 tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>
                                            Investors & Cap Table
                                        </h3>
                                        {loadingInvestors ? (
                                            <p className="text-center opacity-50 py-4">Loading investors...</p>
                                        ) : investors.length === 0 ? (
                                            <p className="text-center text-secondary py-4">No investors found yet.</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-black/10">
                                                            <th className="pb-2 text-xs uppercase font-bold text-secondary">Investor Address</th>
                                                            <th className="pb-2 text-xs uppercase font-bold text-secondary text-right">Shares Owned</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {investors.map((inv, i) => (
                                                            <tr key={i} className="border-b border-black/5 last:border-0 hover:bg-black/5">
                                                                <td className="py-2 font-mono text-sm">{inv.owner.toBase58().slice(0, 8)}...</td>
                                                                <td className="py-2 font-mono text-sm text-right text-accent">ENCRYPTED</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <form onSubmit={handleUpdate} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold uppercase mb-2 tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>
                                                <DollarSign className="w-4 h-4 inline mr-1" />
                                                New Price per Share (USDC)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={form.newPrice}
                                                onChange={(e) => setForm({ ...form, newPrice: e.target.value })}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold uppercase mb-2 tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>
                                                <TrendingUp className="w-4 h-4 inline mr-1" />
                                                Issue More Shares (Optional)
                                            </label>
                                            <input
                                                type="number"
                                                value={form.addShares}
                                                onChange={(e) => setForm({ ...form, addShares: e.target.value })}
                                                placeholder="0"
                                                className="input"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold uppercase mb-2 tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>
                                                Update Legal Link
                                            </label>
                                            <input
                                                type="text"
                                                value={form.legalAgreementLink}
                                                onChange={(e) => setForm({ ...form, legalAgreementLink: e.target.value })}
                                                placeholder="https://..."
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold uppercase mb-2 tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>
                                                Offering URL
                                            </label>
                                            <input
                                                type="text"
                                                value={form.offeringUrl}
                                                onChange={(e) => setForm({ ...form, offeringUrl: e.target.value })}
                                                placeholder="https://..."
                                                className="input"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border-2 border-black bg-surface">
                                        <div>
                                            <h4 className="font-bold uppercase text-sm tracking-wider">Offering Status</h4>
                                            <p className="text-xs text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                                                Toggle whether investors can purchase new shares.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, active: !form.active })}
                                            className={`p-2 border-3 ${form.active ? 'border-accent bg-accent-light text-accent' : 'border-black bg-white text-secondary'}`}
                                        >
                                            <ToggleRight className={`w-8 h-8 transition-transform ${form.active ? '' : 'rotate-180 opacity-30'}`} />
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn btn-primary w-full py-4 text-lg"
                                    >
                                        {isLoading ? 'UPDATING...' : 'SAVE CHANGES'}
                                        <Save className="w-5 h-5 ml-2" />
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-12 border-4 border-black border-dashed opacity-30">
                                <Building2 className="w-20 h-20 mb-4" />
                                <h3 className="text-2xl uppercase font-bold" style={{ fontFamily: "'Bangers', cursive" }}>Select a Company</h3>
                                <p style={{ fontFamily: "'Comic Neue', cursive" }}>Choose a company from the list to manage its offering.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}
