'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    X,
    Lock,
    ArrowDownToLine,
    ArrowUpFromLine,
    Loader2,
    AlertCircle,
    CheckCircle,
    Eye,
    EyeOff
} from 'lucide-react';
import {
    getProgram,
    fetchInvestorVault,
    buildDepositTx,
    getInvestorVaultPDA,
    getGlobalVaultPDA,
    getAllowancePDA,
    getUserUSDCAccount as getAssociatedTokenAddress,
    USDC_MINT,
    INCO_LIGHTNING_ID,
    TOKEN_PROGRAM_ID,
    SystemProgram,
    BN
} from '@/lib/solana';
import { formatUSDC } from '@/lib/inco';
import { PrivacyBadge } from './PrivacyBadge';
import { bytesToHandle, decryptHandle } from '@/lib/encryption';

interface VaultModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({ isOpen, onClose }) => {
    const { connection } = useConnection();
    const { publicKey, connected, signTransaction, signAllTransactions, signMessage } = useWallet();

    const [balance, setBalance] = useState<bigint | null>(null);
    const [rawVault, setRawVault] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [amount, setAmount] = useState('');
    const [showBalance, setShowBalance] = useState(false);
    const [txStatus, setTxStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [txMessage, setTxMessage] = useState('');

    useEffect(() => {
        if (isOpen && connected && publicKey) {
            refreshBalance();
        }
    }, [isOpen, connected, publicKey]);

    const refreshBalance = async () => {
        if (!publicKey) return;
        setIsLoading(true);
        try {
            const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions });
            if (program) {
                const vault = await fetchInvestorVault(program, publicKey);
                setRawVault(vault);

                if (vault) {
                    const handleStr = bytesToHandle(vault.cusd.inner as number[]);
                    setTxMessage(`Handle: ${handleStr.slice(0, 12)}... (Encrypted)`);
                    setBalance(null); // Encrypted - needs decryption
                } else {
                    setBalance(BigInt(0));
                    setTxMessage('No vault found - deposit to create one');
                }
            }
        } catch (error) {
            console.error("Failed to fetch balance:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDecrypt = async () => {
        if (!rawVault || !publicKey || !signMessage) return;
        setIsLoading(true);
        setTxStatus('idle');
        try {
            const handleStr = bytesToHandle(rawVault.cusd.inner as number[]);

            // Use centralized decryption helper
            const decryptedValue = await decryptHandle(handleStr, {
                publicKey,
                signMessage,
            });

            if (decryptedValue !== null) {
                setBalance(decryptedValue);
                setShowBalance(true);
                setTxStatus('success');
                setTxMessage('Balance revealed via Inco Lightning');
            }
        } catch (error: any) {
            console.error("Decryption failed:", error);
            setTxStatus('error');
            setTxMessage(`Reveal failed: ${error.message || 'Check wallet authorization.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !publicKey) return;

        setIsActionLoading(true);
        setTxStatus('idle');

        try {
            const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions });
            if (!program) throw new Error("Program not initialized");

            const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
            const userUsdc = await getAssociatedTokenAddress(publicKey);
            const [vaultPDA] = getInvestorVaultPDA(publicKey);

            // For deposit, we also need the global vault's token account
            const [globalVaultConfig] = getGlobalVaultPDA();
            const configData = await (program.account as any).globalProgramVault.fetch(globalVaultConfig);
            const vaultTokenAccount = configData.usdcTokenAccount;

            // Manual allowance PDA for the handle creation (simplified for demo)
            const [allowancePDA] = getAllowancePDA(BigInt(Date.now()), publicKey);

            let tx;
            if (activeTab === 'deposit') {
                tx = await buildDepositTx(
                    program,
                    publicKey,
                    amountBigInt,
                    userUsdc,
                    vaultTokenAccount,
                    allowancePDA
                );
            } else {
                tx = await (program as any).methods
                    .withdraw(new BN(amountBigInt.toString()))
                    .accounts({
                        investor: publicKey,
                        investorVault: vaultPDA,
                        globalVault: globalVaultConfig,
                        investorTokenAccount: userUsdc,
                        vaultTokenAccount: vaultTokenAccount,
                        incoLightningProgram: INCO_LIGHTNING_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .remainingAccounts([
                        { pubkey: allowancePDA, isSigner: false, isWritable: true },
                        { pubkey: publicKey, isSigner: false, isWritable: false },
                    ]);
            }

            const signature = await tx.rpc();

            setTxStatus('success');
            setTxMessage(`Successfully ${activeTab}ed ${amount} cUSD. Sig: ${signature.slice(0, 8)}...`);
            setAmount('');
            refreshBalance();
        } catch (error: any) {
            console.error("Transaction failed:", error);
            setTxStatus('error');
            setTxMessage(`Transaction failed: ${error.message || 'Check your balance.'}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    if (!isOpen) return null;

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
                    <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bangers', cursive" }}>Your Vault</h2>
                        <PrivacyBadge />
                    </div>
                    <p className="text-secondary text-sm" style={{ fontFamily: "'Comic Neue', cursive" }}>
                        Manage your encrypted cUSD balance safely on-chain.
                    </p>
                </div>

                {/* Balance Section */}
                <div className="p-6 bg-surface border-3 border-foreground mb-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-secondary">Encrypted Balance</span>
                        <button
                            onClick={() => balance !== null && setShowBalance(!showBalance)}
                            className={`text-secondary hover:text-foreground ${balance === null ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            title={balance === null ? 'Decrypt balance first' : 'Toggle visibility'}
                        >
                            {showBalance && balance !== null ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="flex items-baseline gap-2">
                        {isLoading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        ) : (
                            <div className="flex flex-col gap-2 w-full">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold">
                                        {showBalance && balance !== null
                                            ? formatUSDC(balance).replace('$', '')
                                            : '••••••'}
                                    </span>
                                    <span className="text-secondary font-bold">cUSD</span>
                                </div>

                                {!balance && rawVault && (
                                    <button
                                        type="button"
                                        onClick={handleDecrypt}
                                        className="mt-2 text-[10px] font-bold uppercase tracking-widest text-accent hover:underline flex items-center gap-1"
                                    >
                                        <Lock className="w-3 h-3" />
                                        Request Confidential Decryption
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    {rawVault && (
                        <p className="text-[10px] text-accent mt-4 font-mono truncate opacity-60">
                            FHE HANDLE: {publicKey?.toBase58().slice(0, 8)}...
                        </p>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b-3 border-foreground mb-6">
                    <button
                        onClick={() => setActiveTab('deposit')}
                        className={`flex-1 py-3 font-bold uppercase tracking-wide transition-colors ${activeTab === 'deposit' ? 'bg-accent text-white' : 'hover:bg-surface'}`}
                    >
                        <ArrowDownToLine className="w-4 h-4 inline mr-2" />
                        Deposit
                    </button>
                    <button
                        onClick={() => setActiveTab('withdraw')}
                        className={`flex-1 py-3 font-bold uppercase tracking-wide transition-colors ${activeTab === 'withdraw' ? 'bg-accent text-white' : 'hover:bg-surface'}`}
                    >
                        <ArrowUpFromLine className="w-4 h-4 inline mr-2" />
                        Withdraw
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAction}>
                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wide mb-2">Amount (cUSD)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 border-3 border-foreground bg-background focus:outline-none focus:border-accent"
                                style={{ fontFamily: "'Comic Neue', cursive" }}
                            />
                        </div>
                    </div>

                    {txStatus !== 'idle' && (
                        <div className={`mb-6 p-3 border-3 flex items-center gap-2 ${txStatus === 'success' ? 'border-success bg-success/10' : 'border-error bg-error/10'}`}>
                            {txStatus === 'success' ? <CheckCircle className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-error" />}
                            <span className="text-sm font-bold">{txMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isActionLoading || !amount}
                        className="btn btn-primary w-full"
                    >
                        {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (activeTab === 'deposit' ? 'Deposit cUSD' : 'Withdraw cUSD')}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-secondary">
                    <Lock className="w-3 h-3" />
                    <span>cUSD transactions are encrypted and private using FHE</span>
                </div>
            </div>
        </div>
    );
};
