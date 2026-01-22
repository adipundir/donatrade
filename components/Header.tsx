'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from './WalletButton';
import { ThemeToggle } from './ThemeToggle';

/**
 * Comic-style header with Donatrade branding and theme switching.
 */
export const Header = () => {
    const { connected } = useWallet();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass">
            <div className="container">
                <nav className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group">
                            <span
                                className="text-2xl text-foreground group-hover:text-accent transition-colors"
                                style={{ fontFamily: "'Bangers', cursive" }}
                            >
                                Donatrade
                            </span>
                        </Link>

                        {/* Navigation Links - Only show when connected */}
                        {connected && (
                            <div className="hidden md:flex items-center gap-6">
                                <Link
                                    href="/companies"
                                    className="text-sm font-bold uppercase tracking-wide text-secondary hover:text-foreground transition-colors"
                                    style={{ fontFamily: "'Bangers', cursive" }}
                                >
                                    Companies
                                </Link>
                                <Link
                                    href="/portfolio"
                                    className="text-sm font-bold uppercase tracking-wide text-secondary hover:text-foreground transition-colors"
                                    style={{ fontFamily: "'Bangers', cursive" }}
                                >
                                    Portfolio
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <WalletButton />
                    </div>
                </nav>
            </div>
        </header>
    );
};
