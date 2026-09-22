# Finora — USDC ↔ INR Payment App (Full Stack)

Finora is a production-grade crypto-to-fiat and fiat-to-crypto payment platform enabling seamless transactions between **USDC on Solana** and **Indian Rupee (INR) UPI payments**.

Built with **Next.js 14 App Router**, **Tailwind CSS**, **Prisma ORM with SQLite**, real **BitGo Testnet** custodial integration for Solana USDC, and a mocked **M2P FinTech** layer for instant INR UPI transactions.

---

## 🌟 Features Overview

1. **Authentication & Session Management:**
   - Email + password registration & login powered by NextAuth.js & session cookies.
   - Pre-seeded Demo Account: `alice@finora.io` / `password123`.

2. **Onboarding & KYC:**
   - Form for PAN, Aadhaar, address, and DOB (auto-approved in mock sandbox).
   - Generates a **real BitGo Testnet deposit address** on Solana (`ofctsol:usdc`).
   - Generates an **INR PPI Wallet + unique UPI ID** (`{username}@finora`).

3. **Paytm-Style Dashboard:**
   - Dark theme aesthetic (`#0a0e17`) with emerald & cyan accents.
   - Stacked cards for **USDC Balance** and **INR Balance** with 1-click address copy and QR code modals.
   - Live portfolio value calculated using the real-time exchange rate (`1 USDC = ₹86.42`).
   - Quick action shortcuts (Scan & Pay, Send / Withdraw, Deposit, Ledger).
   - Recent transaction feed (last 5 activities).
   - Mobile-optimized bottom navigation dock with glowing center **Scan** button.

4. **Scan & Pay (`/pay`):**
   - Live camera QR code scanner with fallback presets (Swiggy, Zomato, Starbucks, Kirana, Chai Point).
   - Real-time conversion quotes with transparent fee breakdown:
     - Exchange Rate: `1 USDC = ₹86.42`
     - Platform Fee: `1%`
     - TDS (Tax Deducted at Source): `1%`
     - Round-first component logic before summing.
   - **Flow A (USDC → INR → UPI Merchant):** 2-step atomic process (Convert USDC to INR -> Enter UPI PIN `1234` -> Pay Merchant).
   - **Flow C (INR → INR → UPI Merchant):** Direct fiat balance deduction -> Enter UPI PIN `1234` -> Instant UTR generation.
   - Success screen showing payee statement: *"Merchant sees: {user_name} paid ₹{amount}"*.

5. **Send & Withdraw (`/send`):**
   - Send funds to external Solana wallet addresses.
   - **Flow B (INR → USDC → Solana):** Convert INR balance to USDC -> Enter UPI PIN -> BitGo withdrawal.
   - **Flow D (USDC → USDC → Solana):** Direct USDC withdrawal -> Enter UPI PIN -> BitGo withdrawal.
   - Generates on-chain transaction hash with Solana Devnet Explorer link.

6. **Deposit Simulator & BitGo Webhook (`/deposit`):**
   - Testnet deposit simulator for instant test funding.
   - Idempotent BitGo webhook receiver at `/api/webhooks/bitgo` with transfer verification.

7. **History (`/history`):**
   - Chronological audit log with filter tabs (All, Deposits, Payments, Withdrawals, Conversions).
   - Details modal showing blockchain txHash, UPI UTR, counterparty, and status.
   - **1-Click CSV Export** via `/api/ledger/export`.

8. **Ledger & Real-Time Reconciliation (`/ledger`):**
   - **Virtual USDC Liabilities** (sum of all user balances) vs. **Live BitGo Custody Balance** fetched via API.
   - Drift metric & status indicator (`MATCHED`, `DEFICIT`, or `SURPLUS`).
   - **Virtual INR Liabilities** vs. **M2P Liquidity Pool** (₹1,00,00,000 reserve) & Drift status.
   - Immutable, append-only `LedgerEntry` audit trail.

9. **Profile (`/profile`):**
   - Editable name and phone number.
   - View and download QR codes for BitGo deposit address and Finora UPI ID.
   - KYC verification badge and secure logout.

---

## 🏗️ Tech Stack

- **Framework:** Next.js 14 (App Router, Node.js runtime)
- **Styling:** Tailwind CSS, CSS variables, Dark Palette (`#0a0e17`, `#111827`, `#059669`)
- **Icons & Fonts:** Lucide React, Inter
- **Database & ORM:** SQLite via Prisma ORM (with Decimal precision for financial balances)
- **Auth:** NextAuth.js (Credentials Provider) + Session Cookies
- **Blockchain / Custody:** BitGo Testnet REST API (`@bitgo/sdk-core`, OFC Solana USDC token `ofctsol:usdc`)
- **QR Code Tools:** `html5-qrcode` & `qrcode.react`

---

## ⚙️ Environment Variables (`.env.local` / `.env`)

