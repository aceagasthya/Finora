// dotenv is optional — if it's absent we just fall back to process.env
// and the defaults below, rather than crashing on import.
try {
  await import('dotenv/config');
} catch {
  // no .env loader available; defaults apply
}

export const config = {
  // ── Solana ──
  // Devnet for testing. Swap to 'mainnet-beta' + real USDT mint for production.
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  cluster: process.env.SOLANA_CLUSTER || 'devnet',

  // IMPORTANT: real USDT uses 6 decimals. Our test token MUST match,
  // or every amount in your ledger will be off by 1000x when you switch.
  usdtDecimals: 6,

  // Production USDT mint on Solana mainnet (for reference — do not use on devnet):
  // Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
  mainnetUsdtMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',

  // Populated by scripts/01-setup-token.js
  testMint: process.env.TEST_MINT || null,

  // ── Deposit scanning ──
  pollIntervalMs: 5000,
  confirmationCommitment: 'confirmed',

  // ── Finora economics ──
  // Rate is mocked here. Production: pull from your OTC partner's quote API.
  mockUsdtInrRate: 86.42,
  rateLockSeconds: 60,

  platformFeePct: 0.01,      // 1% Finora fee
  minPlatformFeeUsdt: 0.5,
  tdsPct: 0.01,              // 1% TDS — Section 194S, mandatory, non-negotiable

  // ── Storage ──
  // File-based for the sandbox. Production: PostgreSQL (see ledger schema).
  dataDir: './.finora-data',
};

export default config;
