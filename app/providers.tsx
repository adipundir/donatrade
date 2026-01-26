'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

import { ThemeProvider } from 'next-themes';

import { VaultProvider } from '@/components/VaultProvider';

// Browser polyfills for Anchor/Buffer
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || require('buffer').Buffer;
}

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers component wrapping the app with Solana wallet functionality and theme management.
 * 
 * Uses Solana Devnet for hackathon demo purposes.
 */
export const Providers: FC<ProvidersProps> = ({ children }) => {
  // Solana Devnet endpoint
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  // Configure supported wallets - Phantom is the primary wallet
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <VaultProvider>
              {children}
            </VaultProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
};
