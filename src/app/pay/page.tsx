'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Scan,
  Camera,
  ArrowLeft,
  CheckCircle2,
  Store,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Lock,
  ArrowRight,
  Check,
  Zap,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MerchantPreset {
  id: string;
  name: string;
  upiId: string;
  category: string;
  defaultAmount?: number;
  logoColor: string;
}

const PRESET_MERCHANTS: MerchantPreset[] = [
  { id: 'sol-merchant', name: 'Solana USDC Merchant', upiId: 'CG3eYXBggS5uxDpg2RETrR2ofhpMXTRaT65HWUhve2AJ', category: 'External USDC Account', defaultAmount: 10, logoColor: 'from-cyan-500 to-blue-600' },
  { id: 'swiggy', name: 'Swiggy Food & Instamart', upiId: 'swiggy@icici', category: 'Food & Groceries', defaultAmount: 450, logoColor: 'from-orange-500 to-amber-600' },
  { id: 'zomato', name: 'Zomato Dining & Delivery', upiId: 'zomato@hdfcbank', category: 'Food Delivery', defaultAmount: 620, logoColor: 'from-red-500 to-rose-600' },
  { id: 'starbucks', name: 'Tata Starbucks India', upiId: 'starbucks@axisbank', category: 'Cafe & Beverages', defaultAmount: 380, logoColor: 'from-emerald-600 to-teal-700' },
  { id: 'kirana', name: 'Sharma Kirana Store', upiId: 'kirana@paytm', category: 'Daily Essentials', defaultAmount: 250, logoColor: 'from-blue-500 to-indigo-600' },
  { id: 'chaipoint', name: 'Chai Point Outlets', upiId: 'chaipoint@yesbank', category: 'Tea & Snacks', defaultAmount: 120, logoColor: 'from-amber-500 to-orange-600' },
];

