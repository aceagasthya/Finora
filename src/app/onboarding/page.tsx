'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ShieldCheck,
  Wallet,
  QrCode,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  CreditCard,
  Building,
  User,
  Calendar,
  MapPin,
  FileCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { copyTextToClipboard } from '@/lib/clipboard';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // KYC Form State (Mocked with sensible defaults for quick testing)
  const [name, setName] = useState('');
  const [pan, setPan] = useState('ABCDE1234F');
  const [aadhaar, setAadhaar] = useState('8921 4402 1092');
  const [dob, setDob] = useState('1996-08-15');
  const [address, setAddress] = useState('402, 100ft Rd, Indiranagar, Bengaluru, Karnataka 560038');

  // Generated Accounts
  const [usdcAddress, setUsdcAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [copiedUsdc, setCopiedUsdc] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.push('/login');
        } else {
          setUser(data.user);
          setName(data.user.name || '');
          if (data.user.kycStatus === 'verified' && data.user.usdcDepositAddress && data.user.inrUpiId) {
            setUsdcAddress(data.user.usdcDepositAddress);
            setUpiId(data.user.inrUpiId);
            setStep(2);
          }
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setInitialLoading(false));
  }, [router]);

  const [loadingStep, setLoadingStep] = useState('');

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStep('Submitting KYC details & generating M2P UPI ID...');
    try {
      // Step 1: Submit KYC Form -> Auto-approved + Creates M2P PPI Wallet & UPI ID
      const kycRes = await fetch('/api/onboarding/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          pan,
          aadhaar,
          dob,
          address,
        }),
      });

      const kycData = await kycRes.json();
      if (!kycRes.ok) throw new Error(kycData.error || 'KYC verification failed');

      // Step 2: Explicitly trigger BitGo API to create USDC deposit address on BitGo testnet
      setLoadingStep('Triggering BitGo API (POST /api/bitgo/create-address)...');
      const cleanLabel = `finora-${(name || kycData.user?.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const bitgoRes = await fetch('/api/bitgo/create-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: kycData.user.id,
          label: cleanLabel,
          force: true, // Guarantees BitGo API is invoked on testnet
        }),
      });

      const bitgoData = await bitgoRes.json();
      if (!bitgoRes.ok) throw new Error(bitgoData.error || 'BitGo address creation failed');

      console.log('[Onboarding] BitGo Address created successfully:', bitgoData.address);

      setUser({
        ...kycData.user,
        usdcDepositAddress: bitgoData.address,
        bitgoAddressId: bitgoData.addressId,
      });
      setUsdcAddress(bitgoData.address);
      setUpiId(kycData.user.inrUpiId);
      setStep(2);
    } catch (err: any) {
      console.error('[Onboarding] Error:', err);
      alert(err.message || 'Onboarding address creation failed');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const copyToClipboard = async (text: string, type: 'usdc' | 'upi') => {
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      if (type === 'usdc') {
        setCopiedUsdc(true);
        setTimeout(() => setCopiedUsdc(false), 2000);
      } else {
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2000);
      }
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00BAF2] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8 px-4">
      {/* Header Stepper */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 p-2 mb-3 shadow-lg shadow-[#00BAF2]/20">
          <img src="/finora-logo.png" alt="Finora" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          <ShieldCheck className="w-8 h-8 text-[#00BAF2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Finora Onboarding</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Complete KYC to provision your BitGo USDC deposit address & M2P UPI ID
        </p>
      </div>

      {/* Progress Pills */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            step === 1
              ? 'bg-[#00BAF2]/20 text-[#00BAF2] border border-[#00BAF2]/40'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px]">
            {step > 1 ? <Check className="w-3 h-3 text-emerald-400" /> : '1'}
          </span>
          <span>1. Instant KYC Form</span>
        </div>
        <div className="w-8 h-0.5 bg-slate-800" />
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            step === 2
              ? 'bg-[#00BAF2]/20 text-[#00BAF2] border border-[#00BAF2]/40'
              : 'bg-slate-900 text-slate-500 border border-slate-800'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px]">
            2
          </span>
          <span>2. Issued Accounts</span>
        </div>
      </div>

      {step === 1 ? (
        /* Step 1: KYC Form */
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#00BAF2]" />
                <span>Identity Verification (Mocked)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Compliant verification under Indian RBI PPI & Crypto guidelines
              </p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Auto-Approved
            </span>
          </div>

          <form onSubmit={handleKycSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikramaditya Roy"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#00BAF2] transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  PAN Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#00BAF2] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Aadhaar Number
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                    placeholder="8921 4402 1092"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-[#00BAF2] transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#00BAF2] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Residential Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address with PIN code"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#00BAF2] transition"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5 mt-4">
              <Sparkles className="w-4 h-4 text-[#00BAF2] flex-shrink-0 mt-0.5" />
              <span>
                Submission automatically issues a real BitGo testnet Solana deposit address for USDC and registers your Indian UPI handle (<code className="text-[#00BAF2] font-mono">{name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'username'}@finora</code>).
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#002970] via-[#00BAF2] to-cyan-400 text-slate-950 font-bold text-sm hover:scale-[1.01] active:scale-98 transition-all shadow-lg shadow-[#00BAF2]/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent"></span>
                  <span>{loadingStep || 'Provisioning BitGo & M2P Accounts...'}</span>
                </span>
              ) : (
                <>
                  <span>Submit KYC & Provision Accounts</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Step 2: Issued Accounts Preview */
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl space-y-6">
          <div className="text-center pb-4 border-b border-white/10">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">KYC Verified & Accounts Provisioned!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your BitGo USDC deposit address and M2P UPI ID are ready to use.
            </p>
          </div>

          {/* Account 1: BitGo USDC Address Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 rounded-lg bg-white shrink-0">
              <QRCodeSVG value={usdcAddress || 'usdc-address'} size={72} />
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  BitGo USDC Deposit Address (Solana)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Live Testnet
                </span>
              </div>
              <p className="text-xs font-mono text-slate-300 break-all bg-slate-900 px-2 py-1 rounded border border-slate-800">
                {usdcAddress || 'Generating...'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Send Solana USDC (OFC Token) here. Deposits credit automatically via BitGo webhook.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(usdcAddress, 'usdc')}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
              title="Copy Address"
            >
              {copiedUsdc ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Account 2: M2P UPI ID Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 rounded-lg bg-white shrink-0">
              <QRCodeSVG value={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}`} size={72} />
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Indian UPI Handle (M2P Wallet)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Active VPA
                </span>
              </div>
              <p className="text-sm font-bold font-mono text-white bg-slate-900 px-2 py-1 rounded border border-slate-800 inline-block">
                {upiId || 'Generating...'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Default mock UPI PIN: <span className="text-emerald-400 font-mono font-bold">1234</span>
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(upiId, 'upi')}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
              title="Copy UPI ID"
            >
              {copiedUpi ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Step 4: Redirect Button to Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-[#00BAF2] text-slate-950 font-bold text-sm hover:scale-[1.01] active:scale-98 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
          >
            <span>Proceed to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
