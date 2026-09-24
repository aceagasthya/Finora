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
  Upload,
  Video,
  ClipboardPaste,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { copyTextToClipboard } from '@/lib/clipboard';
import { BarcodeDetector } from 'barcode-detector/ponyfill';

interface MerchantPreset {
  id: string;
  name: string;
  upiId: string;
  category: string;
  defaultAmount?: number;
  symbol: string;
}

// Cohesive, elegant, dark-theme merchant presets (No random rainbow colors)
const PRESET_MERCHANTS: MerchantPreset[] = [
  { id: 'swiggy', name: 'Swiggy Instamart', upiId: 'swiggy@icici', category: 'Food & Groceries', defaultAmount: 450, symbol: 'S' },
  { id: 'zomato', name: 'Zomato Dining', upiId: 'zomato@hdfcbank', category: 'Food Delivery', defaultAmount: 620, symbol: 'Z' },
  { id: 'starbucks', name: 'Tata Starbucks', upiId: 'starbucks@axisbank', category: 'Cafe & Beverages', defaultAmount: 380, symbol: '★' },
  { id: 'kirana', name: 'Sharma Store', upiId: 'kirana@paytm', category: 'Daily Essentials', defaultAmount: 250, symbol: 'K' },
  { id: 'chaipoint', name: 'Chai Point', upiId: 'chaipoint@yesbank', category: 'Tea & Snacks', defaultAmount: 120, symbol: 'C' },
  { id: 'sol-merchant', name: 'Solana Merchant', upiId: 'CG3eYXBggS5uxDpg2RETrR2ofhpMXTRaT65HWUhve2AJ', category: 'External USDC', defaultAmount: 10, symbol: '◎' },
];

