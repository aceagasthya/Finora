'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
  LogOut,
  ShieldCheck,
  Edit2,
  Save,
  Wallet,
  Building,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getUserAvatarUrl, generateUniqueAvatarUrl } from '@/lib/avatar';
import { copyTextToClipboard } from '@/lib/clipboard';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Copy states
  const [copiedUsdc, setCopiedUsdc] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [generatingBitGo, setGeneratingBitGo] = useState(false);

  const handleGenerateBitGoAddress = async () => {
    setGeneratingBitGo(true);
    try {
      const res = await fetch('/api/bitgo/create-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'BitGo address generation failed');

      setUser((prev: any) => ({
        ...prev,
        usdcDepositAddress: data.address,
        bitgoAddressId: data.addressId,
      }));
      alert(`BitGo Address Created: ${data.address}`);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger BitGo API');
    } finally {
      setGeneratingBitGo(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.push('/login');
          return;
        }
        setUser(data.user);
        setName(data.user.name || '');
        setPhone(data.user.phone || '');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setUser((prev: any) => ({ ...prev, name: data.user.name, phone: data.user.phone }));
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRandomizeAvatar = async () => {
    const newAvatar = generateUniqueAvatarUrl(`${user.email || user.name || 'user'}-${Date.now()}`);
    setUser((prev: any) => ({ ...prev, avatarUrl: newAvatar }));
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: newAvatar }),
      });
    } catch (err) {
      console.error('Failed to persist avatar:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00BAF2] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

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
        <span className="text-xs font-bold text-white">Profile & Security</span>
      </div>

      {/* User Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 text-center mb-5 shadow-xl relative overflow-hidden">
        <div className="relative inline-block mx-auto mb-3 group">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 bg-neutral-900 shadow-xl shadow-[#00BAF2]/20 mx-auto">
            <img
              src={user.avatarUrl || getUserAvatarUrl(user)}
              alt={user.name || 'User'}
              className="w-full h-full object-cover bg-neutral-800"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getUserAvatarUrl(user);
              }}
            />
          </div>
          <button
            onClick={handleRandomizeAvatar}
            title="Generate a new avatar style"
            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg transition-transform hover:scale-110 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <h1 className="text-lg font-bold text-white">{user.name}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>

        <div className="inline-flex items-center gap-1 text-[10px] px-3 py-1 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mt-3">
          <CheckCircle2 className="w-3 h-3" />
          <span>Identity Verified (KYC)</span>
        </div>
      </div>

      {/* Edit Personal Details */}
      <div className="rounded-3xl p-5 bg-slate-900/80 border border-white/10 shadow-xl mb-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Personal Information
          </h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            <span>{isEditing ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#00BAF2]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#00BAF2]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-xl bg-[#00BAF2] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Full Name</span>
              <span className="text-white font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Email</span>
              <span className="text-white font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Phone</span>
              <span className="text-white font-medium">{user.phone || '+91 98765 43210'}</span>
            </div>
          </div>
        )}
      </div>

      {/* BitGo USDC Address + QR Code */}
      <div className="rounded-3xl p-5 bg-slate-900/80 border border-cyan-500/20 shadow-xl mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-200">
              BitGo USDC Address (Solana)
            </h3>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
            Testnet
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl inline-block mx-auto flex justify-center">
          <QRCodeSVG value={user.usdcDepositAddress || ''} size={130} />
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-cyan-300 truncate">
            {user.usdcDepositAddress || 'No BitGo address'}
          </span>
          <button
            onClick={() => copyToClipboard(user.usdcDepositAddress, 'usdc')}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0"
            title="Copy Address"
          >
            {copiedUsdc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          onClick={handleGenerateBitGoAddress}
          disabled={generatingBitGo}
          className="w-full py-2 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{generatingBitGo ? 'Triggering BitGo API (POST /api/bitgo/create-address)...' : 'Trigger BitGo API to Generate/Refresh Address'}</span>
        </button>
      </div>

      {/* M2P INR UPI ID + QR Code */}
      <div className="rounded-3xl p-5 bg-slate-900/80 border border-emerald-500/20 shadow-xl mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Finora UPI ID (M2P Wallet)
            </h3>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
            Active VPA
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl inline-block mx-auto flex justify-center">
          <QRCodeSVG
            value={`upi://pay?pa=${user.inrUpiId}&pn=${encodeURIComponent(user.name)}`}
            size={130}
          />
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-emerald-300 truncate">
            {user.inrUpiId}
          </span>
          <button
            onClick={() => copyToClipboard(user.inrUpiId, 'upi')}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0"
            title="Copy UPI ID"
          >
            {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition"
      >
        <LogOut className="w-4 h-4 text-rose-400" />
        <span>Log Out of Finora</span>
      </button>
    </div>
  );
}
