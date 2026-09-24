'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Copy,
  Check,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  X,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { copyTextToClipboard } from '@/lib/clipboard';

export default function CardsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCardTab, setActiveCardTab] = useState<'usdc' | 'inr'>('usdc');

  // Copy states
  const [copiedUsdc, setCopiedUsdc] = useState(false);
  const [copiedInr, setCopiedInr] = useState(false);

  // Card security controls
  const [isUsdcFrozen, setIsUsdcFrozen] = useState(false);
  const [isInrFrozen, setIsInrFrozen] = useState(false);
  const [showCardNumbers, setShowCardNumbers] = useState(false);

  // QR Modals
  const [showUsdcQr, setShowUsdcQr] = useState(false);
  const [showInrQr, setShowInrQr] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.push('/login');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const copyToClipboard = async (text: string, type: 'usdc' | 'inr') => {
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      if (type === 'usdc') {
        setCopiedUsdc(true);
        setTimeout(() => setCopiedUsdc(false), 2000);
      } else {
        setCopiedInr(true);
        setTimeout(() => setCopiedInr(false), 2000);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00BAF2] border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const displayUsdcBalance =
    user?.virtualUsdcBalance !== undefined && user?.virtualUsdcBalance !== null
      ? Number(user.virtualUsdcBalance).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '0.00';

  const displayInrBalance =
    user?.virtualInrBalance !== undefined && user?.virtualInrBalance !== null
      ? Number(user.virtualInrBalance).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '0.00';

  const displayUsdcAddress = user?.usdcDepositAddress || 'Address generating...';
  const displayInrAccount = user?.inrUpiId || 'UPI ID generating...';

  return (
    <div className="w-full px-4 pt-2 pb-12 select-none">
      {/* 1. Header */}
      <div className="text-center my-3">
        <h1 className="text-2xl font-bold text-white tracking-tight">Finora Cards</h1>
        <p className="text-[9.5px] tracking-[0.3em] uppercase text-neutral-400 font-semibold mt-1">
          BORDERLESS GLOBAL WALLETS
        </p>
      </div>

      {/* 2. Card Switcher Tabs */}
      <div className="flex items-center p-1 rounded-2xl bg-neutral-900 border border-white/10 mb-4">
        <button
          onClick={() => setActiveCardTab('usdc')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeCardTab === 'usdc'
              ? 'bg-neutral-800 text-cyan-400 shadow-md border border-cyan-500/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>USDC Card</span>
        </button>
        <button
          onClick={() => setActiveCardTab('inr')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeCardTab === 'inr'
              ? 'bg-neutral-800 text-amber-400 shadow-md border border-amber-500/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>INR Card</span>
        </button>
      </div>

      {/* 3. Card Showcase */}
      {activeCardTab === 'usdc' ? (
        <div className="space-y-4 animate-fade-in">
          {/* Card Header & Balance */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-400">Available Balance:</span>
              <span className="text-base font-black text-cyan-400 font-mono">
                $ {displayUsdcBalance}
              </span>
            </div>
            <button
              onClick={() => setIsUsdcFrozen(!isUsdcFrozen)}
              className="text-[11px] flex items-center gap-1 text-neutral-400 hover:text-white px-2 py-0.5 rounded-lg bg-neutral-900 border border-white/10"
            >
              {isUsdcFrozen ? (
                <>
                  <Unlock className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Unfreeze</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Freeze</span>
                </>
              )}
            </button>
          </div>

          {/* Physical Card Design (Uploaded Card) */}
          <div
            onClick={() => setShowUsdcQr(true)}
            className={`relative rounded-[24px] overflow-hidden border border-cyan-500/25 shadow-2xl shadow-cyan-950/40 group cursor-pointer transition-all duration-300 hover:border-cyan-400/50 hover:shadow-cyan-500/20 active:scale-[0.99] ${
              isUsdcFrozen ? 'grayscale opacity-75' : ''
            }`}
          >
            <img
              src="/card-usdc.jpg"
              alt="USDC Wallet Card"
              className="w-full h-auto object-cover block"
            />

            {/* Quick Copy Badge */}
            <div className="absolute top-3 right-3 opacity-95 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(displayUsdcAddress, 'usdc');
                }}
                className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-[11px] text-white flex items-center gap-1.5 hover:bg-black active:scale-95 transition"
                title="Copy Address"
              >
                {copiedUsdc ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedUsdc ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Clickable Address Hotspot with Feedback */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(displayUsdcAddress, 'usdc');
              }}
              className="absolute bottom-[23%] left-[7%] right-[10%] h-[18%] cursor-pointer flex items-center justify-end pr-2"
              title="Click to copy USDC Address"
            >
              {copiedUsdc && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500 text-black font-bold shadow-lg animate-fade-in">
                  ✓ Copied!
                </span>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => setShowUsdcQr(true)}
              className="py-3 px-4 rounded-2xl bg-neutral-900 border border-white/10 text-white font-medium text-xs flex items-center justify-center gap-2 hover:bg-neutral-800 transition active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Show QR & Deposit</span>
            </button>
            <Link
              href="/send"
              className="py-3 px-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium text-xs flex items-center justify-center gap-2 hover:bg-cyan-500/20 transition active:scale-[0.98]"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Send USDC</span>
            </Link>
          </div>

          {/* Card Details Box */}
          <div className="rounded-2xl p-4 bg-neutral-900/90 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Cardholder</span>
              <span className="font-semibold text-white">{user.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Network</span>
              <span className="font-semibold text-cyan-400">Solana Devnet (BitGo)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Deposit Address</span>
              <button
                onClick={() => copyToClipboard(displayUsdcAddress, 'usdc')}
                className="font-mono text-[11px] text-neutral-300 hover:text-white flex items-center gap-1"
              >
                <span>
                  {displayUsdcAddress.slice(0, 6)}...{displayUsdcAddress.slice(-6)}
                </span>
                <Copy className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Status</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active · Verified
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Card Header & Balance */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-400">Available Balance:</span>
              <span className="text-base font-black text-amber-400 font-mono">
                ₹ {displayInrBalance}
              </span>
            </div>
            <button
              onClick={() => setIsInrFrozen(!isInrFrozen)}
              className="text-[11px] flex items-center gap-1 text-neutral-400 hover:text-white px-2 py-0.5 rounded-lg bg-neutral-900 border border-white/10"
            >
              {isInrFrozen ? (
                <>
                  <Unlock className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Unfreeze</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Freeze</span>
                </>
              )}
            </button>
          </div>

          {/* Physical Card Design (Uploaded Card) */}
          <div
            onClick={() => setShowInrQr(true)}
            className={`relative rounded-[24px] overflow-hidden border border-amber-500/25 shadow-2xl shadow-amber-950/40 group cursor-pointer transition-all duration-300 hover:border-amber-400/50 hover:shadow-amber-500/20 active:scale-[0.99] ${
              isInrFrozen ? 'grayscale opacity-75' : ''
            }`}
          >
            <img
              src="/card-inr.jpg"
              alt="INR Wallet Card"
              className="w-full h-auto object-cover block"
            />

            {/* Quick Copy Badge */}
            <div className="absolute top-3 right-3 opacity-95 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(displayInrAccount, 'inr');
                }}
                className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-[11px] text-white flex items-center gap-1.5 hover:bg-black active:scale-95 transition"
                title="Copy UPI ID"
              >
                {copiedInr ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedInr ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Clickable Account Number Hotspot with Feedback */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(displayInrAccount, 'inr');
              }}
              className="absolute bottom-[23%] left-[7%] right-[10%] h-[18%] cursor-pointer flex items-center justify-end pr-2"
              title="Click to copy INR Account Number"
            >
              {copiedInr && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500 text-black font-bold shadow-lg animate-fade-in">
                  ✓ Copied!
                </span>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => setShowInrQr(true)}
              className="py-3 px-4 rounded-2xl bg-neutral-900 border border-white/10 text-white font-medium text-xs flex items-center justify-center gap-2 hover:bg-neutral-800 transition active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Show UPI QR</span>
            </button>
            <Link
              href="/pay"
              className="py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium text-xs flex items-center justify-center gap-2 hover:bg-amber-500/20 transition active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              <span>Scan & Pay</span>
            </Link>
          </div>

          {/* Card Details Box */}
          <div className="rounded-2xl p-4 bg-neutral-900/90 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Account Holder</span>
              <span className="font-semibold text-white">{user.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">UPI Handle</span>
              <button
                onClick={() => copyToClipboard(displayInrAccount, 'inr')}
                className="font-mono text-[11px] text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>{displayInrAccount}</span>
                <Copy className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Card Rail</span>
              <span className="font-semibold text-white">Finora Virtual PPI (RuPay)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Instant Settlement</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Enabled (NPCI / UPI 2.0)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Both Cards Preview (Stack) */}
      <div className="mt-8 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
          All Wallets
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => setActiveCardTab('usdc')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              activeCardTab === 'usdc'
                ? 'bg-neutral-800/90 border-cyan-500/50 shadow-lg'
                : 'bg-neutral-900/50 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-2">
              <img src="/card-usdc.jpg" alt="USDC" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] font-semibold text-white block">USDC Wallet</span>
            <span className="text-xs font-mono font-bold text-cyan-400">
              ${displayUsdcBalance}
            </span>
          </div>

          <div
            onClick={() => setActiveCardTab('inr')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              activeCardTab === 'inr'
                ? 'bg-neutral-800/90 border-amber-500/50 shadow-lg'
                : 'bg-neutral-900/50 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-2">
              <img src="/card-inr.jpg" alt="INR" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] font-semibold text-white block">INR Wallet</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              ₹{displayInrBalance}
            </span>
          </div>
        </div>
      </div>

      {/* 5. USDC QR MODAL */}
      {showUsdcQr && (
        <div
          onClick={() => setShowUsdcQr(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-neutral-900 border border-white/10 p-6 text-center shadow-2xl relative animate-scale-up"
          >
            <button
              onClick={() => setShowUsdcQr(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Receive Solana USDC</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Scan QR or copy address to deposit testnet USDC
            </p>

            <div className="p-4 rounded-2xl bg-white inline-block mb-4 shadow-lg">
              <QRCodeSVG value={displayUsdcAddress} size={180} />
            </div>

            <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-neutral-300 break-all mb-4">
              {displayUsdcAddress}
            </div>

            <button
              onClick={() => copyToClipboard(displayUsdcAddress, 'usdc')}
              className="w-full py-3 rounded-xl bg-[#00BAF2] hover:bg-[#00BAF2]/90 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              {copiedUsdc ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUsdc ? 'Copied Address!' : 'Copy Address'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. INR UPI QR MODAL */}
      {showInrQr && (
        <div
          onClick={() => setShowInrQr(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-neutral-900 border border-white/10 p-6 text-center shadow-2xl relative animate-scale-up"
          >
            <button
              onClick={() => setShowInrQr(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Receive UPI Payments</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Scan with GPay, PhonePe, Paytm, or BHIM
            </p>

            <div className="p-4 rounded-2xl bg-white inline-block mb-4 shadow-lg">
              <QRCodeSVG
                value={`upi://pay?pa=${displayInrAccount}&pn=${encodeURIComponent(user.name || 'User')}`}
                size={180}
              />
            </div>

            <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[12px] text-amber-400 font-bold mb-4">
              {displayInrAccount}
            </div>

            <button
              onClick={() => copyToClipboard(displayInrAccount, 'inr')}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              {copiedInr ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedInr ? 'Copied UPI ID!' : 'Copy UPI ID'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
