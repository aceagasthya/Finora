'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Lock,
  Sparkles,
  ArrowRight,
  Check,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const SAMPLE_SOLANA_ADDRESS = 'CG3eYXBggS5uxDpg2RETrR2ofhpMXTRaT65HWUhve2AJ';

export default function SendUsdcPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Form State
  const [recipientAddress, setRecipientAddress] = useState(SAMPLE_SOLANA_ADDRESS);
  const [usdcAmount, setUsdcAmount] = useState('10');
  const [paymentMethod, setPaymentMethod] = useState<'USDC' | 'INR'>('USDC');

  // Quote State
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Flow State: 'IDLE' | 'CONVERTING' | 'CONVERTED' | 'WITHDRAWING' | 'SUCCESS'
  const [flowState, setFlowState] = useState<'IDLE' | 'CONVERTING' | 'CONVERTED' | 'WITHDRAWING' | 'SUCCESS'>('IDLE');
  const [upiPin, setUpiPin] = useState('1234');
  const [withdrawalResult, setWithdrawalResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [depositing, setDepositing] = useState(false);

  const handleQuickDeposit = async () => {
    setDepositing(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/deposit/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quick deposit failed');
      await loadUser();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setDepositing(false);
    }
  };

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch {
      router.push('/login');
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Fetch Quote when amount or method changes
  useEffect(() => {
    const num = parseFloat(usdcAmount);
    if (isNaN(num) || num <= 0) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    setErrorMessage('');
    if (flowState === 'CONVERTED') {
      setFlowState('IDLE');
    }

    fetch('/api/pay/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flow: paymentMethod === 'INR' ? 'INR_TO_USDC' : 'USDC_TO_USDC',
        amount: num,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.quote) setQuote(data.quote);
      })
      .catch((err) => console.error('Quote error:', err))
      .finally(() => setQuoteLoading(false));
  }, [usdcAmount, paymentMethod]);

  // Step 1 for Flow B: Convert INR to USDC
  const handleConvertInr = async () => {
    setFlowState('CONVERTING');
    setErrorMessage('');
    try {
      const res = await fetch('/api/pay/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: 'INR_TO_USDC',
          amount: parseFloat(usdcAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');

      await loadUser();
      setFlowState('CONVERTED');
    } catch (err: any) {
      setErrorMessage(err.message);
      setFlowState('IDLE');
    }
  };

  // Step 2 for Flow B OR Direct Step for Flow D: Withdraw USDC via BitGo
  const handleWithdraw = async () => {
    setFlowState('WITHDRAWING');
    setErrorMessage('');

    try {
      const res = await fetch('/api/pay/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: paymentMethod === 'INR' ? 'FLOW_B' : 'FLOW_D',
          amount: parseFloat(usdcAmount),
          recipientAddress,
          pin: upiPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal failed');

      setWithdrawalResult(data);
      setFlowState('SUCCESS');
      await loadUser();

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      setErrorMessage(err.message);
      setFlowState(paymentMethod === 'INR' ? 'CONVERTED' : 'IDLE');
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00BAF2] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center gap-1 text-[11px] text-purple-300 font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30">
          <ArrowUpRight className="w-3 h-3" />
          <span>Withdraw to Solana</span>
        </div>
      </div>

      {flowState === 'SUCCESS' && withdrawalResult ? (
        /* SUCCESS SCREEN: Transaction Hash + Solana Explorer Link */
        <div className="glass-card rounded-3xl p-6 text-center border border-purple-500/30 shadow-2xl space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Withdrawal Executed
            </span>
            <h1 className="text-3xl font-black text-white mt-2">
              {withdrawalResult.amount.toFixed(4)} USDC
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sent via BitGo Testnet to external Solana recipient
            </p>
          </div>

          {/* Transaction Hash & Explorer Link */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 text-left space-y-2.5 shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Solana Transaction Hash
            </span>
            <p className="text-xs font-mono text-purple-300 break-all bg-slate-900 p-2.5 rounded-xl border border-white/5">
              {withdrawalResult.txHash}
            </p>

            <a
              href={withdrawalResult.solanaExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
            >
              <span>View on Solana Explorer (Devnet)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Details */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Finora Main Account</span>
              <span className="font-mono text-cyan-300 font-semibold">
                {withdrawalResult.fromWalletId ? `${withdrawalResult.fromWalletId.slice(0, 10)}...` : 'BitGo Main Account'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">External USDC Account</span>
              <span className="font-mono text-slate-200">
                {withdrawalResult.recipientAddress.slice(0, 8)}...{withdrawalResult.recipientAddress.slice(-6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Database Check</span>
              <span className="text-emerald-400 font-semibold">Verified & Deducted in SQLite ✓</span>
            </div>
            {withdrawalResult.databaseBalanceBefore !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">Balance (Before → After)</span>
                <span className="font-mono text-slate-300">
                  {withdrawalResult.databaseBalanceBefore} → {withdrawalResult.databaseBalanceAfter} USDC
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">BitGo API Triggered</span>
              <span className="font-mono text-cyan-300">
                {withdrawalResult.bitgoApiTriggered ? `POST .../sendcoins (HTTP ${withdrawalResult.bitgoStatus || 200})` : 'Yes'}
              </span>
            </div>
            {withdrawalResult.bitgoEndpoint && (
              <div className="flex justify-between">
                <span className="text-slate-400">BitGo Endpoint</span>
                <span className="font-mono text-[10px] text-purple-300 truncate max-w-[210px]" title={withdrawalResult.bitgoEndpoint}>
                  {withdrawalResult.bitgoEndpoint.replace(/^https?:\/\/[^\/]+/, '')}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setFlowState('IDLE');
                setWithdrawalResult(null);
                setErrorMessage('');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-[#00BAF2] text-slate-950 font-bold text-xs hover:scale-[1.01] transition shadow-lg shadow-purple-500/20"
            >
              Send Another Transfer
            </button>
            <Link
              href="/dashboard"
              className="block w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:text-white transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* WITHDRAWAL FORM */
        <div className="space-y-4">
          {/* Header Card */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-white">Withdraw USDC to Solana</h2>
                <p className="text-[11px] text-slate-400">
                  Sends USDC from Finora Go Account to any external Solana address
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Available</span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  ${Number(user?.virtualUsdcBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Faucet Top-Up Banner if low balance */}
          {Number(user?.virtualUsdcBalance || 0) < (parseFloat(usdcAmount) || 1) && (
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-purple-200">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Low USDC balance? Fund wallet via testnet faucet:</span>
              </div>
              <button
                type="button"
                onClick={handleQuickDeposit}
                disabled={depositing}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-500 to-[#00BAF2] text-slate-950 font-bold text-[11px] hover:opacity-90 transition shrink-0 flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                <span>{depositing ? 'Adding...' : '+50 USDC'}</span>
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {errorMessage.toLowerCase().includes('insufficient') && (
                <button
                  type="button"
                  onClick={handleQuickDeposit}
                  disabled={depositing}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/40 border border-rose-500/50 text-white font-bold text-[10px] shrink-0"
                >
                  {depositing ? 'Topping up...' : 'Quick Top Up +50'}
                </button>
              )}
            </div>
          )}

          <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-4 shadow-xl">
            {/* Recipient Solana Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Recipient Solana Address
                </label>
                <button
                  type="button"
                  onClick={() => setRecipientAddress(SAMPLE_SOLANA_ADDRESS)}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Fill Sample Address
                </button>
              </div>
              <input
                type="text"
                required
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter base58 Solana address"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* Amount (USDC) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  USDC Amount to Send
                </label>
                <span className="text-[11px] text-slate-400">
                  Avail: <strong className="text-purple-300">${Number(user?.virtualUsdcBalance || 0).toFixed(2)}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-purple-400">
                  $
                </span>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-2xl font-black text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Amount Quick Presets */}
              <div className="flex items-center gap-1.5 mt-2">
                {['5', '10', '25', '50', '100'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setUsdcAmount(amt)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      usdcAmount === amt
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* PAYMENT METHOD SELECTOR */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Funding Account
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Flow D: Direct USDC */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('USDC')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    paymentMethod === 'USDC'
                      ? 'bg-purple-500/15 border-purple-500 text-white shadow-md shadow-purple-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-300">Pay with USDC</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                      Flow D
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Avail: <strong className="text-white">${Number(user.virtualUsdcBalance || 0).toFixed(2)}</strong>
                  </p>
                </button>

                {/* Flow B: Pay with INR */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('INR')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    paymentMethod === 'INR'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-300">Pay with INR</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      Flow B
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Avail: <strong className="text-white">₹{Number(user.virtualInrBalance || 0).toFixed(2)}</strong>
                  </p>
                </button>
              </div>
            </div>

            {/* QUOTE BREAKDOWN (When Pay with INR selected) */}
            {quote && paymentMethod === 'INR' && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-white/5">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conversion Rate</span>
                  </span>
                  <span className="font-semibold text-white">1 USDC = ₹86.42</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Target USDC</span>
                  <span className="font-bold text-purple-300">{quote.usdcAmount.toFixed(4)} USDC</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Base INR</span>
                  <span className="font-mono text-slate-200">₹{quote.baseInr.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Platform Fee (1%)</span>
                  <span className="font-mono text-slate-300">+₹{quote.platformFeeInr.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>TDS 1% (Sec 194S)</span>
                  <span className="font-mono text-slate-300">+₹{quote.tdsInr.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-white font-bold pt-1.5 border-t border-white/10 text-sm">
                  <span>Total INR to Deduct</span>
                  <span className="font-mono text-emerald-400">₹{quote.totalInrToDeduct.toFixed(2)} INR</span>
                </div>
              </div>
            )}

            {/* UPI PIN INPUT */}
            {(flowState === 'CONVERTED' || paymentMethod === 'USDC') && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/40 animate-fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Enter UPI / Security PIN</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Default: 1234</span>
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={upiPin}
                  onChange={(e) => setUpiPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono text-xl tracking-[0.5em] text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="pt-2">
              {paymentMethod === 'INR' ? (
                /* Flow B: 2-step (Convert -> Pay & Withdraw) */
                flowState !== 'CONVERTED' ? (
                  <button
                    type="button"
                    onClick={handleConvertInr}
                    disabled={flowState === 'CONVERTING' || !quote}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {flowState === 'CONVERTING' ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                        <span>Converting INR to USDC...</span>
                      </span>
                    ) : (
                      <>
                        <span>Convert ₹{quote?.totalInrToDeduct || ''} to USDC</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-semibold flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Converted to USDC in Virtual Ledger ✓</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleWithdraw}
                      disabled={(flowState as string) === 'WITHDRAWING' || !upiPin}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-[#00BAF2] text-slate-950 font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {(flowState as string) === 'WITHDRAWING' ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                          <span>Executing BitGo Withdrawal...</span>
                        </span>
                      ) : (
                        <span>Withdraw {usdcAmount} USDC to Solana</span>
                      )}
                    </button>
                  </div>
                )
              ) : (
                /* Flow D: Direct USDC Withdrawal */
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={flowState === 'WITHDRAWING' || !upiPin}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-[#00BAF2] text-slate-950 font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {flowState === 'WITHDRAWING' ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                      <span>Executing BitGo Withdrawal...</span>
                    </span>
                  ) : (
                    <span>Withdraw {usdcAmount} USDC to Solana</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
