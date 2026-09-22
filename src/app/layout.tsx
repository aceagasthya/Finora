import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PhoneFrame from '@/components/PhoneFrame';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Finora — Pay With Crypto | Instant USDC ↔ INR',
  description: 'Real Payments. A More Open World. Instant UPI merchant payments with USDC on BitGo testnet and INR settlement.',
  icons: {
    icon: '/finora-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#000000] text-neutral-100 min-h-screen antialiased selection:bg-[#00BAF2] selection:text-black overflow-x-hidden`}>
        <PhoneFrame>
          {children}
        </PhoneFrame>
      </body>
    </html>
  );
}
