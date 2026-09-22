/**
 * DEPOSIT WATCHER — long-running.
 * Run: npm run watch
 *
 * Leave this running, then in another terminal: npm run fund 100
 * You'll see the deposit detected live.
 */
import { PublicKey } from '@solana/web3.js';
import { getConnection, loadOrCreateKeypair } from '../src/solana/client.js';
import { ensureTokenAccount } from '../src/solana/token.js';
import { DepositWatcher } from '../src/solana/depositWatcher.js';
import { Ledger } from '../src/ledger/ledger.js';
import { PaymentEngine } from '../src/paymentEngine.js';
import { MockM2PProvider } from '../src/fiat/provider.js';
import config from '../config/index.js';

async function main() {
  console.log('\n═══ FINORA — Deposit Watcher ═══\n');
  if (!config.testMint) { console.log('  ✗ Run `npm run setup` first.\n'); process.exit(1); }

  const connection = getConnection();
  const mint = new PublicKey(config.testMint);
  const treasury = loadOrCreateKeypair('treasury');
  const user = loadOrCreateKeypair('user-alice');

  const ledger = new Ledger();
  const engine = new PaymentEngine({ ledger, fiatProvider: new MockM2PProvider() });

  const ata = await ensureTokenAccount(connection, treasury, mint, user.publicKey);
  console.log(`  Watching: ${ata.address.toBase58()}`);
  console.log(`  Ctrl+C to stop\n`);

  const watcher = new DepositWatcher(connection, mint, {
    onDeposit: async (e) => {
      console.log(`  [${new Date().toLocaleTimeString()}] +${e.amount.toFixed(6)} USDT`);
      console.log(`     sig: ${e.signature}`);
      await engine.recordDeposit({ userId: e.userId, amount: e.amount, signature: e.signature });
      console.log(`     ledger balance: ${ledger.balance(e.userId, 'USDT').toFixed(6)} USDT\n`);
    },
  });

  watcher.watch('user_alice', ata.address);
  process.on('SIGINT', () => { console.log('\n  stopped\n'); watcher.stop(); process.exit(0); });
  await watcher.start();
}
main().catch((e) => { console.error('\n  ✗', e.message, '\n'); process.exit(1); });
