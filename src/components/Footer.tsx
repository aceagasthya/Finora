'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on splash screen and auth screens for clean mobile app feel
  if (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/onboarding') {
    return null;
  }

  return (
    <footer className="border-t border-[#141B2B] py-6 text-center text-xs text-slate-500 bg-[#000000] pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Finora Payments</span>
          <span>•</span>
          <span className="text-[#00BAF2] font-medium">Paytm-Grade UPI Switching Engine</span>
          <span>•</span>
          <span className="text-[#00D287]">Section 194S (1% TDS)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span>Solana Devnet Test Harness</span>
          <span>•</span>
          <span>M2P PPI Mock Integration</span>
        </div>
      </div>
    </footer>
  );
}
