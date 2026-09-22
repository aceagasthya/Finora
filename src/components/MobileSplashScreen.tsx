'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Sparkles,
  Smartphone,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Wifi,
  Battery,
  Shield,
  CreditCard,
  QrCode,
  Zap,
} from 'lucide-react';

export default function MobileSplashScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'device' | 'fullscreen'>('device');
  const [currentTime, setCurrentTime] = useState('9:41');

  useEffect(() => {
    // Check if user is already logged in
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    // Update digital clock in status bar
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setCurrentTime(`${hours % 12 || 12}:${minutes}`);
  }, []);

  const handleLetsStated = async () => {
    setLoading(true);
    try {
      if (currentUser) {
        router.push('/dashboard');
        return;
      }

      // Auto-authenticate with demo user for seamless instant evaluation
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@finora.io', password: 'password123' }),
      });

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // Reusable Native Mobile Screen Content (Identical to User's Reference Image)
  const renderNativeMobileScreen = (isFramed: boolean) => (
    <div
      className={`relative w-full ${
        isFramed ? 'h-[780px] max-w-[390px] rounded-[48px]' : 'min-h-screen max-w-lg'
      } mx-auto bg-[#000000] overflow-hidden flex flex-col justify-between select-none shadow-2xl transition-all duration-300`}
    >
      {/* 1. LAYER: 3D Faceted Origami Polygon Vectors & Subtle Wave Ribbons */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 390 844"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Origami Charcoal Gradients */}
          <linearGradient id="origamiTopLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#181c26" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#0d1017" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="origamiTopRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#141822" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#090b10" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="origamiMidLeft" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#1a202c" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#0d1117" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="origamiBottomRight" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1a202e" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#0e1219" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.01" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Origami Triangular Facets (Top Left) */}
        <polygon points="0,0 280,0 160,260 0,180" fill="url(#origamiTopLeft)" />
        <polygon points="0,180 160,260 40,360 0,330" fill="url(#origamiMidLeft)" />

        {/* Origami Triangular Facets (Right & Center) */}
        <polygon points="390,80 390,380 260,280 320,110" fill="url(#origamiTopRight)" />
        <polygon points="260,280 390,380 280,480 180,380" fill="url(#origamiMidLeft)" />

        {/* Origami Triangular Facets (Bottom Right Folds) */}
        <polygon points="390,520 390,844 190,844 240,680" fill="url(#origamiBottomRight)" />
        <polygon points="240,680 190,844 100,760" fill="url(#origamiTopLeft)" />
        <polygon points="390,440 390,620 280,560" fill="url(#origamiTopRight)" />

        {/* Subtle Horizontal Curved Wave Ribbons (Flowing behind center logo) */}
        <g stroke="url(#waveGrad)" fill="none" strokeWidth="0.8">
          <path d="M-50,340 C80,310 200,380 440,320" />
          <path d="M-50,348 C80,316 200,386 440,326" />
          <path d="M-50,356 C80,322 200,392 440,332" />
          <path d="M-50,364 C80,328 200,398 440,338" />
          <path d="M-50,372 C80,334 200,404 440,344" />
          <path d="M-50,380 C80,340 200,410 440,350" />
          <path d="M-50,388 C80,346 200,416 440,356" />
          <path d="M-50,396 C80,352 200,422 440,362" />
          <path d="M-50,404 C80,358 200,428 440,368" />
          <path d="M-50,412 C80,364 200,434 440,374" />
          <path d="M-50,420 C80,370 200,440 440,380" />
          <path d="M-50,428 C80,376 200,446 440,386" />
        </g>
      </svg>

      {/* 2. Mobile Status Bar (9:41, Cellular, Wi-Fi, Battery) */}
      <div className="relative z-20 flex items-center justify-between px-7 pt-4 pb-2 text-white/90 text-xs font-semibold">
        <span>{currentTime}</span>
        {/* Dynamic Island / Camera Notch on framed view */}
        {isFramed && (
          <div className="w-24 h-5 bg-black rounded-full border border-neutral-900 mx-auto flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-neutral-900 mr-2" />
            <div className="w-2 h-2 rounded-full bg-neutral-800" />
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="font-bold text-[10px] tracking-tight">5G</span>
          <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
          <Battery className="w-4 h-4 stroke-[2.2]" />
        </div>
      </div>

      {/* 3. Center Section: 3D Faceted Origami "F" Logo + "Finora" Wordmark */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 my-auto px-6 text-center">
        {/* 3D White Origami "F" Logo with Diamond Dot */}
        <div className="relative group cursor-pointer transition-transform duration-500 hover:scale-105 active:scale-95 mb-6">
          <div className="w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
            <img
              src="/finora-logo.png"
              alt="Finora"
              className="w-full h-full object-contain drop-shadow-[0_15px_35px_rgba(255,255,255,0.18)]"
            />
          </div>
        </div>

        {/* Elegant "Finora" Serif Wordmark (Matching Reference Image) */}
        <h1 className="font-finora-serif text-4xl sm:text-5xl font-normal tracking-wide text-white drop-shadow-md">
          Finora
        </h1>
      </div>

      {/* 4. Bottom Section: "Let's Stated" Pill Button & "Welcome to Finora mobile app" */}
      <div className="relative z-20 flex flex-col items-center px-8 pb-12 pt-4 w-full text-center">
        {/* "Let's Stated" Pill Button (Charcoal with subtle border) */}
        <button
          onClick={handleLetsStated}
          disabled={loading}
          className="w-full max-w-[290px] py-3.5 px-6 rounded-2xl bg-[#2a2c31] hover:bg-[#34373e] active:scale-95 text-white font-semibold text-sm tracking-wide border border-[#3f434c] shadow-xl shadow-black/70 transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Let&apos;s Stated</span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>

        {/* Subtitle text */}
        <p className="text-xs sm:text-sm text-slate-400 font-normal mt-3.5 tracking-wide">
          Welcome to Finora mobile app
        </p>

        {/* User Status pill if already logged in */}
        {currentUser && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#00BAF2] bg-[#00142b]/60 border border-[#00BAF2]/30 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            <span>Active Session: {currentUser.name}</span>
          </div>
        )}
      </div>

      {/* Native Home Indicator Bar */}
      <div className="relative z-20 mx-auto mb-2 w-32 h-1 bg-white/30 rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col items-center justify-center py-6 px-3 sm:px-6 relative overflow-hidden">
      {/* Background Ambience on Desktop */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#002970]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-[#00BAF2]/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Floating Utility Bar (Desktop only) */}
      <div className="hidden lg:flex items-center justify-between max-w-5xl w-full mb-6 z-30 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#000000] border border-[#141B2B] p-1 flex items-center justify-center">
            <img src="/finora-logo.png" alt="Finora" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Finora Mobile App</span>
            <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-[#002970] text-[#00BAF2] border border-[#00BAF2]/30 font-semibold">
              Live Reference
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'device' ? 'fullscreen' : 'device')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#090D18] border border-[#172238] hover:border-[#00BAF2]/40 text-xs text-slate-300 transition"
          >
            {viewMode === 'device' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>Fullscreen Splash</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>Phone Mockup</span>
              </>
            )}
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#002970] to-[#00BAF2] text-xs font-bold text-white shadow-lg shadow-[#00BAF2]/20 hover:scale-105 transition"
          >
            <span>Launch Web App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Content Viewport */}
      <div className="relative z-20 w-full flex flex-col lg:flex-row items-center justify-center gap-8 max-w-6xl mx-auto">
        {/* Phone Frame Mockup (or Fullscreen Container) */}
        <div
          className={`relative transition-all duration-300 ${
            viewMode === 'device'
              ? 'p-3 rounded-[54px] bg-gradient-to-b from-[#2e313a] via-[#1a1c22] to-[#0d0e12] shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(0,186,242,0.15)] border border-[#3e424c]'
              : 'w-full max-w-md'
          }`}
        >
          {/* Inner Phone Screen */}
          {renderNativeMobileScreen(viewMode === 'device')}
        </div>

        {/* Feature Companion Cards (Desktop view for pair programming showcase) */}
        <div className="hidden lg:flex flex-col gap-4 max-w-md text-left animate-fade-in">
          <div className="p-5 rounded-2xl bg-[#060911] border border-[#141B2B] shadow-xl">
            <div className="flex items-center gap-2 text-[#00BAF2] font-bold text-sm mb-1.5">
              <Smartphone className="w-4 h-4" />
              <span>Mobile-First UPI × Solana Architecture</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed according to the authentic Finora mobile design reference. Users spend Solana USDC via BitGo testnet, and Indian merchants receive instant INR in their bank accounts via UPI.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#060911] border border-[#141B2B] shadow-xl">
            <div className="flex items-center gap-2 text-[#00D287] font-bold text-sm mb-1.5">
              <CreditCard className="w-4 h-4" />
              <span>Paytm Dual-Wallet Dashboard</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Features two cards in Paytm dark theme: one for Solana USDC BitGo balance with EMV chip, and one for Indian UPI INR Wallet with verified UPI ID and instant scanning.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#060911] border border-[#141B2B] shadow-xl">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-1.5">
              <QrCode className="w-4 h-4" />
              <span>Instant QR Scanner with SoundBox Chime</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan Swiggy, Zomato, Starbucks, or local kirana QR codes on mobile with simulated camera viewfinder, 60s locked quotes, and Web Audio UPI chime.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleLetsStated}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#002970] via-[#00BAF2] to-[#00D287] text-slate-950 font-extrabold text-xs text-center hover:scale-[1.02] active:scale-98 transition shadow-lg shadow-[#00BAF2]/25 flex items-center justify-center gap-2"
            >
              <span>Instant Demo Login (Alice)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/login"
              className="py-3 px-4 rounded-xl bg-[#0B101E] border border-[#162035] text-white font-semibold text-xs hover:border-slate-600 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
