'use client';

import { FC, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface SharesDisplayProps {
    encryptedShares?: number[];
    decryptedValue?: number;
    label?: string;
}

/**
 * Comic-style shares display with hide/reveal toggle.
 */
export const SharesDisplay: FC<SharesDisplayProps> = ({
    encryptedShares,
    decryptedValue,
    label = 'Your Shares',
}) => {
    const [isRevealed, setIsRevealed] = useState(false);

    // Mock decrypt function
    const mockDecrypt = (encrypted: number[]): number => {
        const MOCK_KEY = [0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE];
        if (encrypted.length < 8) return 0;
        const bytes = new Uint8Array(8);
        for (let i = 0; i < 8; i++) {
            bytes[i] = encrypted[i] ^ MOCK_KEY[i % MOCK_KEY.length];
        }
        const view = new DataView(bytes.buffer);
        return Number(view.getBigUint64(0, true));
    };

    const actualValue = decryptedValue ?? (encryptedShares ? mockDecrypt(encryptedShares) : 0);

    return (
        <div className="flex items-center justify-between p-4 border-3 border-foreground bg-background">
            <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-1" style={{ fontFamily: "'Bangers', cursive" }}>{label}</p>
                <div className="flex items-center gap-2">
                    {isRevealed ? (
                        <span className="shares-revealed">
                            {actualValue.toLocaleString()}
                        </span>
                    ) : (
                        <span className="shares-hidden text-2xl flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            ??????
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted mt-1" style={{ fontFamily: "'Comic Neue', cursive" }}>
                    {isRevealed ? 'Only visible to you!' : 'Click eye to reveal!'}
                </p>
            </div>

            <button
                onClick={() => setIsRevealed(!isRevealed)}
                className="btn btn-secondary p-3"
                title={isRevealed ? 'Hide shares' : 'Reveal shares'}
            >
                {isRevealed ? (
                    <EyeOff className="w-5 h-5" />
                ) : (
                    <Eye className="w-5 h-5" />
                )}
            </button>
        </div>
    );
};
