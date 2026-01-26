'use client';

import React, { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut } from 'lucide-react';

/**
 * Custom wallet connection button using Phantom wallet adapter.
 * Shows connection status and truncated address when connected.
 */
export const WalletButton: FC = () => {
    const { connected, publicKey, disconnect } = useWallet();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Truncate address for display
    const truncatedAddress = publicKey
        ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
        : '';

    if (connected && publicKey) {
        return (
            <button
                onClick={() => disconnect()}
                className="btn btn-secondary h-10 px-4 flex items-center gap-2 group"
                title="Disconnect wallet"
            >
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-bold" style={{ fontFamily: "'Bangers', cursive", letterSpacing: '0.05em' }}>{truncatedAddress}</span>
                <LogOut className="w-4 h-4 transition-colors group-hover:[color:var(--error)]" />
            </button>
        );
    }

    return (
        <WalletMultiButton className="btn btn-primary h-10 px-4">
            <Wallet className="w-4 h-4" />
            Connect Wallet
        </WalletMultiButton>
    );
};
