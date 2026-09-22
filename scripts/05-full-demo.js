/**
 * FULL END-TO-END DEMO
 *
 * Run: npm run demo
 *
 * Real on-chain:  USDT deposit detection on Solana devnet
 * Mocked:         INR wallet + UPI payout (no M2P access yet)
 *
 * This is the flow you record for Colosseum.
 */
import dns from 'node:dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { PublicKey } from '@solana/web3.js';
import { getConnection, loadOrCreateKeypair } from '../src/solana/client.js';
import { ensureTokenAccount, getTokenBalance } from '../src/solana/token.js';
import { DepositWatcher } from '../src/solana/depositWatcher.js';
import { Ledger } from '../src/ledger/ledger.js';
import { MockM2PProvider } from '../src/fiat/provider.js';
import { PaymentEngine } from '../src/paymentEngine.js';
import config from '../config/index.js';

const line = (t = '') => console.log(t);
const rule = (t) => { line(); line(`─── ${t} ${'─'.repeat(Math.max(0, 46 - t.length))}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  line('\n╔══════════════════════════════════════════════╗');
  line('║   FINORA — END-TO-END DEMO (Solana Devnet)   ║');
  line('╚══════════════════════════════════════════════╝');

  if (!config.testMint) {
    line('\n  ✗ Run `npm run setup` then `npm run fund` first.\n');
    process.exit(1);
  }

  const connection = getConnection();
  const mint = new PublicKey(config.testMint);
  const treasury = loadOrCreateKeypair('treasury');
  const user = loadOrCreateKeypair('user-alice');

  const ledger = new Ledger();
  const fiat = new MockM2PProvider({ latencyMs: 300 });
  const engine = new PaymentEngine({ ledger, fiatProvider: fiat });

  const USER_ID = 'user_alice';
  const USER_NAME = 'Alice Sharma';

  // ── 1. Onboard ──
  rule('1. ONBOARDING (BitGo USDC + M2P INR)');
  const inrWallet = await fiat.createWallet({
    userId: USER_ID, name: USER_NAME, kycLevel: 'full',
  });
  line(`  User         : ${USER_NAME}`);
  line(`  INR wallet   : ${inrWallet.walletId}`);
  line(`  VPA          : ${inrWallet.vpa}`);

  // Trigger real BitGo Testnet API to create USDC receiver deposit address
  line(`  Triggering BitGo API (POST /api/v2/ofc/wallet/{walletId}/address)...`);
  const BITGO_TOKEN = process.env.BITGO_ACCESS_TOKEN || 'v2x0a43d8f1d8886b7747adc63edc64b6ad8b4607d6b2feec4af6821e983892a370';
  const rawWalletId = process.env.BITGO_WALLET_ID || '6ab0355036e69a90fd29558eae1dc020';
  const BITGO_WALLET = rawWalletId === '6ab0355036e69a0f0d29558eae1dc020' ? '6ab0355036e69a90fd29558eae1dc020' : rawWalletId;

  try {
    const bitgoRes = await fetch(`https://app.bitgo-test.com/api/v2/ofc/wallet/${BITGO_WALLET}/address`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BITGO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: `finora-demo-${Date.now().toString(36)}`,
        onToken: 'ofctsol:usdc',
      }),
    });
    const bitgoData = await bitgoRes.json();
    if (bitgoRes.ok && bitgoData.address) {
      line(`  ✓ BitGo USDC Receiver Address: ${bitgoData.address} (id: ${bitgoData.id})`);
    } else {
      line(`  ✗ BitGo API response: ${JSON.stringify(bitgoData)}`);
    }
  } catch (err) {
    line(`  ✗ BitGo API error: ${err.message}`);
  }

  const userAta = await ensureTokenAccount(connection, treasury, mint, user.publicKey);
  line(`  Local Devnet : ${userAta.address.toBase58()}`);

  // ── 2. Detect on-chain deposit ──
  rule('2. ON-CHAIN DEPOSIT DETECTION');
  const onChain = await getTokenBalance(connection, userAta.address);
  line(`  On-chain USDT: ${onChain.toFixed(6)}`);

  const ledgerUsdt = ledger.balance(USER_ID, 'USDT');
  if (ledgerUsdt < onChain) {
    const diff = onChain - ledgerUsdt;
    line(`  Crediting ${diff.toFixed(6)} USDT to ledger…`);
    await engine.recordDeposit({
      userId: USER_ID,
      amount: diff,
      signature: `initial-sync-${Date.now()}`,
    });
  }
  line(`  ✓ Ledger USDT: ${ledger.balance(USER_ID, 'USDT').toFixed(6)}`);

  const watcher = new DepositWatcher(connection, mint, {
    onDeposit: async (e) => {
      line(`  → deposit detected: ${e.amount.toFixed(6)} USDT (${e.signature.slice(0, 16)}…)`);
      await engine.recordDeposit({ userId: e.userId, amount: e.amount, signature: e.signature });
    },
  });
  watcher.watch(USER_ID, userAta.address);
  await watcher.scanOnce();

  // ── 3. Quote ──
  rule('3. SCAN QR + QUOTE');
  const UPI_ID = 'shop@upi';
  const INR_AMOUNT = 1000;

  const payee = await fiat.resolveUpiId(UPI_ID);
  line(`  Merchant: ${payee.payeeName} (${UPI_ID})`);
  line(`  Amount  : ₹${INR_AMOUNT}`);

  const quote = await engine.getQuote({ userId: USER_ID, inrAmount: INR_AMOUNT, upiId: UPI_ID });
  line();
  line(`    Rate              1 USDT = ₹${quote.rate}`);
  line(`    USDT to merchant  ${quote.usdtForMerchant.toFixed(6)}`);
  line(`    Platform fee      ${quote.platformFeeUsdt.toFixed(6)}`);
  line(`    TDS (194S, 1%)    ${quote.tdsUsdt.toFixed(6)}`);
  line(`    ─────────────────────────────────`);
  line(`    Total USDT        ${quote.totalUsdt.toFixed(6)}`);
  line(`    Locked until      ${new Date(quote.expiresAt).toLocaleTimeString()}`);

  // ── 4. Convert ──
  rule('4. USER TAPS CONVERT');
  await sleep(400);
  const converted = await engine.convert({ quoteId: quote.quoteId, walletId: inrWallet.walletId });
  line(`  ✓ USDT debited : ${quote.totalUsdt.toFixed(6)}`);
  line(`  ✓ INR credited : ₹${quote.inrAmount.toFixed(2)}`);
  line(`  ✓ USDT balance : ${ledger.balance(USER_ID, 'USDT').toFixed(6)}`);
  line(`  ✓ INR balance  : ₹${converted.inrWalletBalance.toFixed(2)}`);

  // ── 5. Pay ──
  rule('5. USER TAPS PAY (UPI PIN)');
  await sleep(400);
  const payment = await engine.payMerchant({
    quoteId: quote.quoteId, walletId: inrWallet.walletId, upiPin: '1234',
  });
  line(`  ✓ Status : ${payment.status}`);
  line(`  ✓ UTR    : ${payment.utr}`);
  line(`  ✓ Paid   : ₹${payment.amountInr.toFixed(2)} -> ${payment.to.name}`);
  line();
  line(`  Merchant statement shows:`);
  line(`    "${payment.merchantStatementShows}"`);

  // ── 6. Reconcile ──
  rule('6. RECONCILIATION');
  const actualOnChain = await getTokenBalance(connection, userAta.address);
  const recon = ledger.reconcile({
    actualUsdtOnChain: actualOnChain,
    actualInrInPool: await fiat.getBalance(inrWallet.walletId),
  });

  line(`  USDT  owed ${recon.usdt.owed.toFixed(6)} | on-chain ${recon.usdt.actual.toFixed(6)}`);
  line(`  INR   owed ₹${recon.inr.owed.toFixed(2)} | in wallet ₹${recon.inr.actual.toFixed(2)}`);
  line();
  line(`  USDT drift: ${recon.usdt.drift.toFixed(6)}`);
  line(`    ⓘ Non-zero is EXPECTED here — tokens are still on-chain in the`);
  line(`      user's address; conversion only moved our internal ledger.`);
  line(`      In production the sweep to Finora's pool closes this gap.`);

  // ── 7. Tax ──
  rule('7. TAX EXPORT');
  const tax = ledger.exportForTax(USER_ID, new Date().getFullYear());
  line(`  TDS deducted (USDT): ${tax.totalTdsDeductedUsdt}`);
  line(`  Platform fees (USDT): ${tax.totalPlatformFeesUsdt}`);
  line(`  Ledger entries      : ${tax.entryCount}`);

  rule('LEDGER HISTORY');
  for (const e of ledger.history(USER_ID, 10)) {
    const sign = e.amount >= 0 ? '+' : '';
    line(`  ${e.type.padEnd(11)} ${e.asset.padEnd(5)} ${sign}${e.amount.toFixed(6).padStart(14)}`);
  }

  line('\n╔══════════════════════════════════════════════╗');
  line('║              DEMO COMPLETE                   ║');
  line('╚══════════════════════════════════════════════╝\n');
}

main().catch((e) => { console.error('\n  ✗', e.message); console.error(e.stack); process.exit(1); });
