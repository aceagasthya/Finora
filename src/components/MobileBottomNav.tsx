'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, CreditCard, User } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Hide bottom navigation on auth pages or onboarding
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/onboarding'
  ) {
    return null;
  }

  const isHome = pathname === '/dashboard';
  const isHistory = pathname === '/history';
  const isCards = pathname === '/cards';
  const isProfile = pathname === '/profile';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto select-none">
      {/* Dock Container */}
      <div className="w-full bg-[#0c0d10]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 pt-2 pb-1.5 shadow-[0_-12px_35px_rgba(0,0,0,0.95)]">
        <div className="flex items-center justify-between">
          {/* 1. Home */}
          <Link
            href="/dashboard"
            className={`flex-1 flex flex-col items-center justify-center py-1 transition group ${
              isHome ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Home className={`w-5 h-5 ${isHome ? 'stroke-[2.5] text-white' : 'stroke-[1.8]'}`} />
            <span className={`text-[10px] mt-1 font-medium ${isHome ? 'text-white font-semibold' : ''}`}>
              Home
            </span>
          </Link>

          {/* 2. History */}
          <Link
            href="/history"
            className={`flex-1 flex flex-col items-center justify-center py-1 transition group ${
              isHistory ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <History className={`w-5 h-5 ${isHistory ? 'stroke-[2.5] text-white' : 'stroke-[1.8]'}`} />
            <span className={`text-[10px] mt-1 font-medium ${isHistory ? 'text-white font-semibold' : ''}`}>
              History
            </span>
          </Link>

          {/* 3. Center: Large Tactile Viewfinder Scan Button */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <Link
              href="/pay"
              className="flex flex-col items-center group -mt-3.5"
              title="Scan & Pay"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#1e2026] to-[#121316] border border-white/20 flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] group-hover:scale-105 active:scale-95 transition-all">
                {/* Viewfinder Icon: [ - ] */}
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
              <span className="text-[10px] mt-1 font-medium text-neutral-400 group-hover:text-white">
                Scan
              </span>
            </Link>
          </div>

          {/* 4. Cards */}
          <Link
            href="/dashboard"
            className={`flex-1 flex flex-col items-center justify-center py-1 transition group ${
              isCards ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <CreditCard className={`w-5 h-5 ${isCards ? 'stroke-[2.5] text-white' : 'stroke-[1.8]'}`} />
            <span className={`text-[10px] mt-1 font-medium ${isCards ? 'text-white font-semibold' : ''}`}>
              Cards
            </span>
          </Link>

          {/* 5. Profile */}
          <Link
            href="/profile"
            className={`flex-1 flex flex-col items-center justify-center py-1 transition group ${
              isProfile ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <User className={`w-5 h-5 ${isProfile ? 'stroke-[2.5] text-white' : 'stroke-[1.8]'}`} />
            <span className={`text-[10px] mt-1 font-medium ${isProfile ? 'text-white font-semibold' : ''}`}>
              Profile
            </span>
          </Link>
        </div>

        {/* iPhone style home indicator bar */}
        <div className="w-28 h-1 bg-white/40 rounded-full mx-auto mt-2" />
      </div>
    </div>
  );
}
