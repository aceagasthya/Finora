'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownLeft,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Wallet,
  Clock,
  AlertCircle,
  Building,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DepositPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'usdc' | 'inr'>('usdc');
  const [user, setUser] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [usdcAmount, setUsdcAmount] = useState('100');
  const [inrAmount, setInrAmount] = useState('2000');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);

  const [syncing, setSyncing] = useState(false);
  const [manualTx, setManualTx] = useState('');
  const [manualAmt, setManualAmt] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const loadData = async () => {
    try {
      const [meRes, txRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/transactions?type=deposit'),
      ]);

      if (!meRes.ok) {
        router.push('/login');
        return;
      }

      const meData = await meRes.json();
      const txData = await txRes.json();

      setUser(meData.user);
      if (txData.transactions) setRecentDeposits(txData.transactions.slice(0, 5));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncDeposits = async () => {
    setSyncing(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/wallet/sync-deposits', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      if (data.syncedCount > 0) {
        setStatusMsg(`✓ Successfully synced ${data.syncedCount} new deposit(s) (+${data.totalCreditedAmount} USDC)!`);
      } else {
        setStatusMsg('✓ BitGo wallet transfers are up to date.');
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Deposit sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleManualVerify = async () => {
    if (!manualTx.trim()) {
      alert('Please enter a Solana Devnet signature / transaction hash');
      return;
    }
    const amt = parseFloat(manualAmt);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid deposit amount in USDC');
      return;
    }

    setManualLoading(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/wallet/sync-deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: manualTx.trim(), amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setStatusMsg(data.message || `Verified and credited ${amt} USDC!`);
      setManualTx('');
      setManualAmt('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Manual verification failed');
    } finally {
      setManualLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Proactively query BitGo transfers on mount
    fetch('/api/wallet/sync-deposits', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d.syncedCount > 0) loadData();
      })
      .catch(() => {});
  }, []);

  const handleSimulateUsdcDeposit = async () => {
    setSimulating(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/deposit/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(usdcAmount) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deposit failed');

      setStatusMsg(data.message);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Deposit simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'addr' | 'upi') => {
    navigator.clipboard.writeText(text);
    if (type === 'addr') {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    } else {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00BAF2] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <span className="text-xs font-bold text-cyan-300">Deposit Hub</span>
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ArrowDownLeft className="w-5 h-5 text-[#00BAF2]" />
          <span>Receive & Deposit Funds</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Deposit Solana USDC via BitGo testnet or top up your Indian INR wallet
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setActiveTab('usdc')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'usdc'
              ? 'bg-[#00BAF2] text-slate-950 shadow-md shadow-[#00BAF2]/20'
              : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
          }`}
        >
          <span>USDC (BitGo)</span>
        </button>
        <button
          onClick={() => setActiveTab('inr')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'inr'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
          }`}
        >
          <span>INR (UPI Handle)</span>
        </button>
      </div>

      {statusMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {activeTab === 'usdc' ? (
        <div className="space-y-4">
          {/* BitGo Deposit QR Card */}
          <div className="glass-card rounded-3xl p-6 border border-cyan-500/30 text-center shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Solana USDC Deposit QR
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                BitGo Testnet
              </span>
            </div>

            <div className="p-3 bg-white rounded-2xl inline-block mx-auto shadow-md">
              <QRCodeSVG value={user.usdcDepositAddress || ''} size={150} />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-cyan-300 truncate">
                {user.usdcDepositAddress}
              </span>
              <button
                onClick={() => copyToClipboard(user.usdcDepositAddress, 'addr')}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0"
                title="Copy Address"
              >
                {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSyncDeposits}
              disabled={syncing}
              className="w-full py-2 px-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Checking BitGo API Transfers...' : 'Sync BitGo On-Chain Transfers'}</span>
            </button>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Send SPL USDC on Solana Devnet to this address. Click &quot;Sync BitGo On-Chain Transfers&quot; or Finora will auto-detect confirmed BitGo transfers and credit your virtual ledger.
            </p>
          </div>

          {/* Manual On-Chain Signature Verification Box */}
          <div className="rounded-3xl p-5 bg-slate-900/60 border border-white/10 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Verify Solana Devnet Tx
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold">Devnet Signatures</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deposited via Phantom or Solana faucet? Paste the transaction signature below to credit immediately:
            </p>
            <input
              type="text"
              placeholder="Solana transaction signature / tx hash..."
              value={manualTx}
              onChange={(e) => setManualTx(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                step="any"
                placeholder="Amount (e.g. 20)"
                value={manualAmt}
                onChange={(e) => setManualAmt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
              />
              <span className="text-xs font-bold text-cyan-400 shrink-0">USDC</span>
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={manualLoading}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shrink-0 disabled:opacity-50"
              >
                {manualLoading ? 'Verifying...' : 'Credit Tx'}
              </button>
            </div>
          </div>

          {/* Deposit Simulator Panel */}
          <div className="rounded-3xl p-5 bg-slate-900/80 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00BAF2]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Testnet Deposit Simulator
                </h3>
              </div>
              <span className="text-[10px] text-cyan-400 font-semibold">1-Click Test</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Deposit Amount (USDC)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-[#00BAF2]"
                />
                <span className="text-xs font-bold text-cyan-400">USDC</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {['25', '50', '100', '250', '500'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setUsdcAmount(amt)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition ${
                    usdcAmount === amt
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSimulateUsdcDeposit}
              disabled={simulating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-[#00BAF2] text-slate-950 font-bold text-xs hover:opacity-95 transition shadow-md shadow-[#00BAF2]/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {simulating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent" />
                  <span>Sending BitGo Webhook...</span>
                </span>
              ) : (
                <span>Simulate Receiving {usdcAmount} USDC</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* INR Tab */
        <div className="space-y-4">
          <div className="glass-card rounded-3xl p-6 border border-emerald-500/30 text-center shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Finora UPI Payment Address
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active VPA
              </span>
            </div>

            <div className="p-3 bg-white rounded-2xl inline-block mx-auto shadow-md">
              <QRCodeSVG
                value={`upi://pay?pa=${user.inrUpiId}&pn=${encodeURIComponent(user.name)}`}
                size={150}
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-emerald-300 truncate">
                {user.inrUpiId}
              </span>
              <button
                onClick={() => copyToClipboard(user.inrUpiId, 'upi')}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0"
                title="Copy UPI ID"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Anyone with Google Pay, PhonePe, or Paytm can scan this QR or pay to your UPI ID to credit your Finora INR wallet.
            </p>
          </div>
        </div>
      )}

      {/* Recent Deposits List */}
      {recentDeposits.length > 0 && (
        <div className="mt-6 rounded-3xl p-5 bg-slate-900/80 border border-white/10 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Recent Deposits</span>
          </h3>

          <div className="space-y-2">
            {recentDeposits.map((dep) => (
              <div
                key={dep.id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-emerald-400 font-mono">
                    +{dep.amount.toFixed(dep.asset === 'INR' ? 2 : 4)} {dep.asset}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(dep.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 uppercase font-mono font-semibold">
                  {dep.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
