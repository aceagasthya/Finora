import { PublicKey } from '@solana/web3.js';
import { getTokenBalance, fromBaseUnits } from './token.js';
import config from '../../config/index.js';

/**
 * Watches a set of deposit addresses for incoming SPL token transfers.
 *
 * WHY THIS EXISTS: BitGo testnet doesn't expose Solana USDT, so we can't
 * use their webhooks yet. This polls the chain directly to produce the
 * same event shape BitGo's webhook would — so when BitGo Solana support
 * lands, you swap this module out and `onDeposit` keeps working unchanged.
 *
 * Production note: polling is fine for a sandbox but doesn't scale.
 * Real deployment uses BitGo webhooks (push) or a Geyser/Helius
 * websocket subscription, not a poll loop.
 */
export class DepositWatcher {
  constructor(connection, mint, { onDeposit }) {
    this.connection = connection;
    this.mint = mint;
    this.onDeposit = onDeposit;

    // address (base58) -> { userId, ata, lastKnownBalance }
    this.watched = new Map();

    // Signatures we've already credited. THIS IS THE IDEMPOTENCY GUARD —
    // without it, a restart or duplicate webhook double-credits the user.
    // Production: this belongs in a UNIQUE index on the ledger table,
    // not in memory.
    this.processedSignatures = new Set();

    this.running = false;
  }

  /** Register a user's deposit address to watch. */
  watch(userId, ataAddress) {
    const key = ataAddress.toBase58 ? ataAddress.toBase58() : ataAddress;
    this.watched.set(key, {
      userId,
      ata: new PublicKey(key),
      lastKnownBalance: null,
    });
    return key;
  }

  /**
   * Scan every watched address once.
   * Detects deposits by comparing current balance against last seen,
   * then confirms via signature history so we can record a real txid.
   */
  async scanOnce() {
    const events = [];

    for (const [addr, entry] of this.watched.entries()) {
      let currentBalance;
      try {
        currentBalance = await getTokenBalance(this.connection, entry.ata);
      } catch (err) {
        console.error(`  [watch] failed reading ${addr.slice(0, 8)}…: ${err.message}`);
        continue;
      }

      // First scan just establishes a baseline — never credit on it,
      // otherwise an existing balance gets credited as a fresh deposit.
      if (entry.lastKnownBalance === null) {
        entry.lastKnownBalance = currentBalance;
        continue;
      }

      const delta = currentBalance - entry.lastKnownBalance;

      if (delta > 0) {
        const signature = await this._findRecentSignature(entry.ata);

        if (signature && this.processedSignatures.has(signature)) {
          entry.lastKnownBalance = currentBalance;
          continue;
        }
        if (signature) this.processedSignatures.add(signature);

        const event = {
          userId: entry.userId,
          address: addr,
          amount: delta,
          newBalance: currentBalance,
          signature: signature || `unknown-${Date.now()}`,
          state: 'confirmed',
          detectedAt: new Date().toISOString(),
        };

        events.push(event);
        entry.lastKnownBalance = currentBalance;

        if (this.onDeposit) {
          try {
            await this.onDeposit(event);
          } catch (err) {
            console.error(`  [watch] onDeposit handler threw: ${err.message}`);
          }
        }
      } else if (delta < 0) {
        // Outbound transfer (user spent / we swept to cold). Just resync.
        entry.lastKnownBalance = currentBalance;
      }
    }

    return events;
  }

  async _findRecentSignature(ata) {
    try {
      const sigs = await this.connection.getSignaturesForAddress(ata, { limit: 1 });
      return sigs.length > 0 ? sigs[0].signature : null;
    } catch {
      return null;
    }
  }

  async start() {
    if (this.running) return;
    this.running = true;
    console.log(`  [watch] polling ${this.watched.size} address(es) every ${config.pollIntervalMs}ms`);

    while (this.running) {
      await this.scanOnce();
      await new Promise((r) => setTimeout(r, config.pollIntervalMs));
    }
  }

  stop() {
    this.running = false;
  }
}

export default DepositWatcher;
