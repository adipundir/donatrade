'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ArrowRight, Tag, Lock, RefreshCw, Plus, Loader2 } from 'lucide-react';
import {
    getProgram,
    buildCreateOfferTx,
    buildExecuteTradeTx,
    getOfferPDA,
    fetchInvestorPositions,
    fetchAllOffers,
    BN
} from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';

export default function TradePage() {
    const wallet = useWallet();
    const { connected, publicKey } = wallet;
    const { connection } = useConnection();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [offers, setOffers] = useState<any[]>([]);
    const [myPositions, setMyPositions] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        companyId: '',
        shareAmount: '',
        pricePerShare: '',
    });
    const [txSuccess, setTxSuccess] = useState('');

    useEffect(() => {
        if (connected && publicKey) {
            loadOffers();
            loadMyPositions();
        }
    }, [connected, publicKey]);

    const loadOffers = async () => {
        setIsLoading(true);
        try {
            const program = getProgram(connection, wallet);
            if (!program) return;

            const fetchedOffers = await fetchAllOffers(program);
            // Only show active offers
            setOffers(fetchedOffers.filter((o: any) => o.isActive));
        } catch (e) {
            console.error("Error loading offers:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMyPositions = async () => {
        if (!publicKey) return;
        const program = getProgram(connection, wallet);
        if (program) {
            const pos = await fetchInvestorPositions(connection, publicKey);
            setMyPositions(pos);
        }
    };

    const handleCreateOffer = async () => {
        if (!publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;
        setTxSuccess('');
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program error");

            // Random Offer ID for uniqueness per user
            const offerId = BigInt(Math.floor(Math.random() * 1000000));
            const shares = BigInt(createForm.shareAmount);
            // USDC has 6 decimals
            const price = BigInt(Math.floor(parseFloat(createForm.pricePerShare) * 1_000_000));

            const txBuilder = await buildCreateOfferTx(
                program,
                publicKey,
                BigInt(createForm.companyId),
                offerId,
                shares,
                price
            );

            console.log("[DonaTrade] Creating offer...");
            const transaction = await txBuilder.transaction();
            const sig = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(sig, 'confirmed');

            setTxSuccess(`BOOM! Sell offer created at $${createForm.pricePerShare}/share!`);
            setShowCreateModal(false);
            setCreateForm({ companyId: '', shareAmount: '', pricePerShare: '' });

            // Refresh
            setTimeout(() => {
                loadOffers();
                loadMyPositions();
            }, 2000);

        } catch (e: any) {
            console.error(e);
            setTxSuccess("Error: " + (e.message || "Failed to create offer"));
        }
    };

    const handleBuyOffer = async (offer: any) => {
        if (!publicKey || !wallet.sendTransaction) return;
        setTxSuccess('');
        setIsLoading(true);
        try {
            const program = getProgram(connection, wallet);
            if (!program) throw new Error("Program error");

            console.log("[DonaTrade] Buying offer...", offer.offerId.toString());

            const txBuilder = await buildExecuteTradeTx(
                program,
                publicKey,
                offer.seller,
                offer.offerId
            );

            const transaction = await txBuilder.transaction();
            const sig = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(sig, 'confirmed');

            setTxSuccess(`TRADE SUCCESS! You bought ${offer.shareAmount.toString()} shares at $${(Number(offer.pricePerShare) / 1_000_000).toFixed(2)}/share.`);

            // Refresh
            setTimeout(() => {
                loadOffers();
                loadMyPositions();
            }, 2000);
        } catch (e: any) {
            console.error(e);
            setTxSuccess("Error: " + (e.message || "Trade failed"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 hero-comic">
            <div className="container">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl mb-2">P2P Market</h1>
                        <p className="text-secondary" style={{ fontFamily: "'Comic Neue', cursive" }}>
                            Trade encrypted shares directly with other investors.
                        </p>
                    </div>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Offer
                    </button>
                </div>

                {txSuccess && (
                    <div className="p-4 border-3 border-accent bg-accent-light mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <p className="font-bold flex items-center gap-2" style={{ fontFamily: "'Bangers', cursive" }}>
                            <RefreshCw className="w-4 h-4" />
                            {txSuccess}
                        </p>
                    </div>
                )}

                {!connected ? (
                    <div className="text-center py-12 card border-dashed border-2 border-black/20">
                        <Lock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <h2 className="text-xl">Connect Wallet to Trade</h2>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading && offers.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <Loader2 className="w-12 h-12 animate-spin mx-auto text-accent" />
                                <p className="mt-4 font-bold">Scanning Marketplace...</p>
                            </div>
                        ) : offers.length === 0 ? (
                            <div className="col-span-full text-center py-12 card border-dashed border-2 border-black/20 opacity-60">
                                <Tag className="w-12 h-12 mx-auto mb-4" />
                                <p>No active offers found. Be the first!</p>
                            </div>
                        ) : (
                            offers.map((offer, idx) => (
                                <div key={idx} className="card border-3 border-black hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all animate-pop p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold">Offer #{offer.offerId.toString()}</h3>
                                        <span className="badge bg-green-500 text-white font-bold border-2 border-black px-3 py-1 scale-90">Active</span>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between items-center bg-accent-light/30 p-2 rounded">
                                            <span className="text-secondary text-sm font-bold uppercase tracking-wider">Company</span>
                                            <span className="font-mono font-bold bg-surface px-2 border-2 border-black">#{offer.companyId.toString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-secondary text-sm font-bold uppercase tracking-wider">Shares</span>
                                            <span className="font-mono font-bold text-2xl text-accent">{offer.shareAmount.toString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-secondary text-sm font-bold uppercase tracking-wider">Price/Share</span>
                                            <span className="font-mono font-bold text-xl">${(Number(offer.pricePerShare) / 1_000_000).toLocaleString()}</span>
                                        </div>
                                        <div className="pt-3 border-t-2 border-dashed border-black/20">
                                            <p className="text-[10px] text-secondary font-bold truncate opacity-60">
                                                Seller: {offer.seller.toBase58()}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleBuyOffer(offer)}
                                        disabled={isLoading || offer.seller.toBase58() === publicKey?.toBase58()}
                                        className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                                        {offer.seller.toBase58() === publicKey?.toBase58() ? "Your Listing" : "Buy Shares"}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="card max-w-md w-full animate-pop border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-background">
                            <h2 className="text-4xl mb-6 font-bold" style={{ fontFamily: "'Bangers', cursive" }}>Sell Shares</h2>

                            <div className="space-y-5">
                                <div>
                                    <label className="label font-bold uppercase text-xs tracking-widest opacity-70">1. Choose your position</label>
                                    <select
                                        className="input border-3 border-black focus:ring-4 focus:ring-accent/20 transition-all font-bold"
                                        value={createForm.companyId}
                                        onChange={(e) => setCreateForm({ ...createForm, companyId: e.target.value })}
                                    >
                                        <option value="">Select Company...</option>
                                        {myPositions.map(p => (
                                            <option key={p.companyId} value={p.companyId}>
                                                Company #{p.companyId} CSA Pool
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label font-bold uppercase text-xs tracking-widest opacity-70">2. Amount to trade</label>
                                    <input
                                        type="number"
                                        className="input border-3 border-black font-mono font-bold text-lg"
                                        placeholder="Shares amount"
                                        value={createForm.shareAmount}
                                        onChange={(e) => setCreateForm({ ...createForm, shareAmount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label font-bold uppercase text-xs tracking-widest opacity-70">3. Price per share (USDC)</label>
                                    <input
                                        type="number"
                                        className="input border-3 border-black font-mono font-bold text-lg"
                                        placeholder="0.00"
                                        value={createForm.pricePerShare}
                                        onChange={(e) => setCreateForm({ ...createForm, pricePerShare: e.target.value })}
                                    />
                                    <p className="text-[10px] mt-2 font-bold text-secondary italic">Note: The buyer will pay exactly this amount per share.</p>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button className="btn btn-secondary flex-1 font-bold border-2 border-black py-3" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button
                                    className="btn btn-primary flex-1 font-bold border-2 border-black py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    onClick={handleCreateOffer}
                                    disabled={!createForm.companyId || !createForm.shareAmount || !createForm.pricePerShare}
                                >
                                    Confirm List
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
