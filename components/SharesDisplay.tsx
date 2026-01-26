import { FC, useState } from 'react';
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { bytesToHandle, decryptHandle } from '@/lib/encryption';

interface SharesDisplayProps {
    encryptedShares?: number[]; // FHE handle bytes
    decryptedValue?: number | null; // Pre-decrypted value (if any)
    label?: string;
    compact?: boolean;
}

/**
 * Comic-style shares display with real FHE reveal via Inco Lightning.
 */
export const SharesDisplay: FC<SharesDisplayProps> = ({
    encryptedShares,
    decryptedValue,
    label = 'Your Shares',
    compact = false,
}) => {
    const { publicKey, signMessage } = useWallet();
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
                        <span className="shares-revealed text-2xl font-bold">
                            {displayValue}
                        </span>
                    ) : (
                        <span className="shares-hidden text-2xl flex items-center gap-2 text-muted">
                            <Lock className="w-5 h-5" />
                            ??????
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted mt-1" style={{ fontFamily: "'Comic Neue', cursive" }}>
                    {isLoading ? 'Decrypting via Inco...' : isRevealed ? 'Only visible to you!' : 'Click eye to reveal!'}
                </p>
            </div>

            <button
                onClick={handleToggleReveal}
                disabled={isLoading}
                className="btn btn-secondary p-3 disabled:opacity-50"
                title={isRevealed ? 'Hide shares' : 'Reveal shares'}
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isRevealed ? (
                    <EyeOff className="w-5 h-5" />
                ) : (
                    <Eye className="w-5 h-5" />
                )}
            </button>
        </div>
    );
};
