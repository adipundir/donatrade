import { FC, useState } from 'react';
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { bytesToHandle, decryptHandle } from '@/lib/encryption';
import { getProgram, buildAuthorizeDecryptionTx, getAllowancePDA } from '@/lib/solana';

interface SharesDisplayProps {
    encryptedShares?: any; // FHE handle (bytes, BN, or object)
    decryptedValue?: number | null; // Pre-decrypted value (if any)
    label?: string;
    compact?: boolean;
}

/**
 * Comic-style shares display with real confidential reveal via TEE co-processor.
 */
export const SharesDisplay: FC<SharesDisplayProps> = ({
    encryptedShares,
    decryptedValue,
    label = 'Your Shares',
    compact = false,
}) => {
    const { connection } = useConnection();
    const { publicKey, signMessage, signTransaction, signAllTransactions } = useWallet();
    const [isRevealed, setIsRevealed] = useState(decryptedValue !== null && decryptedValue !== undefined);
    const [revealedValue, setRevealedValue] = useState<bigint | null>(
        decryptedValue !== null && decryptedValue !== undefined ? BigInt(decryptedValue) : null
    );
    const [isLoading, setIsLoading] = useState(false);

    const handleToggleReveal = async () => {
        if (isRevealed) {
            setIsRevealed(false);
            return;
        }

        // If we already have the value, just show it
        if (revealedValue !== null) {
            setIsRevealed(true);
            return;
        }

        // Otherwise, perform real decryption reveal
        if (!encryptedShares || !publicKey || !signMessage) {
            console.warn("[SharesDisplay] Cannot decrypt: Missing data or wallet connection.");
            return;
        }

        setIsLoading(true);
        try {
            const handleStr = bytesToHandle(encryptedShares);
            const handle = BigInt(handleStr);

            const [allowanceAccount] = getAllowancePDA(handle, publicKey);
            const accountInfo = await connection.getAccountInfo(allowanceAccount);

            if (!accountInfo) {
                const program = getProgram(connection, { publicKey, signTransaction, signAllTransactions }) as any;
                if (program) {
                    const authTx = await buildAuthorizeDecryptionTx(program, publicKey, handle);
                    await authTx.rpc();
                }
            }

            // Actual decryption
            const value = await decryptHandle(handleStr, {
                publicKey,
                signMessage,
            });

            if (value !== null) {
                setRevealedValue(value);
                setIsRevealed(true);
            }
        } catch (error) {
            console.error("[SharesDisplay] Reveal failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const displayValue = revealedValue !== null ? revealedValue.toString() : '??????';

    if (compact) {
        return (
            <div className="p-3 border-2 border-black bg-surface">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">{label}</p>
                <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        ) : isRevealed ? (
                            displayValue
                        ) : (
                            '🔒 Hidden'
                        )}
                    </span>
                    <button
                        onClick={handleToggleReveal}
                        disabled={isLoading}
                        className="p-1 hover:bg-background rounded transition-colors disabled:opacity-50"
                        title={isRevealed ? 'Hide value' : 'Reveal value'}
                    >
                        {isRevealed ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-4 border-3 border-foreground bg-background">
            <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-1" style={{ fontFamily: "'Bangers', cursive" }}>{label}</p>
                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    ) : isRevealed ? (
                        <span className="shares-revealed text-4xl font-bold tracking-[0.05em]" style={{ fontFamily: "'Bangers', cursive" }}>
                            {displayValue}
                        </span>
                    ) : (
                        <span className="shares-hidden text-2xl flex items-center gap-2 text-muted" style={{ fontFamily: "'Bangers', cursive" }}>
                            <Lock className="w-5 h-5" />
                            ??????
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted mt-1" style={{ fontFamily: "'Comic Neue', cursive" }}>
                    {isLoading ? 'Decrypting via TEE...' : isRevealed ? 'Only visible to you!' : 'Encrypted for safety'}
                </p>
            </div>

            <button
                onClick={handleToggleReveal}
                disabled={isLoading}
                className="btn btn-secondary px-6 flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-wider"
                style={{ fontFamily: "'Bangers', cursive" }}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRevealed ? (
                    <>
                        <EyeOff className="w-4 h-4" />
                        Hide
                    </>
                ) : (
                    <>
                        <Eye className="w-4 h-4" />
                        Reveal Shares
                    </>
                )}
            </button>
        </div>
    );
};
