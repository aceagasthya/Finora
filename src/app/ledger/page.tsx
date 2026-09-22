'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Layers,
  Database,
  ExternalLink,
  Wallet,
  Building,
} from 'lucide-react';

export default function LedgerReconciliationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReconciliation = async () => {
    try {
      const res = await fetch('/api/ledger/reconciliation');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReconciliation();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00BAF2] border-t-transparent" />
          <p className="text-xs text-slate-400">Auditing ledger against BitGo & M2P...</p>
        </div>
      </div>
    );
  }

  const rec = data?.reconciliation;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-3 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <button
          onClick={handleRefresh}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-[#00BAF2]/40 text-xs font-semibold text-cyan-300 transition shadow-sm ${
            refreshing ? 'opacity-70' : ''
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Re-Run Reconciliation</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#00BAF2]" />
            <span>Ledger & Custodial Reconciliation</span>
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Real-time Audit
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Comparing internal virtual user liability ledgers against BitGo custodial wallets and M2P banking reserves.
        </p>
      </div>

      {/* 1. RECONCILIATION STATS GRID */}
      {rec && (
        <div className="flex flex-col gap-4 mb-8">
          {/* CARD A: USDC RECONCILIATION */}
          <div className="glass-card rounded-3xl p-5 border border-cyan-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                  $
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">USDC Liability vs Custody</h3>
                  <span className="text-[10px] text-slate-400">BitGo Go Account</span>
                </div>
              </div>

              {/* Drift Status Badge */}
              <div
                className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                  rec.usdc.status === 'MATCHED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {rec.usdc.status === 'MATCHED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Drift: {rec.usdc.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/80 border border-white/5">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                  Virtual User Sum
                </span>
                <p className="text-base sm:text-lg font-black text-white font-mono truncate">
                  {Number(rec.usdc.virtualSum || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span className="text-xs text-cyan-400">USDC</span>
                </p>
                <p className="text-[9px] text-slate-500 truncate">Across {data?.userCount} accounts</p>
              </div>

              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                  BitGo Wallet Actual
                </span>
                <p className="text-base sm:text-lg font-black text-cyan-300 font-mono truncate">
                  {Number(rec.usdc.actualBitGo || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span className="text-xs text-cyan-400">USDC</span>
                </p>
                <p className="text-[9px] text-slate-500 truncate">Live testnet balance</p>
              </div>
            </div>

            {/* Drift Indicator Bar */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400 truncate">Calculated Variance (Drift)</span>
                <span
                  className={`font-mono font-bold shrink-0 ${
                    Math.abs(rec.usdc.drift) < 0.0001
                      ? 'text-emerald-400'
                      : rec.usdc.drift > 0
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {rec.usdc.drift > 0 ? '+' : ''}
                  {Number(rec.usdc.drift || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDC
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    Math.abs(rec.usdc.drift) < 0.0001
                      ? 'bg-emerald-400 w-full'
                      : 'bg-amber-400 w-3/4'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                Wallet ID: <code className="text-slate-400 font-mono text-[9px]">{rec.usdc.walletId}</code>
              </p>
            </div>
          </div>

          {/* CARD B: INR RECONCILIATION */}
          <div className="glass-card rounded-3xl p-5 border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  ₹
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">INR Liability vs Pool</h3>
                  <span className="text-[10px] text-slate-400">M2P Banking Escrow</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reserve: {rec.inr.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/80 border border-white/5">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                  Virtual User Sum
                </span>
                <p className="text-base sm:text-lg font-black text-white font-mono truncate">
                  ₹{Number(rec.inr.virtualSum || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] text-slate-500 truncate">Total owed to users</p>
              </div>

              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                  M2P Pool Escrow
                </span>
                <p className="text-base sm:text-lg font-black text-emerald-400 font-mono truncate">
                  ₹{Number(rec.inr.poolBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] text-slate-500 truncate">Finora liquidity pool</p>
              </div>
            </div>

            {/* Drift Indicator Bar */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400 truncate">Net Surplus Liquidity</span>
                <span className="font-mono font-bold text-emerald-400 shrink-0">
                  +₹{Number(rec.inr.drift || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-full" />
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                Escrow Provider: <span className="text-slate-400">{rec.inr.provider}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. REAL-TIME AUDIT TRAIL TABLE */}
      <div className="rounded-3xl p-5 bg-slate-900/80 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Append-Only Ledger Audit Trail</h2>
          </div>
          <span className="text-[10px] text-slate-400">
            Immutable log of all credits, debits & conversions
          </span>
        </div>

        {(!data?.ledgerEntries || data.ledgerEntries.length === 0) ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No ledger entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                  <th className="pb-2.5 font-semibold">User</th>
                  <th className="pb-2.5 font-semibold">Type</th>
                  <th className="pb-2.5 font-semibold">Amount</th>
                  <th className="pb-2.5 font-semibold">Balance After</th>
                  <th className="pb-2.5 font-semibold">Description</th>
                  <th className="pb-2.5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.ledgerEntries.map((entry: any) => {
                  const isPositive = entry.amount >= 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-950/50 transition">
                      <td className="py-2.5 font-medium text-white truncate max-w-[120px]">
                        {entry.userName}
                      </td>
                      <td className="py-2.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {entry.type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 font-mono font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {entry.asset === 'INR' ? '₹' : '$'}
                        {entry.amount.toFixed(entry.asset === 'INR' ? 2 : 4)}
                      </td>
                      <td className="py-2.5 font-mono text-slate-300">
                        {entry.asset === 'INR' ? '₹' : '$'}
                        {entry.balanceAfter.toFixed(entry.asset === 'INR' ? 2 : 4)}
                      </td>
                      <td className="py-2.5 text-slate-400 max-w-xs truncate text-[11px]">
                        {entry.description}
                      </td>
                      <td className="py-2.5 text-slate-500 whitespace-nowrap text-[10px]">
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
