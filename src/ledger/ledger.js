import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../../config/index.js';

/**
 * FINORA LEDGER
 *
 * Append-only. Entries are NEVER mutated or deleted — a correction is a new
 * offsetting entry. This is what makes the ledger auditable, which is what
 * FIU-IND and the IT department will ask for.
 *
 * Balances are always DERIVED by replaying entries, never stored as a
 * mutable field. A stored balance that drifts from its entries is the
 * single most common way crypto platforms lose track of customer funds.
 *
 * Sandbox uses JSON files. Production schema (PostgreSQL):
 *
 *   CREATE TABLE ledger_entries (
 *     id              BIGSERIAL PRIMARY KEY,
 *     entry_id        UUID NOT NULL UNIQUE,
 *     user_id         TEXT NOT NULL,
 *     txn_group       UUID NOT NULL,        -- links the legs of one operation
 *     type            TEXT NOT NULL,        -- deposit|conversion|payment|fee|tds|withdrawal
 *     asset           TEXT NOT NULL,        -- USDT|INR
 *     amount          NUMERIC(28,8) NOT NULL, -- signed: +credit, -debit
 *     external_ref    TEXT,                 -- solana signature / M2P txn id
 *     metadata        JSONB,
 *     created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *   CREATE UNIQUE INDEX ON ledger_entries (external_ref, type)
 *     WHERE external_ref IS NOT NULL;   -- idempotency guard
 *   CREATE INDEX ON ledger_entries (user_id, asset);
 *   CREATE INDEX ON ledger_entries (txn_group);
 */
export class Ledger {
  constructor(filePath) {
    this.filePath = filePath || path.join(config.dataDir, 'ledger.json');
    this.entries = [];
    this._load();
  }

  _load() {
    if (fs.existsSync(this.filePath)) {
      this.entries = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    }
  }

  _persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2));
  }

  /**
   * Append one entry. Amount is SIGNED: positive credits the user,
   * negative debits them.
   *
   * externalRef + type together enforce idempotency — replaying the same
   * Solana signature or M2P txn id will not double-credit.
   */
  append({ userId, txnGroup, type, asset, amount, externalRef = null, metadata = {} }) {
    if (externalRef) {
      const dup = this.entries.find(
        (e) => e.externalRef === externalRef && e.type === type
      );
      if (dup) {
        console.log(`  [ledger] duplicate ignored (${type}/${externalRef.slice(0, 12)}…)`);
        return dup;
      }
    }

    const entry = {
      entryId: crypto.randomUUID(),
      userId,
      txnGroup: txnGroup || crypto.randomUUID(),
      type,
      asset,
      amount: Number(amount.toFixed(8)),
      externalRef,
      metadata,
      createdAt: new Date().toISOString(),
    };

    this.entries.push(entry);
    this._persist();
    return entry;
  }

  /** Write several legs of one logical operation under a shared txnGroup. */
  appendGroup(legs) {
    const txnGroup = crypto.randomUUID();
    return legs.map((leg) => this.append({ ...leg, txnGroup }));
  }

  /** Balance is always derived — never read from a stored field. */
  balance(userId, asset) {
    return this.entries
      .filter((e) => e.userId === userId && e.asset === asset)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /** Sum of all user balances for an asset — the liability side. */
  totalUserBalance(asset) {
    return this.entries
      .filter((e) => e.asset === asset && e.userId !== 'FINORA')
      .reduce((sum, e) => sum + e.amount, 0);
  }

  history(userId, limit = 50) {
    return this.entries
      .filter((e) => e.userId === userId)
      .slice(-limit)
      .reverse();
  }

  byGroup(txnGroup) {
    return this.entries.filter((e) => e.txnGroup === txnGroup);
  }

  /**
   * THE CHECK THAT MATTERS.
   *
   * Sum of what we owe users must equal what we actually hold.
   * A drift here means funds are unaccounted for — halt operations,
   * do not let users transact until it resolves.
   */
  reconcile({ actualUsdtOnChain, actualInrInPool }) {
    const owedUsdt = this.totalUserBalance('USDT');
    const owedInr = this.totalUserBalance('INR');

    const usdtDrift = actualUsdtOnChain - owedUsdt;
    const inrDrift = actualInrInPool - owedInr;

    const TOLERANCE_USDT = 0.000001;
    const TOLERANCE_INR = 0.01;

    const ok =
      Math.abs(usdtDrift) < TOLERANCE_USDT && Math.abs(inrDrift) < TOLERANCE_INR;

    return {
      ok,
      usdt: { owed: owedUsdt, actual: actualUsdtOnChain, drift: usdtDrift },
      inr: { owed: owedInr, actual: actualInrInPool, drift: inrDrift },
      checkedAt: new Date().toISOString(),
    };
  }

  /** Flat export for CA / tax filing. */
  exportForTax(userId, year) {
    const rows = this.entries.filter((e) => {
      if (e.userId !== userId) return false;
      if (year && new Date(e.createdAt).getFullYear() !== year) return false;
      return true;
    });

    const tdsTotal = rows
      .filter((e) => e.type === 'tds')
      .reduce((s, e) => s + Math.abs(e.amount), 0);

    const feeTotal = rows
      .filter((e) => e.type === 'fee')
      .reduce((s, e) => s + Math.abs(e.amount), 0);

    return {
      userId,
      year: year || 'all',
      totalTdsDeductedUsdt: Number(tdsTotal.toFixed(6)),
      totalPlatformFeesUsdt: Number(feeTotal.toFixed(6)),
      entryCount: rows.length,
      entries: rows,
    };
  }
}

export default Ledger;
