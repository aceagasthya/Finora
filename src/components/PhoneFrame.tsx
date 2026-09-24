'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import StatusBar from './StatusBar';
import MobileBottomNav from './MobileBottomNav';
import { getUserAvatarUrl } from '@/lib/avatar';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, [pathname]);

  const isDashboard = pathname === '/dashboard';
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/onboarding';

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-0 sm:p-4 select-none relative overflow-hidden">
      {/* Outer desktop background */}
      <div
        className="fixed inset-0 pointer-events-none -z-20 bg-[#000000]"
        style={{
          backgroundImage: `url('/bg-pattern.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.35,
        }}
      />

      {/* 400px Phone Container */}
      <div
        className="phone-frame w-full sm:max-w-[400px] rounded-none sm:rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.12)] border-0 sm:border sm:border-white/10 relative flex flex-col h-screen sm:h-[844px] bg-[#000000]"
        style={{ maxWidth: '400px' }}
      >
        {/* Phone Fixed Base Background Pattern (Guaranteed render on iOS Safari & Android) */}
        <div
          className="absolute inset-0 pointer-events-none -z-10 bg-[#000000]"
          style={{
            backgroundImage: `url('/bg-pattern.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* 1. Phone Top: Status Bar (time, dynamic island, wifi, battery) */}
        <StatusBar />

        {/* 2. Top Header: Finora Logo on Left Corner + Profile on Right */}
        <div className="w-full px-4 py-2 shrink-0 bg-black/85 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between z-40">
          {/* Left Corner: Back Button (if on subpage) + Finora 3D Logo + Brand Text */}
          <div className="flex items-center gap-2">
            {!isDashboard && !isAuthPage && (
              <button
                type="button"
                onClick={() => router.back()}
                className="p-1 -ml-1 text-neutral-400 hover:text-white transition"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <Link
              href="/dashboard"
              className="flex items-center gap-2 hover:opacity-90 transition group"
              title="Finora"
            >
              <img
                src="/finora-logo.png"
                alt="Finora"
                width={24}
                height={24}
                style={{ width: '24px', height: '24px', maxWidth: '24px', maxHeight: '24px', objectFit: 'contain' }}
                className="w-6 h-6 object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)] group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-white leading-none">Finora</span>
                <span className="text-[7.5px] font-semibold text-neutral-400 tracking-[0.22em] uppercase leading-tight mt-0.5">
                  PAY WITH CRYPTO
                </span>
              </div>
            </Link>
          </div>

          {/* Right Corner: User Avatar */}
          <div className="flex items-center justify-end">
            {!isAuthPage && user ? (
              <Link href="/profile" className="relative group" title="Profile">
                <div
                  className="w-7 h-7 rounded-full overflow-hidden border border-white/20 bg-neutral-900 shadow-sm group-hover:scale-105 transition-transform"
                  style={{ width: '28px', height: '28px', maxWidth: '28px', maxHeight: '28px' }}
                >
                  <img
                    src={user.avatarUrl || getUserAvatarUrl(user)}
                    alt={user.name || 'User'}
                    width={28}
                    height={28}
                    style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                    className="w-full h-full object-cover bg-neutral-800"
                    onError={(e) => {
                      // Fallback to deterministic avatar if image fails
                      (e.target as HTMLImageElement).src = getUserAvatarUrl(user);
                    }}
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-1.5 ring-black" />
              </Link>
            ) : null}
          </div>
        </div>

        {/* 3. Screen Content: Scrollable Area */}
        <div className="screen-content flex-1 overflow-y-auto overflow-x-hidden relative w-full no-scrollbar pb-24">
          {children}
        </div>

        {/* 4. Bottom Nav: Anchored to Bottom of Phone Container */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
