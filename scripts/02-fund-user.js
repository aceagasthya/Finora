/**
 * STEP 2 — Create a user wallet and send them test USDT.
 *
 * Run: npm run fund
 *
 * This simulates a real user deposit: an actual on-chain SPL transfer
 * from treasury -> user's deposit address. Exactly what your webhook
 * receiver will see in production.
 */
import { PublicKey } from '@solana/web3.js';
import { getConnection, loadOrCreateKeypair, ensureSol } from '../src/solana/client.js';
import { ensureTokenAccount, transferTokens, getTokenBalance } from '../src/solana/token.js';
import config from '../config/index.js';

const AMOUNT = Number(process.argv[2]) || 500;

async function main() {
  console.log('\n═══ FINORA — Fund Test User ═══\n');

  if (!config.testMint) {
    console.log('  ✗ No TEST_MINT in .env. Run `npm run setup` first.\n');
    process.exit(1);
  }

  const connection = getConnection();
  const mint = new PublicKey(config.testMint);
  const treasury = loadOrCreateKeypair('treasury');
  const user = loadOrCreateKeypair('user-alice');

  console.log(`  Mint    : ${mint.toBase58()}`);
  console.log(`  Treasury: ${treasury.publicKey.toBase58()}`);
  console.log(`  User    : ${user.publicKey.toBase58()}\n`);

  await ensureSol(connection, treasury.publicKey, 0.3);

  // Treasury pays the ~0.002 SOL ATA rent — the user doesn't need SOL
  // to receive tokens. Worth noting: in production this cost is yours,
  // per new user, and it's a real (small) line item at scale.
  console.log('  Ensuring token accounts…');
  const treasuryAta = await ensureTokenAccount(connection, treasury, mint, treasury.publicKey);
  const userAta = await ensureTokenAccount(connection, treasury, mint, user.publicKey);
  console.log(`  ✓ User ATA: ${userAta.address.toBase58()}`);

  const before = await getTokenBalance(connection, userAta.address);
  console.log(`\n  Balance before: ${before.toFixed(6)} USDT`);

  console.log(`  Transferring ${AMOUNT} test USDT…`);
  const sig = await transferTokens(
    connection, treasury, treasuryAta.address, userAta.address, treasury, AMOUNT
  );

  const after = await getTokenBalance(connection, userAta.address);
  console.log(`  ✓ Balance after : ${after.toFixed(6)} USDT`);

  console.log(`
  ═══ Deposit complete ═══

  Signature: ${sig}
  Explorer : https://explorer.solana.com/tx/${sig}?cluster=devnet

  User deposit address (watch this):
  ${userAta.address.toBase58()}

  Next: npm run demo
`);
}

main().catch((e) => { console.error('\n  ✗', e.message, '\n'); process.exit(1); });
