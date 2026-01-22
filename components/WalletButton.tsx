'use client';

import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut } from 'lucide-react';

/**
 * Custom wallet connection button using Phantom wallet adapter.
 * Shows connection status and truncated address when connected.
 */
export const WalletButton: FC = () => {
    const { connected, publicKey, disconnect } = useWallet();

    // Truncate address for display
    const truncatedAddress = publicKey
        ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
        : '';

    if (connected && publicKey) {
        return (
            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-surface-border">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm text-secondary font-mono">{truncatedAddress}</span>
                </div>
                <button
                    onClick={() => disconnect()}
                    className="btn btn-ghost flex items-center gap-2"
                    title="Disconnect wallet"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Disconnect</span>
                </button>
            </div>
        );
    }

    return (
        <WalletMultiButton className="btn btn-primary">
            <Wallet className="w-4 h-4" />
            Connect Wallet
        </WalletMultiButton>
    );
};
