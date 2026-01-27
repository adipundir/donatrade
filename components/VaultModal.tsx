'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
    X,
    Lock,
    ArrowDownToLine,
    ArrowUpFromLine,
    Loader2,
    AlertCircle,
    CheckCircle,
    Eye,
    EyeOff,
    Shield
} from 'lucide-react';
import {
    getProgram,
    fetchInvestorVault,
    buildDepositTx,
    buildAuthorizeDecryptionTx,
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
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [needsInit, setNeedsInit] = useState(false);

    useEffect(() => {
        if (isOpen && connected && publicKey) {
            refreshBalance();
        }
    }, [isOpen, connected, publicKey]);
    const handleTabChange = (tab: 'deposit' | 'withdraw') => {
        setActiveTab(tab);
        setTxStatus('idle');
        setTxMessage('');
        setTxSignature(null);
    };

    const refreshBalance = async () => {
        if (!publicKey) return;
        // Silent fetch
        try {
            const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions });
            if (program) {
                const vault = await fetchInvestorVault(program, publicKey);
                setRawVault(vault);

                if (vault) {
                    setBalance(null); // Encrypted - needs decryption
                } else {
                    setBalance(BigInt(0));
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
            const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions }) as any;
            if (!program) throw new Error("Program not initialized");

            const handleStr = bytesToHandle(rawVault.cusd);
            const handle = BigInt(handleStr);

            const [allowanceAccount] = getAllowancePDA(handle, publicKey);
            const accountInfo = await connection.getAccountInfo(allowanceAccount);

            if (!accountInfo) {
                setTxMessage("Authorizing decryption access...");
                const authTxBuilder = await buildAuthorizeDecryptionTx(
                    program,
                    publicKey,
                    handle
                );
                const authTxSig = await authTxBuilder.rpc();
                setTxSignature(authTxSig);
                setTxStatus('success');
                setTxMessage(`Access granted!`);
            }

            // Actual decryption
            const decryptedValue = await decryptHandle(handleStr, {
                publicKey,
                signMessage
            });

            if (decryptedValue !== null) {
                setBalance(decryptedValue);
                setShowBalance(true);
                setTxStatus('idle'); // Clear any status instead of showing success
            } else {
                setTxStatus('error');
                setTxMessage('Decryption failed even after authorization. Please try again.');
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
        setTxMessage('');
        setTxSignature(null);

        try {
            const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions }) as any;
            if (!program) throw new Error("Program not initialized");

            const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
            const userUsdc = await getAssociatedTokenAddress(publicKey);
            const [vaultPDA] = getInvestorVaultPDA(publicKey);

            // For deposit, we also need the global vault's token account
            const [globalVaultConfig] = getGlobalVaultPDA();
            let vaultTokenAccount;

            try {
                // Check if global vault exists
                const configData = await (program.account as any).globalProgramVault.fetch(globalVaultConfig);
                vaultTokenAccount = configData.usdcTokenAccount;
            } catch (e: any) {
                console.warn("Global vault info fetch failed:", e);
                setNeedsInit(true);
                throw new Error("Platform setup required. Please use the 'Initialize Platform' button below.");
            }

            // Deterministic handle based on the vault's cUSD data
            // This assumes rawVault is up-to-date or we fetch it again
            const currentRawVault = await fetchInvestorVault(program, publicKey);
            if (!currentRawVault && activeTab === 'withdraw') {
                throw new Error("No vault found to withdraw from.");
            }
            const handleStr = currentRawVault ? bytesToHandle(currentRawVault.cusd) : '0'; // If no vault, handle is 0 for deposit init
            const handleId = BigInt(handleStr);
            const [allowancePDA] = getAllowancePDA(handleId, publicKey);

            let tx;
            if (activeTab === 'deposit') {
                tx = await buildDepositTx(
                    program,
                    publicKey,
                    vaultPDA,
                    userUsdc,
                    vaultTokenAccount,
                    Math.floor(parseFloat(amount) * 1_000_000)
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
                    });
            }



            const signature = await tx.rpc();

            setTxSignature(signature);
            setTxStatus('success');
            setTxMessage(`Transaction confirmed!`);
            setAmount('');
            refreshBalance();
        } catch (error: any) {
            console.error("Transaction failed:", error);
            setTxStatus('error');
            const msg = error.message || 'Check your balance.';
            setTxMessage(`Transaction failed: ${msg}`);

            if (msg.includes("Platform setup required")) {
                setNeedsInit(true);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleInitialize = async () => {
        if (!publicKey) return;
        setIsActionLoading(true);
        try {
            const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions }) as any;
            if (!program) throw new Error("Program not initialized");

            const [globalVaultConfig] = getGlobalVaultPDA();
            const vaultTokenAccount = await getAssociatedTokenAddress(publicKey); // Use admin/user ATA as placeholder if needed, but really we need a PDA ATA. 
            // Actually, the vault token account should be owned by the PDA.
            // We can create it in the same tx or separate.
            // Client side creation of PDA ATA is tricky without multiple signers if needed.
            // But 'createAssociatedTokenAccountInstruction' works if we pay.

            // 1. Derive ATA for the Global Vault PDA
            // Associated Token Program ID
            const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

            const [realVaultTokenAccount] = PublicKey.findProgramAddressSync(
                [globalVaultConfig.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), USDC_MINT.toBuffer()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            console.log("Initializing Global Vault with ATA:", realVaultTokenAccount.toBase58());

            const tx = await program.methods
                .initializeGlobalVault()
                .accounts({
                    admin: publicKey,
                    globalVault: globalVaultConfig,
                    usdcTokenAccount: realVaultTokenAccount,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setTxSignature(tx);
            setTxStatus('success');
            setTxMessage("Platform Initialized! You can now deposit.");
            setNeedsInit(false);
        } catch (e: any) {
            console.error("Init failed:", e);
            setTxMessage("Init failed: " + e.message);
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
                        Manage your confidential balance safely on-chain.
                    </p>
                </div>

                {/* Balance Section */}
                <div className="p-6 bg-surface border-3 border-foreground mb-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-secondary">Confidential Balance</span>
                        <PrivacyBadge />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-2">
                            {isLoading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                            ) : (
                                <>
                                    <span className="text-5xl font-bold tracking-[0.05em]" style={{ fontFamily: "'Bangers', cursive" }}>
                                        {showBalance && balance !== null
                                            ? formatUSDC(balance).replace('$', '')
                                            : '••••••'}
                                    </span>
                                    <span className="text-secondary font-bold text-sm">cUSD</span>
                                </>
                            )}
                        </div>

                        {rawVault && (
                            <button
                                type="button"
                                onClick={showBalance ? () => setShowBalance(false) : handleDecrypt}
                                disabled={isLoading}
                                className="px-4 py-2 border-3 border-foreground bg-background hover:bg-surface font-bold uppercase tracking-widest text-[11px] flex items-center gap-2 transition-all active:translate-y-[2px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none whitespace-nowrap"
                                style={{ fontFamily: "'Bangers', cursive" }}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : showBalance ? (
                                    <>
                                        <EyeOff className="w-3 h-3" />
                                        Hide
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-3 h-3" />
                                        Reveal
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b-3 border-foreground mb-6">
                    <button
                        onClick={() => handleTabChange('deposit')}
                        className={`flex-1 py-3 font-bold uppercase tracking-wide transition-colors ${activeTab === 'deposit' ? 'bg-accent text-white' : 'hover:bg-surface'}`}
                    >
                        <ArrowDownToLine className="w-4 h-4 inline mr-2" />
                        Deposit
                    </button>
                    <button
                        onClick={() => handleTabChange('withdraw')}
                        className={`flex-1 py-3 font-bold uppercase tracking-wide transition-colors ${activeTab === 'withdraw' ? 'bg-accent text-white' : 'hover:bg-surface'}`}
                    >
                        <ArrowUpFromLine className="w-4 h-4 inline mr-2" />
                        Withdraw
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAction}>
                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wide mb-2">Amount (USDC)</label>
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
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">{txMessage}</span>
                                {txStatus === 'success' && txSignature && (
                                    <a
                                        href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-accent hover:underline break-all uppercase tracking-tighter"
                                    >
                                        View on Explorer: {txSignature.slice(0, 12)}...
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {needsInit && (
                        <button
                            type="button"
                            onClick={handleInitialize}
                            className="btn btn-secondary w-full mb-4"
                            disabled={isActionLoading}
                        >
                            {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "⚠️ Initialize Platform (One-Time)"}
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={isActionLoading || !amount}
                        className="btn btn-primary w-full"
                    >
                        {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (activeTab === 'deposit' ? 'Deposit USDC' : 'Withdraw USDC')}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-secondary">
                    <Shield className="w-3 h-3" />
                    <span>Balances only visible to you. Powered by Inco Lightning.</span>
                </div>
            </div>
        </div>
    );
};