export default function ScanAndPayPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Scanner UI states
  const [liveScannerActive, setLiveScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanningFile, setScanningFile] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState('');

  // Refs for camera / file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);

  // Payment Form States
  const [scannedUpi, setScannedUpi] = useState('swiggy@icici');
  const [merchantName, setMerchantName] = useState('Swiggy Instamart');
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

  const getDetector = () => {
    if (!detectorRef.current && typeof window !== 'undefined') {
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
    }
    return detectorRef.current;
  };

  // Handle scanned QR string (supports Indian UPI QR standards)
  const handleScannedData = (rawText: string) => {
    if (!rawText) return;
    let upi = rawText.trim();
    let name = '';
    let amt = '';

    // Standard Indian UPI URL: upi://pay?pa=merchant@bank&pn=Store%20Name&am=500
    if (rawText.toLowerCase().includes('pa=')) {
      try {
        let queryString = rawText;
        if (queryString.includes('?')) {
          queryString = queryString.split('?')[1];
        }
        queryString = queryString.replace(/&amp;/g, '&');
        const params = new URLSearchParams(queryString);
        for (const [k, v] of params.entries()) {
          const key = k.toLowerCase();
          if (key === 'pa') upi = v.trim();
          else if (key === 'pn') name = v.trim();
          else if (key === 'am') amt = v.trim();
        }
      } catch (e) {
        console.warn('URLSearchParams parsing error:', e);
      }
    } else if (rawText.toLowerCase().startsWith('upi://pay/')) {
      const cleaned = rawText.replace(/upi:\/\/pay\//i, '').trim();
      const parts = cleaned.split(/[?\/]/);
      if (parts[0]) upi = parts[0].trim();
    }

    setScannedUpi(upi);
    if (amt && !isNaN(parseFloat(amt)) && parseFloat(amt) > 0) {
      setInrAmount(amt);
    }

    const decodedName = name ? decodeURIComponent(name.replace(/\+/g, ' ')) : '';
    setScanSuccessMessage(`✓ QR Scanned: ${decodedName || upi}`);
    setTimeout(() => setScanSuccessMessage(''), 4500);

    // Resolve merchant profile
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
        } else if (decodedName) {
          setMerchantName(decodedName);
          setMerchantCategory('Verified UPI Merchant');
        } else {
          setMerchantName(upi.split('@')[0] || 'Merchant');
          setMerchantCategory('UPI Payee');
        }
      })
      .catch(() => {
        if (decodedName) setMerchantName(decodedName);
      });
  };

  // Decode QR from file upload / camera snapshot using barcode-detector (supports dark-theme/inverted QR codes natively)
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningFile(true);
    setCameraError('');

    try {
      const detector = getDetector();
      if (!detector) throw new Error('BarcodeDetector unavailable');

      let decodedText = '';

      // 1. Try decoding directly from the File/Blob
      try {
        const barcodes = await detector.detect(file);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          decodedText = barcodes[0].rawValue;
        }
      } catch (err1) {
        console.log('Direct file decode failed, trying HTMLImageElement...', err1);
      }

      // 2. Try loading into HTMLImageElement
      if (!decodedText) {
        try {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = objectUrl;
          });

          const barcodes = await detector.detect(img);
          URL.revokeObjectURL(objectUrl);

          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            decodedText = barcodes[0].rawValue;
          }
        } catch (err2) {
          console.log('Image element decode error:', err2);
        }
      }

      // 3. Fallback: downscale onto canvas for large camera photos (e.g. 48MP)
      if (!decodedText) {
        try {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = objectUrl;
          });

          const maxDim = 1200;
          let { width, height } = img;
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const barcodes = await detector.detect(canvas);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              decodedText = barcodes[0].rawValue;
            }
          }
          URL.revokeObjectURL(objectUrl);
        } catch (err3) {
          console.log('Canvas decode error:', err3);
        }
      }

      if (decodedText) {
        handleScannedData(decodedText);
      } else {
        setCameraError('No valid UPI QR code detected in that image. Please make sure the QR code is clearly visible.');
      }
    } catch (err: any) {
      console.warn('BarcodeDetector error:', err);
      setCameraError('Could not decode QR code. Please try again or enter the UPI ID below.');
    } finally {
      setScanningFile(false);
      if (e.target) e.target.value = '';
    }
  };

  // Open Native Camera Shutter (Direct mobile OS camera)
  const triggerNativeCamera = () => {
    setCameraError('');
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  // Open Gallery Picker
  const triggerGalleryPicker = () => {
    setCameraError('');
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  // Start Live Camera Video Stream using navigator.mediaDevices.getUserMedia
  const startLiveScanner = async () => {
    setCameraError('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      // Insecure context (HTTP) -> Fallback to native camera snapshot
      triggerNativeCamera();
      return;
    }

    try {
      setLiveScannerActive(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = getDetector();
      if (!detector) return;

      // Continuous scanning loop
      let active = true;
      const scanTick = async () => {
        if (!active) return;

        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              active = false;
              stopLiveScanner();
              handleScannedData(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Ignore frame-by-frame transient detection errors
          }
        }

        if (active) {
          scanIntervalRef.current = setTimeout(scanTick, 120);
        }
      };

      scanIntervalRef.current = setTimeout(scanTick, 250);
    } catch (err: any) {
      console.warn('getUserMedia camera error:', err);
      stopLiveScanner();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please grant permission or upload a photo.');
      } else {
        triggerNativeCamera();
      }
    }
  };

  // Stop Live Camera Stream
  const stopLiveScanner = () => {
    if (scanIntervalRef.current) {
      clearTimeout(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setLiveScannerActive(false);
  };

  const toggleLiveScanner = () => {
    if (liveScannerActive) {
      stopLiveScanner();
    } else {
      startLiveScanner();
    }
  };

  // Smart camera launcher: if live video stream is supported, start live viewfinder; otherwise launch native camera shutter
  const handleOpenScanner = () => {
    setCameraError('');
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      toggleLiveScanner();
    } else {
      triggerNativeCamera();
    }
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopLiveScanner();
    };
  }, []);

  // Handle Preset selection
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

  // Paste from clipboard helper
  const handlePasteUpi = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          handleScannedData(text);
        }
      }
    } catch {
      // Ignore read errors
    }
  };

  // Convert USDC to INR
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

  // Execute payment
  const handlePay = async () => {
    setFlowState('PAYING');
    setErrorMessage('');

    try {
      const isSolana = scannedUpi && scannedUpi.length >= 32 && !scannedUpi.includes('@');
      const isConvertedInr = flowState === 'CONVERTED';

      const res = await fetch('/api/pay/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: isSolana ? 'FLOW_D' : isConvertedInr ? 'FLOW_C' : paymentMethod === 'USDC' ? 'FLOW_A' : 'FLOW_C',
          amount: isSolana ? quote?.baseUsdc || parseFloat(inrAmount) : parseFloat(inrAmount),
          usdcAmount: quote?.totalUsdcToDeduct || parseFloat(inrAmount) / 83.5,
          paymentMethod: isConvertedInr ? 'INR' : paymentMethod,
          alreadyConverted: isConvertedInr,
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00BAF2] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-16 select-none">
      {/* Hidden native camera capture input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFile}
        className="hidden"
      />

      {/* Hidden gallery image picker */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFile}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          <Scan className="w-3 h-3" />
          <span>Scan & Pay (UPI)</span>
        </div>
      </div>

      {flowState === 'SUCCESS' && paymentResult ? (
        /* SUCCESS SCREEN */
        <div className="rounded-3xl p-6 text-center border border-emerald-500/30 bg-[#0e1014]/90 backdrop-blur-xl shadow-2xl space-y-5 animate-fade-in">
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
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              Paid to <strong className="text-white">{paymentResult.merchantName}</strong>
            </p>
          </div>

          {/* Merchant UPI Confirmation Notification */}
          <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 text-left space-y-2 shadow-md">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Merchant UPI Notification</span>
            </div>
            <p className="text-sm font-bold text-white font-mono bg-neutral-900/90 p-2.5 rounded-xl border border-white/10">
              &quot;{paymentResult.merchantSees}&quot;
            </p>
            <p className="text-[10px] text-neutral-400">
              Instant settlement sent to merchant&apos;s bank account via Indian UPI network.
            </p>
          </div>

          {/* Payment Details */}
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-400">Merchant Recipient</span>
              <span className="font-mono text-neutral-200 truncate max-w-[200px]">
                {paymentResult.recipientAddress || paymentResult.merchantUpiId}
              </span>
            </div>
            {paymentResult.utr && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Bank UTR Reference</span>
                <span className="font-mono text-cyan-400 font-semibold">{paymentResult.utr}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-400">Paid Via</span>
              <span className="text-neutral-200 font-semibold">
                {paymentMethod === 'USDC' ? 'USDC (Converted to INR) → Instant UPI' : 'Direct INR PPI Wallet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">INR Wallet Balance</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ₹{Number(user.virtualInrBalance || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">USDC Balance</span>
              <span className="font-mono text-cyan-400 font-semibold">
                ${Number(user.virtualUsdcBalance || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Payer</span>
              <span className="text-neutral-200 font-semibold">{user.name}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setFlowState('IDLE');
                setPaymentResult(null);
                setErrorMessage('');
              }}
              className="w-full py-3.5 rounded-2xl bg-[#00BAF2] hover:bg-[#00BAF2]/90 text-black font-bold text-xs transition shadow-lg shadow-[#00BAF2]/20"
            >
              Make Another Payment
            </button>
            <Link
              href="/dashboard"
              className="block w-full py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-neutral-300 text-xs font-semibold hover:text-white transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* SCAN & PAY MAIN FLOW */
        <div className="space-y-4">
          {/* CAMERA QR SCANNER VIEWPORT */}
          <div className="rounded-3xl p-4 bg-[#0e1014]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>UPI QR Scanner</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={triggerGalleryPicker}
                  className="text-[10px] px-2.5 py-1 rounded-xl font-medium bg-neutral-900 text-neutral-300 border border-white/10 hover:text-white transition flex items-center gap-1"
                  title="Upload QR Image"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenScanner}
                  className="text-xs px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 bg-[#00BAF2] text-black shadow-md shadow-[#00BAF2]/20 hover:scale-105 active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{liveScannerActive ? 'Close Camera' : 'Open Camera'}</span>
                </button>
              </div>
            </div>

            {/* Live Camera Video Viewport */}
            <div
              className={`relative rounded-2xl overflow-hidden bg-black aspect-[4/3] sm:aspect-video border border-cyan-500/40 shadow-inner flex items-center justify-center mb-3 ${
                liveScannerActive ? 'block' : 'hidden'
              }`}
            >
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle Frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 sm:w-56 sm:h-56 relative border-2 border-cyan-400/80 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.35)]">
                  {/* Viewfinder Corner Accents */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-cyan-300 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-cyan-300 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-cyan-300 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-cyan-300 rounded-br-lg" />

                  {/* Pulsing Scan Line */}
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-[0_0_8px_#22d3ee]" />
                </div>
              </div>

              {/* Top overlay badge & close button */}
              <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-auto">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-black/70 text-cyan-300 border border-cyan-500/30 backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Live Scanning
                </span>
                <button
                  type="button"
                  onClick={stopLiveScanner}
                  className="p-1 rounded-full bg-black/75 text-neutral-300 hover:text-white border border-white/20 transition hover:bg-black"
                  title="Close Camera"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!liveScannerActive && (
              <div
                onClick={handleOpenScanner}
                className="py-7 px-4 rounded-2xl bg-black/50 border border-dashed border-white/15 text-center cursor-pointer hover:border-cyan-500/40 transition group"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                  {scanningFile ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
                  ) : (
                    <Scan className="w-7 h-7" />
                  )}
                </div>
                <p className="text-xs font-semibold text-white">
                  {scanningFile ? 'Analyzing QR Code...' : 'Tap to Open Camera & Scan QR'}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Point at Swiggy, Zomato, Starbucks, PhonePe, Paytm, or any shop QR
                </p>

                <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <span className="text-[10px] text-neutral-400">or</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLiveScanner();
                    }}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Video className="w-3 h-3" />
                    <span>Live Viewfinder</span>
                  </button>
                </div>
              </div>
            )}

            {/* Scan Success Banner */}
            {scanSuccessMessage && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{scanSuccessMessage}</span>
              </div>
            )}

            {/* Camera Error Alert */}
            {cameraError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* MERCHANT INFO & MANUAL UPI INPUT */}
          <div className="p-3.5 rounded-2xl bg-[#0e1014]/90 border border-white/10 space-y-2.5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/10 text-neutral-200 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-white truncate">{merchantName}</h3>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[10px] font-mono text-neutral-400 truncate">{scannedUpi}</p>
                </div>
              </div>

              <span className="text-[9px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-white/10 uppercase font-semibold shrink-0">
                {merchantCategory}
              </span>
            </div>

            {/* Editable or Pasteable UPI Input */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
              <input
                type="text"
                value={scannedUpi}
                onChange={(e) => setScannedUpi(e.target.value.trim())}
                placeholder="Enter merchant UPI ID e.g. store@icici"
                className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-cyan-300 placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handlePasteUpi}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800 border border-white/10 text-[10px] text-neutral-300 hover:text-white flex items-center gap-1"
                title="Paste from clipboard"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Paste</span>
              </button>
            </div>
          </div>

          {/* QUICK MERCHANT PRESETS (Sleek Dark Theme - No Rainbow Colors) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Quick Test Merchants
              </span>
              <span className="text-[10px] text-cyan-400 font-medium">1-Click Test Scan</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_MERCHANTS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectPreset(m)}
                  className={`p-2 rounded-2xl text-center border transition-all group ${
                    scannedUpi === m.upiId
                      ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,186,242,0.2)]'
                      : 'bg-[#121316]/90 border-white/10 hover:border-white/20 text-neutral-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-black/60 border border-white/10 text-white font-bold text-xs flex items-center justify-center mx-auto mb-1 group-hover:scale-105 transition-transform">
                    {m.symbol}
                  </div>
                  <span className="block text-[10px] font-medium truncate">
                    {m.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ERROR ALERT */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PAYMENT DETAILS FORM */}
          <div className="rounded-3xl p-5 bg-[#0e1014]/90 border border-white/10 space-y-4 shadow-xl backdrop-blur-xl">
            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
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
                  className="w-full pl-9 pr-4 py-3 rounded-2xl bg-black/60 border border-white/10 text-2xl font-black text-white focus:outline-none focus:border-cyan-400 transition"
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
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-black/40 text-neutral-400 border-white/10 hover:text-white'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* PAYMENT METHOD SELECTOR */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Method 1: USDC */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('USDC')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    paymentMethod === 'USDC'
                      ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-300">Pay with USDC</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                      Crypto
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Avail: <strong className="text-white">${Number(user.virtualUsdcBalance || 0).toFixed(2)}</strong>
                  </p>
                </button>

                {/* Method 2: INR */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('INR')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    paymentMethod === 'INR'
                      ? 'bg-amber-500/10 border-amber-400 text-white shadow-md shadow-amber-500/10'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-300">Pay with INR</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                      Fiat
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Avail: <strong className="text-white">₹{Number(user.virtualInrBalance || 0).toFixed(2)}</strong>
                  </p>
                </button>
              </div>
            </div>

            {/* CONVERSION QUOTE BOX */}
            {quote && paymentMethod === 'USDC' && (
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-400 pb-1.5 border-b border-white/5">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Conversion Rate</span>
                  </span>
                  <span className="font-semibold text-white">1 USDC = ₹86.42</span>
                </div>

                <div className="flex justify-between text-neutral-400">
                  <span>Merchant Receives</span>
                  <span className="font-bold text-white">₹{quote.inrAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-neutral-400">
                  <span>Base USDC</span>
                  <span className="font-mono text-neutral-200">{quote.baseUsdc.toFixed(4)} USDC</span>
                </div>

                <div className="flex justify-between text-neutral-400">
                  <span>Platform Fee (1%)</span>
                  <span className="font-mono text-neutral-300">+{quote.platformFeeUsdc.toFixed(4)} USDC</span>
                </div>

                <div className="flex justify-between text-neutral-400">
                  <span>TDS 1% (Sec 194S)</span>
                  <span className="font-mono text-neutral-300">+{quote.tdsUsdc.toFixed(4)} USDC</span>
                </div>

                <div className="flex justify-between text-white font-bold pt-1.5 border-t border-white/10 text-sm">
                  <span>Total to Deduct</span>
                  <span className="font-mono text-cyan-400">{quote.totalUsdcToDeduct.toFixed(4)} USDC</span>
                </div>
              </div>
            )}

            {/* UPI PIN INPUT */}
            {(flowState === 'CONVERTED' || paymentMethod === 'INR') && (
              <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/40 animate-fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Enter UPI PIN</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">Default: 1234</span>
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={upiPin}
                  onChange={(e) => setUpiPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-center font-mono text-xl tracking-[0.5em] text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#00BAF2] hover:bg-[#00BAF2]/90 text-black font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-[#00BAF2]/25 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {flowState === 'CONVERTING' ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                        <span>Converting USDC to INR...</span>
                      </span>
                    ) : (
                      <>
                        <span>Convert {quote?.totalUsdcToDeduct || ''} USDC & Pay</span>
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
                      className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {(flowState as string) === 'PAYING' ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
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
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {flowState === 'PAYING' ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
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