export default function ScanAndPayPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Scanner UI states
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const qrRegionId = 'finora-qr-reader';

  // Payment Form States
  const [scannedUpi, setScannedUpi] = useState('swiggy@icici');
  const [merchantName, setMerchantName] = useState('Swiggy Food & Instamart');
  const [merchantCategory, setMerchantCategory] = useState('Food & Groceries');
  const [inrAmount, setInrAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState<'USDC' | 'INR'>('USDC');

  // Conversion Quote
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Conversion & Payment Flow State
  // 'IDLE' -> 'CONVERTING' -> 'CONVERTED' -> 'ENTER_PIN' -> 'PAYING' -> 'SUCCESS'
  const [flowState, setFlowState] = useState<'IDLE' | 'CONVERTING' | 'CONVERTED' | 'ENTER_PIN' | 'PAYING' | 'SUCCESS'>('IDLE');
  const [upiPin, setUpiPin] = useState('1234');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Load user
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
    const num = parseFloat(inrAmount);
    if (isNaN(num) || num <= 0) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    setErrorMessage('');
    // If user changes amount after converting, reset conversion state
    if (flowState === 'CONVERTED') {
      setFlowState('IDLE');
    }

    fetch('/api/pay/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flow: paymentMethod === 'USDC' ? 'USDC_TO_INR' : 'INR_TO_INR',
        amount: num,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.quote) setQuote(data.quote);
      })
      .catch((err) => console.error('Quote error:', err))
      .finally(() => setQuoteLoading(false));
  }, [inrAmount, paymentMethod]);

  // Handle QR scanning with html5-qrcode
  useEffect(() => {
    let html5QrCode: any = null;

    if (scannerActive) {
      import('html5-qrcode')
        .then((module) => {
          const Html5Qrcode = module.Html5Qrcode;
          html5QrCode = new Html5Qrcode(qrRegionId);

          html5QrCode
            .start(
              { facingMode: 'environment' },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
              },
              (decodedText: string) => {
                handleScannedData(decodedText);
                html5QrCode
                  .stop()
                  .then(() => setScannerActive(false))
                  .catch(() => {});
              },
              (errorMessage: string) => {
                // scanning frame error, ignore
              }
            )
            .catch((err: any) => {
              console.warn('Camera start error:', err);
              setCameraError('Camera access not granted or not available. Use presets below.');
              setScannerActive(false);
            });
        })
        .catch(() => {
          setCameraError('Unable to load QR scanner module. Use presets below.');
          setScannerActive(false);
        });
    }

    return () => {
      if (html5QrCode) {
        try {
          html5QrCode.stop().catch(() => {});
        } catch {}
      }
    };
  }, [scannerActive]);

  const handleScannedData = (rawText: string) => {
    // UPI QR format: upi://pay?pa=merchant@upi&pn=Merchant%20Name&am=500
    let upi = rawText.trim();
    let name = '';
    let amt = '';

    if (rawText.startsWith('upi://pay?')) {
      const urlParams = new URLSearchParams(rawText.replace('upi://pay?', ''));
      upi = urlParams.get('pa') || upi;
      name = urlParams.get('pn') || '';
      amt = urlParams.get('am') || '';
    }

    setScannedUpi(upi);
    if (amt && !isNaN(parseFloat(amt))) {
      setInrAmount(amt);
    }

    // Resolve merchant
    fetch('/api/pay/merchant/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upiId: upi }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.merchant) {
          setMerchantName(data.merchant.payeeName);
          setMerchantCategory(data.merchant.category);
        } else if (name) {
          setMerchantName(decodeURIComponent(name));
        }
      })
      .catch(() => {
        if (name) setMerchantName(decodeURIComponent(name));
      });
  };

  const handleSelectPreset = (preset: MerchantPreset) => {
    setScannedUpi(preset.upiId);
    setMerchantName(preset.name);
    setMerchantCategory(preset.category);
    if (preset.defaultAmount) {
      setInrAmount(preset.defaultAmount.toString());
    }
    setErrorMessage('');
    setFlowState('IDLE');
  };

  // Step 1 for Flow A: Convert USDC to INR
  const handleConvert = async () => {
    setFlowState('CONVERTING');
    setErrorMessage('');
    try {
      const res = await fetch('/api/pay/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: 'USDC_TO_INR',
          amount: parseFloat(inrAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Conversion failed');
      }

      await loadUser();
      setFlowState('CONVERTED');
    } catch (err: any) {
      setErrorMessage(err.message);
      setFlowState('IDLE');
    }
  };

  // Step 2 for Flow A OR Direct Step for Flow C / Solana USDC Payment: Pay with UPI PIN
  const handlePay = async () => {
    setFlowState('PAYING');
    setErrorMessage('');

    try {
      const isSolana = scannedUpi && scannedUpi.length >= 32 && !scannedUpi.includes('@');
      const res = await fetch('/api/pay/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: isSolana ? 'FLOW_D' : (paymentMethod === 'USDC' ? 'FLOW_A' : 'FLOW_C'),
          amount: isSolana ? (quote?.baseUsdc || parseFloat(inrAmount)) : parseFloat(inrAmount),
          usdcAmount: quote?.totalUsdcToDeduct || (parseFloat(inrAmount) / 83.5),
          paymentMethod,
          merchantUpiId: scannedUpi,
          recipientAddress: isSolana ? scannedUpi : undefined,
          merchantName,
          pin: upiPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment execution failed');
      }

      setPaymentResult(data);
      setFlowState('SUCCESS');
      await loadUser();

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      setErrorMessage(err.message);
      setFlowState(paymentMethod === 'USDC' ? 'CONVERTED' : 'IDLE');
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
        <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          <Scan className="w-3 h-3" />
          <span>Scan & Pay (UPI)</span>
        </div>
      </div>

      {flowState === 'SUCCESS' && paymentResult ? (
        /* SUCCESS SCREEN: "Merchant sees: {user_name} paid ₹X" */
        <div className="glass-card rounded-3xl p-6 text-center border border-emerald-500/30 shadow-2xl space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Payment Successful
            </span>
            <h1 className="text-3xl font-black text-white mt-2">
              ₹{paymentResult.amount.toFixed(2)}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Paid to <strong className="text-white">{paymentResult.merchantName}</strong>
            </p>
          </div>

          {/* Core Finora Thesis Highlight: What Merchant Sees */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c2419] to-[#040e0a] border border-emerald-500/40 text-left space-y-2 shadow-md">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Merchant UPI Notification</span>
            </div>
            <p className="text-sm font-bold text-white font-mono bg-black/40 p-2.5 rounded-xl border border-white/10">
              &quot;{paymentResult.merchantSees}&quot;
            </p>
            <p className="text-[10px] text-slate-400">
              Instant settlement sent to merchant&apos;s bank account via Indian UPI network.
            </p>
          </div>

          {/* Payment Details */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Merchant Recipient</span>
              <span className="font-mono text-slate-200 truncate max-w-[200px]">{paymentResult.recipientAddress || paymentResult.merchantUpiId}</span>
            </div>
            {paymentResult.utr && (
              <div className="flex justify-between">
                <span className="text-slate-400">Bank UTR Reference</span>
                <span className="font-mono text-cyan-300 font-semibold">{paymentResult.utr}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Paid Via</span>
              <span className="text-slate-200 font-semibold">
                {paymentMethod === 'USDC' ? 'USDC (BitGo Main Account) → Settlement' : 'Direct INR PPI Wallet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payer</span>
              <span className="text-slate-200 font-semibold">{user.name}</span>
            </div>
          </div>

          {/* BitGo Main Account Withdrawal Details */}
          {paymentResult.bitgoApiTriggered && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-left text-xs space-y-2 shadow-md">
              <div className="flex items-center justify-between text-cyan-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>BitGo Main Account Withdrawal Triggered</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  HTTP {paymentResult.bitgoStatus || 200}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Finora Main Account:</span>
                <span className="font-mono text-cyan-200">{paymentResult.fromWalletId?.slice(0, 12)}...</span>
              </div>
              {paymentResult.recipientAddress && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>External USDC Account:</span>
                  <span className="font-mono text-cyan-200">{paymentResult.recipientAddress?.slice(0, 12)}...</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Transaction Hash:</span>
                <span className="font-mono text-slate-200">{paymentResult.txHash?.slice(0, 16)}...</span>
              </div>
              {paymentResult.solanaExplorerUrl && (
                <div className="pt-1 border-t border-cyan-500/20">
                  <a
                    href={paymentResult.solanaExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#00BAF2] hover:underline font-semibold"
                  >
                    <span>View on Solana Devnet Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setFlowState('IDLE');
                setPaymentResult(null);
                setErrorMessage('');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00BAF2] text-slate-950 font-bold text-xs hover:scale-[1.01] transition shadow-lg shadow-emerald-500/20"
            >
              Make Another Payment
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
        /* SCAN & PAY MAIN FLOW */
        <div className="space-y-4">
          {/* CAMERA QR SCANNER VIEWPORT */}
          <div className="rounded-3xl p-4 bg-slate-900/80 border border-white/10 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#00BAF2]" />
                <span>UPI QR Scanner</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setCameraError('');
                  setScannerActive(!scannerActive);
                }}
                className={`text-xs px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
                  scannerActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-[#00BAF2]/20 text-[#00BAF2] border border-[#00BAF2]/40 hover:bg-[#00BAF2]/30'
                }`}
              >
                {scannerActive ? 'Close Camera' : 'Open Camera'}
              </button>
            </div>

            {/* Video container for html5-qrcode */}
            <div
              id={qrRegionId}
              className={`rounded-2xl overflow-hidden bg-black ${
                scannerActive ? 'min-h-[240px] border border-cyan-500/50' : 'hidden'
              }`}
            />

            {!scannerActive && (
              <div className="py-6 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                  <Scan className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-slate-300">
                  Scan any Indian UPI merchant QR code
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Swiggy, Zomato, Starbucks, BharatPe, Paytm, PhonePe, or local kirana
                </p>
              </div>
            )}

            {cameraError && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* QUICK MERCHANT PRESETS (For 1-click test scanning) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quick Test Merchants
              </span>
              <span className="text-[10px] text-cyan-400">1-Click Test Scan</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_MERCHANTS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectPreset(m)}
                  className={`p-2 rounded-xl text-center border transition group ${
                    scannedUpi === m.upiId
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm'
                      : 'bg-slate-900/60 border-white/5 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${m.logoColor} text-white font-black text-xs flex items-center justify-center mx-auto mb-1 shadow`}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <span className="block text-[10px] font-semibold truncate">
                    {m.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* MERCHANT INFO CARD */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white truncate">{merchantName}</h3>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
                <p className="text-[10px] font-mono text-cyan-300 truncate">{scannedUpi}</p>
              </div>
            </div>

            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase font-semibold shrink-0">
              {merchantCategory}
            </span>
          </div>

          {/* ERROR ALERT */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PAYMENT DETAILS FORM */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-4 shadow-xl">
            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Amount to Pay (INR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={inrAmount}
                  onChange={(e) => setInrAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-2xl font-black text-white focus:outline-none focus:border-[#00BAF2] transition"
                />
              </div>

              {/* Amount Quick Presets */}
              <div className="flex items-center gap-1.5 mt-2">
                {['100', '250', '500', '1000', '2500'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInrAmount(amt)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      inrAmount === amt
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* PAYMENT METHOD SELECTOR */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Method 1: USDC */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('USDC')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    paymentMethod === 'USDC'
                      ? 'bg-[#00BAF2]/15 border-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-300">Pay with USDC</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                      Flow A
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Avail: <strong className="text-white">${Number(user.virtualUsdcBalance || 0).toFixed(2)}</strong>
                  </p>
                </button>

                {/* Method 2: INR */}
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
                      Flow C
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Avail: <strong className="text-white">₹{Number(user.virtualInrBalance || 0).toFixed(2)}</strong>
                  </p>
                </button>
              </div>
            </div>

            {/* CONVERSION QUOTE BOX */}
            {quote && paymentMethod === 'USDC' && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-white/5">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conversion Rate</span>
                  </span>
                  <span className="font-semibold text-white">1 USDC = ₹86.42</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Merchant Receives</span>
                  <span className="font-bold text-emerald-400">₹{quote.inrAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Base USDC</span>
                  <span className="font-mono text-slate-200">{quote.baseUsdc.toFixed(4)} USDC</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Platform Fee (1%)</span>
                  <span className="font-mono text-slate-300">+{quote.platformFeeUsdc.toFixed(4)} USDC</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>TDS 1% (Sec 194S)</span>
                  <span className="font-mono text-slate-300">+{quote.tdsUsdc.toFixed(4)} USDC</span>
                </div>

                <div className="flex justify-between text-white font-bold pt-1.5 border-t border-white/10 text-sm">
                  <span>Total to Deduct</span>
                  <span className="font-mono text-[#00BAF2]">{quote.totalUsdcToDeduct.toFixed(4)} USDC</span>
                </div>
              </div>
            )}

            {/* UPI PIN INPUT (When ready to pay) */}
            {(flowState === 'CONVERTED' || paymentMethod === 'INR') && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 animate-fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Enter UPI PIN</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Default: 1234</span>
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={upiPin}
                  onChange={(e) => setUpiPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono text-xl tracking-[0.5em] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* DYNAMIC ACTION BUTTONS */}
            <div className="pt-2">
              {paymentMethod === 'USDC' ? (
                /* Flow A: 2-step (Convert -> Pay) */
                flowState !== 'CONVERTED' ? (
                  <button
                    type="button"
                    onClick={handleConvert}
                    disabled={flowState === 'CONVERTING' || !quote}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#002970] via-[#00BAF2] to-cyan-400 text-slate-950 font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-[#00BAF2]/25 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {flowState === 'CONVERTING' ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                        <span>Converting USDC to INR...</span>
                      </span>
                    ) : (
                      <>
                        <span>Convert {quote?.totalUsdcToDeduct || ''} USDC</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-semibold flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Converted to INR in Virtual Ledger ✓</span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={(flowState as string) === 'PAYING' || !upiPin}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {(flowState as string) === 'PAYING' ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                          <span>Processing UPI Payment...</span>
                        </span>
                      ) : (
                        <span>Pay ₹{inrAmount} to {merchantName.split(' ')[0]}</span>
                      )}
                    </button>
                  </div>
                )
              ) : (
                /* Flow C: Direct INR payment */
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={flowState === 'PAYING' || !upiPin}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {flowState === 'PAYING' ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                      <span>Processing UPI Payment...</span>
                    </span>
                  ) : (
                    <span>Pay ₹{inrAmount} with INR</span>
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
