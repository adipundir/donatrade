'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID as SPL_ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
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
    const wallet = useWallet();
    const { publicKey, connected, signTransaction, signAllTransactions, signMessage } = wallet;

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
            const program = getProgram(connection, wallet);
            if (program) {
                const vault = await fetchInvestorVault(program, publicKey);
                setRawVault(vault);

                if (vault) {
                    setBalance(null); // Encrypted - needs decryption
                } else {
                    setBalance(BigInt(0));
                }
                setShowBalance(false); // Always hide by default as requested
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
            const program = getProgram(connection, wallet) as any;
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
                    handle,
                    publicKey
                );
                const transaction = await authTxBuilder.transaction();
                const authTxSig = await wallet.sendTransaction(transaction, connection);
                // Wait for confirmation to ensure the TEE can see the new allowance account
                await connection.confirmTransaction(authTxSig, 'confirmed');
                setTxMessage(`Access granted! Proceeding with decryption...`);
            }

            // Actual decryption
            const decryptedValue = await decryptHandle(handleStr, {
                publicKey,
                signMessage
            });

            if (decryptedValue !== null) {
                setBalance(decryptedValue);
                setShowBalance(true);
                setTxStatus('idle'); // Clear any status
            } else {
                setTxStatus('error');
                setTxMessage('Decryption failed. Please try again.');
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
            const program = getProgram(connection, wallet) as any;
            if (!program) throw new Error("Program not initialized");

            const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
            const userUsdc = await getAssociatedTokenAddress(publicKey);
            const [vaultPDA] = getInvestorVaultPDA(publicKey);

            // For platform operations, we need the global vault config
            const [globalVaultConfig] = getGlobalVaultPDA();

            // Derive ATA for the Global Vault PDA
            const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
                [globalVaultConfig.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), USDC_MINT.toBuffer()],
                SPL_ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const tx = new Transaction();

            // 1. Check if platform initialization is needed
            const globalVaultInfo = await connection.getAccountInfo(globalVaultConfig);
            if (!globalVaultInfo) {
                console.log("[DonaTrade] Automating platform initialization...");

                // Add ATA creation if missing
                const vaultATAInfo = await connection.getAccountInfo(vaultTokenAccount);
                if (!vaultATAInfo) {
                    tx.add(createAssociatedTokenAccountInstruction(
                        publicKey, // payer
                        vaultTokenAccount,
                        globalVaultConfig, // owner
                        USDC_MINT
                    ));
                }

                // Add program initialization
                const initInstr = await program.methods
                    .initializeGlobalVault()
                    .accounts({
                        admin: publicKey,
                        globalVault: globalVaultConfig,
                        usdcTokenAccount: vaultTokenAccount,
                        systemProgram: SystemProgram.programId,
                    })
                    .instruction();
                tx.add(initInstr);
            }

            // 2. Add the actual action (Deposit or Withdraw)
            if (activeTab === 'deposit') {
                const depositInstr = await buildDepositTx(
                    program,
                    publicKey,
                    vaultPDA,
                    userUsdc,
                    vaultTokenAccount,
                    amountBigInt
                ).instruction();
                tx.add(depositInstr);
            } else {
                const withdrawInstr = await (program.methods as any).withdraw(new BN(amountBigInt.toString()))
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
                    .instruction();
                tx.add(withdrawInstr);
            }

            try {
                const signature = await wallet.sendTransaction(tx, connection);
                console.log("[DonaTrade] Transaction submitted:", signature);
                await connection.confirmTransaction(signature, 'confirmed');

                setTxSignature(signature);
                setTxStatus('success');
                setTxMessage(`Transaction confirmed!`);
                setAmount('');
                refreshBalance();
            } catch (txError: any) {
                console.error("[DonaTrade] Transaction failed detailed:", txError);
                if (txError.logs) {
                    console.error("[DonaTrade] Transaction logs:", txError.logs);
                }
                throw txError; // Re-throw to be caught by outer handler
            }
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

                        {/* Reveal/Hide Toggle - Show for everyone to support "Reveal" action */}
                        <button
                            type="button"
                            onClick={showBalance ? () => setShowBalance(false) : (rawVault ? handleDecrypt : () => setShowBalance(true))}
                            disabled={isLoading}
                            className="px-4 py-2 border-3 border-foreground bg-background hover:bg-surface font-bold uppercase tracking-widest text-[11px] flex items-center gap-2 transition-all active:translate-y-[2px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none whitespace-nowrap"
                            style={{ fontFamily: "'Bangers', cursive" }}
                        >
                            {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : showBalance ? (
                                <>
                                    <EyeOff className="w-3 h-3" />
                                    Hide Balance
                                </>
                            ) : (
                                <>
                                    <Eye className="w-3 h-3" />
                                    Reveal Balance
                                </>
                            )}
                        </button>
                    </div>

                    {/* Verification Section */}
                    {publicKey && (
                        <div className="mt-4 pt-4 border-t-2 border-foreground/10 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase text-secondary">Vault Address (PDA)</span>
                                <span className="text-[10px] font-mono text-foreground/70">
                                    {getInvestorVaultPDA(publicKey)[0].toBase58().slice(0, 12)}...
                                </span>
                            </div>
                            <a
                                href={`https://explorer.solana.com/address/${getInvestorVaultPDA(publicKey)[0].toBase58()}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-bold uppercase text-accent hover:underline flex items-center gap-1"
                            >
                                <Eye className="w-3 h-3" />
                                Verify on Explorer
                            </a>
                        </div>
                    )}
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
