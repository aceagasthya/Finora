'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Filter,
  Search,
  ExternalLink,
  Copy,
  Check,
  X,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'deposit' | 'payment' | 'withdrawal' | 'conversion'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?type=${activeFilter}`);
      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        return;
      }
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeFilter]);

  const handleExportCsv = () => {
    window.location.href = `/api/transactions?format=csv&type=${activeFilter}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const filtered = transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.counterparty?.toLowerCase().includes(q) ||
      t.type?.toLowerCase().includes(q) ||
      t.asset?.toLowerCase().includes(q) ||
      t.txHash?.toLowerCase().includes(q) ||
      t.utr?.toLowerCase().includes(q) ||
      t.amount?.toString().includes(q)
    );
  });

  return (
    <div className="max-w-xl mx-auto px-4 pt-3 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-[#00BAF2]/40 text-xs font-semibold text-cyan-300 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-[#00BAF2]" />
          <span>Transaction History</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Complete ledger records of deposits, merchant payments, withdrawals, and conversions
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {[
          { id: 'all', label: 'All' },
          { id: 'deposit', label: 'Deposits' },
          { id: 'payment', label: 'Payments' },
          { id: 'withdrawal', label: 'Withdrawals' },
          { id: 'conversion', label: 'Conversions' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeFilter === tab.id
                ? 'bg-[#00BAF2]/20 text-[#00BAF2] border border-[#00BAF2]/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Box */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by merchant, address, hash, or amount..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00BAF2] transition"
        />
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00BAF2] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 text-center border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto mb-2">
            <Layers className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-white">No transactions found</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeFilter !== 'all' ? `No ${activeFilter} records match your search.` : 'You haven’t performed any transactions yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((tx) => {
            const isCredit = tx.type === 'deposit' || tx.type === 'conversion_credit';
            const isPayment = tx.type === 'payment';
            const isWithdrawal = tx.type === 'withdrawal';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-white/5 hover:border-[#00BAF2]/30 transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCredit
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isWithdrawal
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isCredit ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition truncate">
                      {tx.counterparty}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize flex items-center gap-1.5 mt-0.5">
                      <span>{tx.type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>
                        {new Date(tx.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-black ${
                      isCredit ? 'text-emerald-400' : 'text-slate-100'
                    }`}
                  >
                    {isCredit ? '+' : '-'}
                    {tx.asset === 'INR' ? '₹' : '$'}
                    {tx.amount.toFixed(tx.asset === 'INR' ? 2 : 4)}
                  </p>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 uppercase font-semibold">
                    {tx.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-slate-900 border border-white/15 text-left relative shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {selectedTx.type.replace('_', ' ')} Details
              </span>
              <h3 className="text-2xl font-black text-white mt-1.5">
                {selectedTx.asset === 'INR' ? '₹' : '$'}
                {selectedTx.amount.toFixed(selectedTx.asset === 'INR' ? 2 : 4)} {selectedTx.asset}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{selectedTx.counterparty}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID</span>
                <span className="font-mono text-slate-200">{selectedTx.id.slice(0, 14)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 font-bold uppercase">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time</span>
                <span className="text-slate-200">
                  {new Date(selectedTx.createdAt).toLocaleString()}
                </span>
              </div>

              {(selectedTx.txHash || selectedTx.utr) && (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      {selectedTx.utr ? 'Bank UTR' : 'Solana Tx Hash'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedTx.txHash || selectedTx.utr)}
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-cyan-300 break-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                    {selectedTx.txHash || selectedTx.utr}
                  </p>
                  {selectedTx.txHash && selectedTx.type === 'withdrawal' && (
                    <a
                      href={`https://explorer.solana.com/tx/${selectedTx.txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:underline pt-1"
                    >
                      <span>Inspect on Solana Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
