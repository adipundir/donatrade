'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Eye, ArrowRight, Zap, Users, FileCheck, TrendingUp, BadgeCheck, Cpu, Github, Twitter, ExternalLink } from 'lucide-react';

/**
 * Landing Page - Comic-style privacy-focused messaging for Donatrade.
 */
export default function LandingPage() {
  const { connected } = useWallet();
  const router = useRouter();

  // Redirect to companies page if already connected
  if (connected) {
    return (
      <div className="min-h-screen pt-24 hero-comic">
        <div className="container">
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="animate-pop">
              <div className="inline-block mb-4">
                <span className="exclaim text-2xl">POW!</span>
              </div>
              <h1 className="text-4xl mb-4">You&apos;re Connected!</h1>
              <p className="text-secondary mb-8 text-lg">Your secret identity is safe. Where to next, hero?</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/companies')}
                  className="btn btn-primary"
                >
                  <Users className="w-4 h-4" />
                  Browse Companies
                </button>
                <button
                  onClick={() => router.push('/portfolio')}
                  className="btn btn-secondary"
                >
                  <Eye className="w-4 h-4" />
                  View Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-comic">
      {/* Hero Section */}
      <section className="h-screen flex items-center justify-center pt-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-pop">
              <div className="inline-flex items-center gap-2 px-4 py-2 border-3 border-foreground mb-8 bg-background">
                <Lock className="w-4 h-4" />
                <span className="font-bold uppercase tracking-wide">Private Investment</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl mb-6 animate-pop stagger-1">
              Fixing the liquidity problem
              <br />
              <span className="text-accent">in private equity.</span>
            </h1>

            <p className="text-lg md:text-xl text-secondary mb-10 animate-pop stagger-2 max-w-2xl mx-auto" style={{ fontFamily: "'Comic Neue', cursive" }}>
              Long or short <strong>SpaceX, Stripe, OpenAI</strong>, and 40+ private markets with
              real-time settlement and transparent pricing.
            </p>

            <div className="animate-pop stagger-3">
              <WalletMultiButton className="btn btn-primary text-xl px-8 py-4">
                Start Trading
              </WalletMultiButton>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <span className="exclaim text-xl">BAM!</span>
            <h2 className="text-3xl mt-4">Why Donatrade?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1: INCO-Powered */}
            <div className="card animate-pop stagger-1">
              <div className="w-12 h-12 border-3 border-black flex items-center justify-center mb-4 bg-accent-light">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl mb-2 text-foreground">Powered by INCO</h3>
              <p className="text-foreground opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                Built on INCO Lightning for true confidential computing. Your investments are encrypted
                and verifiable without trusting any single party. Privacy you can actually trust!
              </p>
            </div>

            {/* Feature 2: Solves Liquidity Problem */}
            <div className="card animate-pop stagger-2">
              <div className="w-12 h-12 border-3 border-black flex items-center justify-center mb-4 bg-accent-light">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl mb-2 text-foreground">Solves the Liquidity Problem</h3>
              <p className="text-foreground opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                Traditional private equity locks you in for years. Donatrade enables real-time trading
                of private company shares with instant settlement. Finally, liquidity in private markets!
              </p>
            </div>

            {/* Feature 3: Trustworthy */}
            <div className="card animate-pop stagger-3">
              <div className="w-12 h-12 border-3 border-black flex items-center justify-center mb-4 bg-accent-light">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl mb-2 text-foreground">Trustworthy Investing</h3>
              <p className="text-foreground opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                Unlike other platforms, every investment is verified on-chain with legal agreement hashes.
                Transparent pricing, encrypted holdings, and verifiable compliance. Investing you can trust!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="mb-6"></div>
              <h2 className="text-4xl md:text-5xl mb-6">
                Why Privacy Matters
              </h2>
              <p className="text-lg md:text-xl text-foreground max-w-2xl mx-auto opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                In traditional private equity, your holdings are visible to everyone: competitors, regulators, 
                and even malicious actors. Donatrade changes that.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 border-3 border-black flex items-center justify-center bg-accent-light shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl text-foreground">Who Can See Your Holdings?</h3>
                </div>
                <div className="space-y-3" style={{ fontFamily: "'Comic Neue', cursive" }}>
                  <div className="flex items-start gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <p className="text-foreground opacity-90"><strong>Only you.</strong> Your wallet decrypts your holdings locally. They never leave your device.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent font-bold">✗</span>
                    <p className="text-foreground opacity-90"><strong>Not blockchain explorers.</strong> Your share amounts are encrypted on-chain using INCO Lightning.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent font-bold">✗</span>
                    <p className="text-foreground opacity-90"><strong>Not competitors.</strong> Your investment strategy stays private from market participants.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent font-bold">✗</span>
                    <p className="text-foreground opacity-90"><strong>Not even Donatrade.</strong> We use confidential computing. We can&apos;t see your holdings even if we wanted to.</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 border-3 border-black flex items-center justify-center bg-accent-light shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl text-foreground">Why It Matters</h3>
                </div>
                <div className="space-y-3" style={{ fontFamily: "'Comic Neue', cursive" }}>
                  <p className="text-foreground opacity-90">
                    <strong>Protect your strategy:</strong> Keep your investment positions private from competitors 
                    who might front-run your trades or copy your moves.
                  </p>
                  <p className="text-foreground opacity-90">
                    <strong>Avoid targeted attacks:</strong> Large holdings visible on-chain make you a target 
                    for phishing, social engineering, and physical threats.
                  </p>
                  <p className="text-foreground opacity-90">
                    <strong>Maintain competitive edge:</strong> Your trading patterns and portfolio composition 
                    remain confidential, giving you an advantage in the market.
                  </p>
                </div>
              </div>
            </div>

            <div className="card border-accent text-center" style={{ borderColor: 'var(--accent)' }}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Cpu className="w-6 h-6 text-accent" />
                <h3 className="text-2xl text-foreground">Powered by INCO Lightning</h3>
              </div>
              <p className="text-foreground max-w-2xl mx-auto opacity-90" style={{ fontFamily: "'Comic Neue', cursive" }}>
                INCO Lightning enables true confidential computing on-chain. Your share amounts are processed 
                in an encrypted environment that&apos;s verifiable but private, enabling verifiable privacy 
                without trusting any single party. This isn&apos;t just encryption, it&apos;s confidential computing 
                you can actually trust!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t-3 border-black bg-surface">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl" style={{ fontFamily: "'Bangers', cursive" }}>Donatrade</span>
              </div>
              <p className="text-sm text-secondary mb-4" style={{ fontFamily: "'Comic Neue', cursive" }}>
                Privacy-first private equity trading on Solana. Your investments, your privacy.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg mb-4 font-bold uppercase tracking-wide">Platform</h4>
              <ul className="space-y-2" style={{ fontFamily: "'Comic Neue', cursive" }}>
                <li>
                  <a href="/companies" className="text-sm text-secondary hover:text-foreground transition-colors">
                    Browse Companies
                  </a>
                </li>
                <li>
                  <a href="/portfolio" className="text-sm text-secondary hover:text-foreground transition-colors">
                    View Portfolio
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-secondary hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-lg mb-4 font-bold uppercase tracking-wide">Resources</h4>
              <ul className="space-y-2" style={{ fontFamily: "'Comic Neue', cursive" }}>
                <li>
                  <a href="#" className="text-sm text-secondary hover:text-foreground transition-colors flex items-center gap-1">
                    Documentation
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-secondary hover:text-foreground transition-colors flex items-center gap-1">
                    Privacy Policy
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-secondary hover:text-foreground transition-colors flex items-center gap-1">
                    Terms of Service
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-lg mb-4 font-bold uppercase tracking-wide">Connect</h4>
              <div className="flex gap-3 mb-4">
                <a 
                  href="#" 
                  className="w-10 h-10 border-3 border-foreground flex items-center justify-center bg-background hover:bg-accent hover:text-white transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 border-3 border-foreground flex items-center justify-center bg-background hover:bg-accent hover:text-white transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>
              <p className="text-xs text-muted" style={{ fontFamily: "'Comic Neue', cursive" }}>
                Built for Privacy Hackathon
              </p>
              <p className="text-xs text-muted" style={{ fontFamily: "'Comic Neue', cursive" }}>
                Solana Devnet
              </p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t-3 border-black">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted text-center md:text-left" style={{ fontFamily: "'Comic Neue', cursive" }}>
                © {new Date().getFullYear()} Donatrade. All rights reserved.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted" style={{ fontFamily: "'Comic Neue', cursive" }}>
                  Powered by
                </span>
                <span className="text-xs font-bold text-accent" style={{ fontFamily: "'Bangers', cursive" }}>
                  INCO Lightning
                </span>
                <span className="text-xs text-muted" style={{ fontFamily: "'Comic Neue', cursive" }}>
                  &
                </span>
                <span className="text-xs font-bold text-accent" style={{ fontFamily: "'Bangers', cursive" }}>
                  Solana
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