```env
BITGO_ENV=test
BITGO_API_BASE=https://app.bitgo-test.com/api/v2
BITGO_EXPRESS_HOST=http://localhost:3080
BITGO_ENTERPRISE_ID=6aace2efb068089b8423fed1ac030580
BITGO_WALLET_ID=6ab0355036e69a90fd29558eae1dc020
BITGO_COIN=ofc
BITGO_TOKEN=ofctsol:usdc
BITGO_ACCESS_TOKEN=v2x0a43d8f1d8886b7747adc63edc64b6ad8b4607d6b2feec4af6821e983892a370
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET=finora-dev-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

> **Note on BitGo Wallet ID:** The enterprise OFC Solana wallet identifier on testnet is `6ab0355036e69a90fd29558eae1dc020` (`90f`). Node.js DNS resolution uses `dns.setDefaultResultOrder('ipv4first')` to ensure stable IPv4 routing on Windows.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database & Seed
```bash
npx prisma db push
node prisma/seed.js
```

### 3. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password | UPI PIN | Initial USDC | Initial INR |
|---|---|---|---|---|---|
| **Primary Demo** | `alice@finora.io` | `password123` | `1234` | 100 USDC | ₹2,500 INR |

*Click the "Demo Account: alice@finora.io" button on `/login` for 1-click login.*

---

## 🔄 Payment Flows & Calculations

### Fee Structure
- **Exchange Rate:** 1 USDC = ₹86.42
- **Platform Fee:** 1.00%
- **TDS:** 1.00%
- **Formula:**
  $$\text{Base USDC} = \frac{\text{Amount in INR}}{86.42}$$
  $$\text{Platform Fee} = \text{round}_4(\text{Base USDC} \times 0.01)$$
  $$\text{TDS} = \text{round}_4(\text{Base USDC} \times 0.01)$$
  $$\text{Total Deducted} = \text{Base USDC} + \text{Platform Fee} + \text{TDS}$$

*Example: Paying ₹500 INR to Swiggy:*
- Base USDC: `5.7857`
- Platform Fee (1%): `0.0579`
- TDS (1%): `0.0579`
- Total to deduct: `5.9015 USDC`

### UPI Execution PIN
The standard UPI PIN across all sandbox accounts is **`1234`**.

---

## 🧪 Automated End-to-End Verification

A comprehensive automated test script tests all 11 requirements:
```bash
node test-e2e.js
```
Verified items:
- ✅ User authentication & session management
- ✅ Balance fetching & currency conversion rates
- ✅ Real-time quote calculation with 1% platform fee + 1% TDS
- ✅ Flow A (USDC → INR conversion + UPI merchant payment)
- ✅ Flow C (Direct INR → UPI merchant payment)
- ✅ Flow D (USDC → external Solana wallet withdrawal)
- ✅ Flow B (INR → USDC conversion + Solana withdrawal)
- ✅ Deposit simulator & BitGo webhook idempotency
- ✅ Chronological transaction history & RFC-4180 CSV export
- ✅ Virtual ledger vs. live BitGo custodial reconciliation & drift tracking
- ✅ New user signup + mock KYC + real BitGo testnet deposit address generation

---

## 📁 Project Structure

```
finora/
├── prisma/
│   ├── schema.prisma           # SQLite schema (User, Transaction, LedgerEntry)
│   └── seed.js                 # Seed script for demo account (Alice Sharma)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx  # Login page with demo button
│   │   │   └── signup/page.tsx # Registration page
│   │   ├── api/
│   │   │   ├── auth/           # NextAuth & session API
│   │   │   ├── bitgo/          # BitGo address generation
│   │   │   ├── deposit/        # Deposit simulation API
│   │   │   ├── ledger/         # Reconciliation & CSV export APIs
│   │   │   ├── onboarding/kyc/ # Mock KYC + address provision API
│   │   │   ├── pay/            # Quote, convert, execute, merchant resolve APIs
│   │   │   ├── transactions/   # Transaction history API
│   │   │   ├── user/profile/   # Profile update API
│   │   │   ├── wallet/         # Balances & addresses APIs
│   │   │   └── webhooks/bitgo/ # BitGo deposit webhook receiver
│   │   ├── dashboard/page.tsx  # Paytm-style dual-card dashboard
│   │   ├── deposit/page.tsx    # Testnet deposit simulator
│   │   ├── history/page.tsx    # Filterable history & CSV export
│   │   ├── ledger/page.tsx     # Reconciliation & drift table
│   │   ├── onboarding/page.tsx # Step 1 KYC -> Step 2 addresses
│   │   ├── pay/page.tsx        # Camera QR scanner & Flow A / Flow C
│   │   ├── profile/page.tsx    # Profile & QR codes modal
│   │   ├── send/page.tsx       # Flow B & Flow D Solana withdrawals
│   │   ├── layout.tsx          # Dark root layout & navbar/footer dock
│   │   └── page.tsx            # Landing redirect to dashboard/login
│   ├── components/
│   │   ├── Navbar.tsx          # Header with branding & exchange rate
│   │   └── MobileBottomNav.tsx # Paytm dock with glowing center Scan button
│   └── lib/
│       ├── auth.ts             # Auth helper & session resolver
│       ├── bitgo.ts            # BitGo Testnet REST client (build/sign/send)
│       ├── fee-calculator.ts   # Financial math & rounding logic
│       ├── m2p-mock.ts         # Mock M2P UPI & PPI wallet engine
│       └── prisma.ts           # Prisma client singleton
├── test-e2e.js                 # Complete automated test suite
└── README.md                   # Documentation
```
