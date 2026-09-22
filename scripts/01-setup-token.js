/**
 * STEP 1 — Create a test SPL token that mimics USDT on Solana Devnet.
 *
 * Run: npm run setup
 *
 * Creates:
 *   - treasury keypair (mint authority, acts as Finora's liquidity source)
 *   - test mint with 6 decimals (matching real USDT — NOT the CLI default of 9)
 *
 * Writes the mint address to .env so later scripts pick it up.
 */
import fs from 'fs';
import path from 'path';
import { getConnection, loadOrCreateKeypair, ensureSol } from '../src/solana/client.js';
import { createTestUsdtMint, ensureTokenAccount, mintTestTokens } from '../src/solana/token.js';
import config from '../config/index.js';

async function main() {
  console.log('\n═══ FINORA — Devnet Token Setup ═══\n');

  const connection = getConnection();
  console.log(`  RPC     : ${config.rpcUrl}`);
  console.log(`  Decimals: ${config.usdtDecimals} (matches real USDT)\n`);

  const treasury = loadOrCreateKeypair('treasury');
  console.log(`  Treasury: ${treasury.publicKey.toBase58()}`);

  const sol = await ensureSol(connection, treasury.publicKey, 1);
  if (sol < 0.1) {
    console.log('\n  ✗ Not enough SOL to continue. Fund the treasury and re-run.\n');
    process.exit(1);
  }

  console.log('\n  Creating test USDT mint…');
  const mint = await createTestUsdtMint(connection, treasury);
  console.log(`  ✓ Mint: ${mint.toBase58()}`);

  console.log('\n  Creating treasury token account…');
  const treasuryAta = await ensureTokenAccount(connection, treasury, mint, treasury.publicKey);
  console.log(`  ✓ ATA : ${treasuryAta.address.toBase58()}`);

  console.log('\n  Minting 1,000,000 test USDT to treasury…');
  const sig = await mintTestTokens(connection, treasury, mint, treasuryAta.address, 1_000_000);
  console.log(`  ✓ Sig : ${sig}`);

  const envPath = path.resolve('.env');
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  env = env.replace(/^TEST_MINT=.*$/m, '').trim();
  env += `\nTEST_MINT=${mint.toBase58()}\n`;
  fs.writeFileSync(envPath, env.trim() + '\n');

  console.log(`
  ═══ Done ═══

  Mint saved to .env

  Explorer:
  https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet

  Next: npm run fund
`);
}

main().catch((e) => { console.error('\n  ✗', e.message, '\n'); process.exit(1); });
