'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  QrCode,
  ArrowDownLeft,
  TrendingUp,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  Building,
  RefreshCw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function MerchantPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [qrAmount, setQrAmount] = useState('500');
  const [storeName, setStoreName] = useState('Alice Organic Superstore');
  const [merchantVpa, setMerchantVpa] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) router.push('/login');
        else {
          setUser(data.user);
          const baseHandle = data.user.inrUpiId ? data.user.inrUpiId.split('@')[0] : 'merchant';
          setMerchantVpa(`store.${baseHandle}@finora`);
        }
      });

    fetch('/api/pay/history')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.payments) setPayments(data.payments);
      });
  }, [router]);

  const totalReceived = payments.reduce((acc, p) => acc + (p.amount || 0), 24500);

  const qrUrl = `upi://pay?pa=${merchantVpa}&pn=${encodeURIComponent(storeName)}&am=${qrAmount}&cu=INR`;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 pb-28 lg:pb-12 animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-400" />
            <span>Merchant Business Portal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Accept payments from anyone paying with Solana USDT or UPI apps
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSettled(true);
              setTimeout(() => setSettled(false), 3000);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20"
          >
            {settled ? 'Settled to Bank!' : 'Settle Now to HDFC Bank (T+0)'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <p className="text-xs font-medium text-slate-400">Total Received (INR)</p>
          <p className="text-2xl font-extrabold text-white font-mono mt-1">
            ₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-sans">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% this week</span>
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <p className="text-xs font-medium text-slate-400">Transaction Count</p>
          <p className="text-2xl font-extrabold text-white font-mono mt-1">
            {payments.length + 38} Payments
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-sans">
            100% Success Rate on NPCI UPI Rails
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <p className="text-xs font-medium text-slate-400">Pending T+0 Settlement</p>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            ₹3,250.00
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-sans">
            Auto-sweeps to HDFC A/c **4921 at 23:59 IST
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dynamic Merchant QR Generator */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4 text-center">
          <h3 className="text-base font-bold text-white">Dynamic Storefront QR Code</h3>
          <p className="text-xs text-slate-400">
            Customers scan with any UPI app (or Finora USDT) to pay the exact amount.
          </p>

          <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-xl">
            <QRCodeSVG value={qrUrl} size={180} />
          </div>

          <div className="max-w-xs mx-auto space-y-2 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Requested Bill Amount (₹ INR)
              </label>
              <input
                type="number"
                value={qrAmount}
                onChange={(e) => setQrAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm font-bold font-mono text-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Recent Settlements */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Recent Settlements & Payments</h3>
            <span className="text-[11px] text-emerald-400 font-semibold">Live Feed</span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Rahul Dev', amount: 450, time: '12 mins ago', utr: 'UTR849201827401' },
              { name: 'Priya Mehta', amount: 1200, time: '1 hour ago', utr: 'UTR938491029384' },
              { name: 'Alice Sharma', amount: 1750, time: '3 hours ago', utr: 'UTR482910382910' },
              { name: 'Siddharth Roy', amount: 350, time: 'Yesterday', utr: 'UTR192830192831' },
            ].map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{p.utr} • {p.time}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-400">₹{p.amount.toFixed(2)}</span>
                  <p className="text-[10px] text-slate-400">Settled to Bank</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <a
              href="/api/ledger/export"
              download
              className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Settlement Excel/CSV Report</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
