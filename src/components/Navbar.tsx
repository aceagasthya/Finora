'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Wallet,
  Scan,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  History,
  User as UserIcon,
  LogOut,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { getUserAvatarUrl } from '@/lib/avatar';

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user: initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Wallet },
    { label: 'Cards', href: '/cards', icon: CreditCard },
    { label: 'Scan & Pay', href: '/pay', icon: Scan, badge: 'Live' },
    { label: 'Send USDC', href: '/send', icon: ArrowUpRight },
    { label: 'Deposit', href: '/deposit', icon: ArrowDownLeft },
    { label: 'History', href: '/history', icon: History },
    { label: 'Ledger', href: '/ledger', icon: FileText },
  ];

  if (pathname === '/') {
    return null;
  }

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-black/90 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-6">
            <Link href={user ? '/dashboard' : '/login'} className="flex items-center gap-2.5 group">
              <img
                src="/finora-logo.png"
                alt="Finora"
                className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-transform duration-200"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-tight">
                  Finora
                </span>
                <span className="text-[7.5px] uppercase tracking-[0.22em] text-neutral-400 font-semibold leading-tight mt-0.5">
                  PAY WITH CRYPTO
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {!isAuthPage && user && (
              <nav className="hidden md:flex items-center gap-1 ml-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-neutral-800/80 text-white border border-white/15 shadow-sm'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Section: Rate Pill & User Balance / Auth */}
          <div className="flex items-center gap-3">
            {/* Live Exchange Rate Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/80 border border-white/10 text-[11px] text-neutral-300 shadow-sm">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>1 USDC =</span>
              <span className="font-semibold text-emerald-400">₹86.42</span>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                {/* Virtual Balances Header Quick Preview */}
                <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/10 text-xs">
                  <div className="flex items-center gap-1 text-cyan-400 font-semibold">
                    <span>${Number(user.virtualUsdcBalance || 0).toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-500 font-normal">USDC</span>
                  </div>
                  <span className="text-neutral-700">|</span>
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span>₹{Number(user.virtualInrBalance || 0).toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-500 font-normal">INR</span>
                  </div>
                </div>

                {/* Profile Link with Avatar & Green Online Badge */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800/90 border border-white/10 text-xs text-white transition group"
                  title="View Profile"
                >
                  <div className="relative">
                    <img
                      src={user.avatarUrl || getUserAvatarUrl(user)}
                      alt={user.name || 'User'}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20 bg-neutral-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getUserAvatarUrl(user);
                      }}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-black" />
                  </div>
                  <span className="hidden md:inline font-medium text-neutral-200 group-hover:text-white">
                    {user.name?.split(' ')[0] || 'User'}
                  </span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : isAuthPage ? null : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="text-xs px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold hover:bg-neutral-200 transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
