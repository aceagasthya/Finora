'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Check,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  X,
  ArrowRight,
  Plus,
  MinusCircle,
  Send,
  QrCode,
  ArrowDownLeft,
  Sparkles,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const DEFAULT_USER = {
  id: '',
  name: 'User',
  email: '',
  virtualUsdcBalance: 0,
  virtualInrBalance: 0,
  usdcDepositAddress: '',
  inrUpiId: '',
  kycStatus: 'verified',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(DEFAULT_USER);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Copy states
  const [copiedUsdc, setCopiedUsdc] = useState(false);
  const [copiedInr, setCopiedInr] = useState(false);

  // Modals
  const [showUsdcQr, setShowUsdcQr] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Deposit Simulator State
  const [depositAmount, setDepositAmount] = useState('50');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState('');

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState('10');
  const [withdrawAddress, setWithdrawAddress] = useState('8foPJDfHFFhYarf465BwYi73PSuCjkZmJD3gUCcL7ehb');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');

  // Sync state
  const [syncingDeposits, setSyncingDeposits] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState('');

  const loadUserData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setRecentTransactions(data.recentTransactions || []);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard user:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();

    // Fast balance refresh every 3.5 seconds to pick up credited deposits in real-time
    const balanceTimer = setInterval(() => {
      loadUserData();
    }, 3500);

    // Background BitGo transfer sync every 15 seconds to automatically ingest any incoming transfers
    const syncTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/wallet/sync-deposits');
        if (res.ok) {
          const data = await res.json();
          if (data.syncedCount > 0) {
            loadUserData();
          }
        }
      } catch (e) {
        // quiet catch
      }
    }, 15000);

    return () => {
      clearInterval(balanceTimer);
      clearInterval(syncTimer);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const copyToClipboard = (text: string, type: 'usdc' | 'inr') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'usdc') {
      setCopiedUsdc(true);
      setTimeout(() => setCopiedUsdc(false), 2000);
    } else {
      setCopiedInr(true);
      setTimeout(() => setCopiedInr(false), 2000);
    }
  };

  const handleSyncDeposits = async () => {
    setSyncingDeposits(true);
    setSyncFeedback('Checking BitGo transfers...');
    try {
      const res = await fetch('/api/wallet/sync-deposits', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      if (data.syncedCount > 0) {
        setSyncFeedback(`✓ Synced ${data.syncedCount} deposit (+${data.totalCreditedAmount} USDC)!`);
      } else {
        setSyncFeedback('✓ Deposits are up to date.');
      }
      await loadUserData();
      setTimeout(() => setSyncFeedback(''), 4000);
    } catch (err: any) {
      setSyncFeedback(err.message || 'Deposit sync failed');
      setTimeout(() => setSyncFeedback(''), 4000);
    } finally {
      setSyncingDeposits(false);
    }
  };

  const handleSimulateDeposit = async () => {
    setDepositLoading(true);
    setDepositSuccessMsg('');
    try {
      const res = await fetch('/api/deposit/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(depositAmount) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deposit failed');

      setDepositSuccessMsg(data.message || 'Deposit confirmed and balance credited!');
      await loadUserData();
      setTimeout(() => {
        setShowDepositModal(false);
        setDepositSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Deposit simulation failed');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawLoading(true);
    setWithdrawSuccessMsg('');
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          recipientAddress: withdrawAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal failed');

      setWithdrawSuccessMsg('Withdrawal processed successfully on BitGo testnet!');
      await loadUserData();
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Formatted display values showing actual user balance (defaulting to 0.00 for new users)
  const displayUsdcBalance =
    user?.virtualUsdcBalance !== undefined && user?.virtualUsdcBalance !== null
      ? Number(user.virtualUsdcBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';

  const displayInrBalance =
    user?.virtualInrBalance !== undefined && user?.virtualInrBalance !== null
      ? Number(user.virtualInrBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';

  const displayUsdcAddress = user?.usdcDepositAddress || 'Address generating...';
  const displayInrAccount = user?.inrUpiId || 'UPI ID generating...';

  return (
    <div className="w-full px-4 pt-2 pb-8 select-none">
      {/* 1. GREETING HEADER: Centered */}
      <div className="text-center my-3">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Hi {user.name?.split(' ')[0] || 'Agasthya'}
        </h1>
        <p className="text-[9.5px] tracking-[0.3em] uppercase text-neutral-400 font-semibold mt-1">
          PAY WITH CRYPTO
        </p>
      </div>

      {/* SYNC FEEDBACK BANNER (IF ACTIVE) */}
      {syncFeedback && (
        <div className="mb-4 p-2.5 rounded-xl bg-neutral-900 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback('')} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. STACKED WALLET CARDS */}
      <div className="flex flex-col gap-3.5 mb-5">
        {/* UPPER CARD: USDC WALLET */}
        <div
          onClick={() => setShowUsdcQr(true)}
          className="finora-card-usdc rounded-[28px] p-5 cursor-pointer relative overflow-hidden group transition-transform active:scale-[0.99]"
        >
          {/* Subtle Watermark Finora Logo right-centered matching mockup */}
          <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
            <img
              src="/finora-logo.png"
              alt=""
              width={40}
              height={40}
              style={{ width: '40px', height: '40px', maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }}
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Top Row: Token Icon & Card Name */}
          <div className="flex items-center justify-between mb-2.5 relative z-10">
            <div className="flex items-center gap-2.5">
              <img src="/usdc-icon.svg" alt="USDC" className="w-8 h-8 rounded-full shadow-md shrink-0" />
              <div className="flex items-center gap-1 text-sm font-semibold text-white tracking-tight">
                <span>USDC Wallet</span>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Large Balance Display */}
          <div className="mb-3.5 relative z-10">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans truncate">
              $ {displayUsdcBalance}
            </div>
          </div>

          {/* Bottom Row: Address with Copy Icon */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(displayUsdcAddress, 'usdc');
            }}
            className="flex items-center justify-between pt-1 relative z-10 group/btn"
          >
            <div className="font-mono text-[11px] text-neutral-400 tracking-wide truncate max-w-[82%] group-hover/btn:text-neutral-200 transition-colors">
              {displayUsdcAddress}
            </div>
            <button
              type="button"
              className="p-1 rounded-md text-neutral-400 hover:text-white transition-colors shrink-0"
              title="Copy Address"
            >
              {copiedUsdc ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* LOWER CARD: INR WALLET */}
        <div
          onClick={() => setShowUpiQr(true)}
          className="finora-card-inr rounded-[28px] p-5 cursor-pointer relative overflow-hidden group transition-transform active:scale-[0.99]"
        >
          {/* Subtle Watermark Finora Logo right-centered matching mockup */}
          <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
            <img
              src="/finora-logo.png"
              alt=""
              width={40}
              height={40}
              style={{ width: '40px', height: '40px', maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }}
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Top Row: Token Icon & Card Name */}
          <div className="flex items-center justify-between mb-2.5 relative z-10">
            <div className="flex items-center gap-2.5">
              <img src="/inr-icon.svg" alt="INR" className="w-8 h-8 rounded-full shadow-md shrink-0" />
              <div className="flex items-center gap-1 text-sm font-semibold text-white tracking-tight">
                <span>INR Wallet</span>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Large Balance Display */}
          <div className="mb-3.5 relative z-10">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans truncate">
              ₹ {displayInrBalance}
            </div>
          </div>

          {/* Bottom Row: Account Number with Copy Icon */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(displayInrAccount, 'inr');
            }}
            className="flex items-center justify-between pt-1 relative z-10 group/btn"
          >
            <div className="font-mono text-[11px] text-neutral-400 tracking-wider truncate max-w-[82%] group-hover/btn:text-neutral-200 transition-colors">
              {displayInrAccount}
            </div>
            <button
              type="button"
              className="p-1 rounded-md text-neutral-400 hover:text-white transition-colors shrink-0"
              title="Copy UPI ID"
            >
              {copiedInr ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. QUICK ACTION BUTTONS: 4-COL GRID */}
      <div className="grid grid-cols-4 gap-2.5 my-4">
        {/* 1. Scan & Pay */}
        <Link
          href="/pay"
          className="action-box rounded-2xl p-2.5 min-h-[72px] flex flex-col items-center justify-center text-center group"
        >
          <div className="w-5 h-5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-white"
            >
              <path d="M4 8V5a1 1 0 0 1 1-1h3" />
              <path d="M16 4h3a1 1 0 0 1 1 1v3" />
              <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
              <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
              <line x1="9" y1="12" x2="15" y2="12" strokeWidth="2.5" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-neutral-300 mt-1.5 leading-tight">
            Scan & Pay
          </span>
        </Link>

        {/* 2. Send */}
        <Link
          href="/send"
          className="action-box rounded-2xl p-2.5 min-h-[72px] flex flex-col items-center justify-center text-center group"
        >
          <div className="w-5 h-5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <Send className="w-4 h-4 -rotate-45" />
          </div>
          <span className="text-[10px] font-medium text-neutral-300 mt-1.5 leading-tight">
            Send
          </span>
        </Link>

        {/* 3. Deposit */}
        <button
          onClick={() => setShowDepositModal(true)}
          className="action-box rounded-2xl p-2.5 min-h-[72px] flex flex-col items-center justify-center text-center group"
        >
          <div className="w-5 h-5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-medium text-neutral-300 mt-1.5 leading-tight">
            Deposit
          </span>
        </button>

        {/* 4. Withdraw */}
        <button
          onClick={() => setShowWithdrawModal(true)}
          className="action-box rounded-2xl p-2.5 min-h-[72px] flex flex-col items-center justify-center text-center group"
        >
          <div className="w-5 h-5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <MinusCircle className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium text-neutral-300 mt-1.5 leading-tight">
            Withdraw
          </span>
        </button>
      </div>

      {/* 5. PROMO / FEATURE BANNER */}
      <div className="promo-banner-container rounded-[24px] p-4 relative overflow-hidden mb-5 border border-white/[0.08]">
        {/* Photorealistic Illuminated Earth Graphic Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden flex items-center justify-end">
          <img
            src="/earth-network.jpg"
            alt=""
            className="h-full object-cover object-left opacity-80 mix-blend-screen"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-between gap-2">
          {/* Left Text & Action */}
          <div className="max-w-[58%]">
            <h3 className="text-sm sm:text-base font-bold text-white leading-snug tracking-tight">
              Real Payments.<br />A More Open World.
            </h3>
            <p className="text-[8px] uppercase tracking-[0.22em] text-neutral-400 font-semibold mt-1">
              PAY WITH CRYPTO
            </p>
            <Link
              href="/pay"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-white/20 text-white mt-3 hover:bg-white/10 active:scale-95 transition"
              title="Scan Now"
            >
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Right Text Overlay */}
          <div className="text-right text-[7.5px] uppercase tracking-[0.16em] text-neutral-400 font-semibold leading-relaxed max-w-[38%] shrink-0">
            SAME<br />
            PEOPLE.<br />
            SAME QR.<br />
            NEW POSSIBILITIES.
          </div>
        </div>
      </div>

      {/* 6. ALL TRANSACTIONS */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-white tracking-tight">
            All Transactions
          </h2>
          <Link
            href="/history"
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-0.5 font-medium transition-colors"
          >
            <span>See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Transactions List */}
        <div className="space-y-2.5">
          {recentTransactions.length > 0 ? (
            recentTransactions.slice(0, 4).map((tx) => {
              const isCredit = tx.type === 'deposit' || tx.type === 'conversion_credit';
              let counterparty = tx.merchantUpiId || tx.toAddress || 'Finora Transfer';
              let logoUrl = isCredit ? '/usdc-icon.svg' : '/starbucks.svg';

              if (tx.metadata) {
                try {
                  const m = JSON.parse(tx.metadata);
                  if (m.merchantName) counterparty = m.merchantName;
                } catch {}
              }

              if (counterparty.toLowerCase().includes('zomato')) logoUrl = '/zomato.svg';
              if (counterparty.toLowerCase().includes('starbucks')) logoUrl = '/starbucks.svg';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-[#0f1013] border border-white/[0.06] flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                >
                  {/* Left: Brand Icon + Title & Date */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-black/40">
                      <img
                        src={logoUrl}
                        alt={counterparty}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white tracking-tight truncate">
                        {counterparty}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount + Status Pill */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold tracking-tight ${isCredit ? 'text-emerald-400' : 'text-white'}`}>
                      {`${isCredit ? '+' : '-'} ${tx.asset === 'INR' ? '₹' : '$'}${Number(tx.amount).toFixed(2)}`}
                    </p>
                    <span className="inline-block mt-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/25">
                      {isCredit ? 'Completed' : 'Paid'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 rounded-2xl bg-[#0f1013] border border-white/[0.06] text-center">
              <p className="text-sm font-medium text-neutral-300">No transactions yet</p>
              <p className="text-xs text-neutral-500 mt-1">
                Deposit USDC or scan a QR code to make your first payment
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS BAR: SYNC & REFRESH FOOTER */}
      <div className="flex items-center justify-center gap-3 pt-2 pb-6 text-xs text-neutral-500">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 hover:text-neutral-300 transition"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Balances</span>
        </button>
        <span>•</span>
        <button
          onClick={handleSyncDeposits}
          disabled={syncingDeposits}
          className="flex items-center gap-1.5 hover:text-neutral-300 transition"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>{syncingDeposits ? 'Syncing...' : 'Sync BitGo Deposits'}</span>
        </button>
      </div>

      {/* MODAL 1: USDC QR CODE */}
      {showUsdcQr && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-xs w-full p-6 rounded-3xl bg-[#0f1014] border border-blue-500/30 text-center relative shadow-2xl">
            <button
              onClick={() => setShowUsdcQr(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-900 border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/usdc-icon.svg" alt="USDC" className="w-7 h-7 rounded-full" />
              <h3 className="text-base font-bold text-white">USDC Wallet</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4">BitGo Testnet (Solana OFC Token)</p>
            <div className="p-3.5 bg-white rounded-2xl inline-block mb-3 shadow-lg">
              <QRCodeSVG value={displayUsdcAddress} size={160} />
            </div>
            <p className="text-[10px] font-mono text-cyan-300 break-all bg-black/70 p-2.5 rounded-xl border border-white/10 mb-4">
              {displayUsdcAddress}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => copyToClipboard(displayUsdcAddress, 'usdc')}
                className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 transition"
              >
                {copiedUsdc ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUsdc ? 'Copied to Clipboard' : 'Copy Address'}</span>
              </button>
              <button
                onClick={() => {
                  setShowUsdcQr(false);
                  setShowDepositModal(true);
                }}
                className="w-full py-2 rounded-xl bg-neutral-900 border border-white/15 text-neutral-200 font-semibold text-xs hover:text-white transition flex items-center justify-center gap-1.5"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulate Deposit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPI QR CODE */}
      {showUpiQr && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-xs w-full p-6 rounded-3xl bg-[#0f1014] border border-amber-500/30 text-center relative shadow-2xl">
            <button
              onClick={() => setShowUpiQr(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-900 border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/inr-icon.svg" alt="INR" className="w-7 h-7 rounded-full" />
              <h3 className="text-base font-bold text-white">INR Wallet</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4">M2P Virtual Payment Address</p>
            <div className="p-3.5 bg-white rounded-2xl inline-block mb-3 shadow-lg">
              <QRCodeSVG
                value={`upi://pay?pa=${user.inrUpiId || 'agasthya@finora'}&pn=${encodeURIComponent(user.name || 'Agasthya')}`}
                size={160}
              />
            </div>
            <p className="text-xs font-mono font-bold text-amber-300 bg-black/70 p-2.5 rounded-xl border border-white/10 mb-4">
              {user.inrUpiId || 'agasthya@finora'}
            </p>
            <button
              onClick={() => copyToClipboard(user.inrUpiId || 'agasthya@finora', 'inr')}
              className="w-full py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-300 transition"
            >
              {copiedInr ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
              <span>{copiedInr ? 'Copied to Clipboard' : 'Copy UPI ID'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: DEPOSIT SIMULATOR */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-[#0f1014] border border-cyan-500/30 text-left relative shadow-2xl">
            <button
              onClick={() => setShowDepositModal(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-900 border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Deposit USDC</h3>
                <p className="text-[11px] text-neutral-400">Simulate on-chain BitGo deposit</p>
              </div>
            </div>

            {depositSuccessMsg && (
              <div className="my-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{depositSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3 my-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1 font-medium">
                  Deposit Amount (USDC)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-sm text-white font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-xs font-bold text-cyan-400">USDC</span>
                </div>
              </div>

              {/* Preset buttons */}
              <div className="flex items-center gap-2">
                {['10', '50', '100', '500'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      depositAmount === amt
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-black border border-white/10 text-[10px] text-neutral-400">
                <span>Receiving Address: </span>
                <span className="font-mono text-cyan-300">{displayUsdcAddress.slice(0, 14)}...</span>
              </div>
            </div>

            <button
              onClick={handleSimulateDeposit}
              disabled={depositLoading}
              className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {depositLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Crediting Deposit...</span>
                </span>
              ) : (
                <span>Confirm & Credit {depositAmount} USDC</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: WITHDRAW */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-[#0f1014] border border-white/20 text-left relative shadow-2xl">
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-900 border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 text-white flex items-center justify-center">
                <MinusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Withdraw USDC</h3>
                <p className="text-[11px] text-neutral-400">Send on-chain to Solana wallet</p>
              </div>
            </div>

            {withdrawSuccessMsg && (
              <div className="my-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{withdrawSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3 my-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1 font-medium">
                  Withdrawal Amount (USDC)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-sm text-white font-bold focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1 font-medium">
                  Recipient Solana Address
                </label>
                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-neutral-200 focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading}
              className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {withdrawLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Processing Withdrawal...</span>
                </span>
              ) : (
                <span>Send {withdrawAmount} USDC</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
