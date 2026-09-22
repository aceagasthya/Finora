import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import config from '../../config/index.js';

/**
 * FIAT PROVIDER INTERFACE
 *
 * Every method here maps to something M2P (or any PPI partner) must expose.
 * When sandbox access lands, write M2PProvider implementing this same shape
 * and swap it in — nothing else in the codebase changes.
 *
 * The open questions from your architecture doc map to these methods:
 *  - createWallet          -> will M2P issue full-KYC INR wallets via API?
 *  - creditWallet          -> will M2P accept crypto-sourced INR credits?  <-- RISKIEST
 *  - payToUpi              -> can we initiate UPI from the user's wallet?
 *  - resolveUpiId          -> can we fetch payee name before paying?
 */
export class FiatProvider {
  async createWallet(_user) { throw new Error('not implemented'); }
  async creditWallet(_walletId, _amountInr, _ref) { throw new Error('not implemented'); }
  async debitWallet(_walletId, _amountInr, _ref) { throw new Error('not implemented'); }
  async getBalance(_walletId) { throw new Error('not implemented'); }
  async resolveUpiId(_upiId) { throw new Error('not implemented'); }
  async payToUpi(_params) { throw new Error('not implemented'); }
}

/**
 * MOCK implementation for sandbox testing.
 *
 * Simulates realistic latency and failure modes so your error handling
 * gets exercised before you touch a real API.
 *
 * ⚠  What this CANNOT prove:
 *    - that M2P will accept INR credits originating from crypto conversion
 *    - that the merchant sees the USER's name rather than Finora's
 *    Both depend entirely on the PPI/TPAP arrangement with the sponsor bank.
 *    Mocking them green does not de-risk them.
 */
export class MockM2PProvider extends FiatProvider {
  constructor(opts = {}) {
    super();
    this.filePath = opts.filePath || path.join(config.dataDir, 'fiat-wallets.json');
    this.latencyMs = opts.latencyMs ?? 400;
    this.failureRate = opts.failureRate ?? 0;
    this.poolBalanceInr = opts.poolBalanceInr ?? 1_000_000;
    this.wallets = {};
    this.payments = [];
    this._load();
  }

  _load() {
    if (fs.existsSync(this.filePath)) {
      const d = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      this.wallets = d.wallets || {};
      this.payments = d.payments || [];
      this.poolBalanceInr = d.poolBalanceInr ?? this.poolBalanceInr;
    }
  }

  _persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(
        { wallets: this.wallets, payments: this.payments, poolBalanceInr: this.poolBalanceInr },
        null, 2
      )
    );
  }

  async _simulate(label) {
    await new Promise((r) => setTimeout(r, this.latencyMs));
    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw new Error(`[mock-m2p] simulated failure during ${label}`);
    }
  }

  async createWallet(user) {
    await this._simulate('createWallet');
    const walletId = `m2p_${crypto.randomBytes(6).toString('hex')}`;
    const handle = (user.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');

    this.wallets[walletId] = {
      walletId,
      userId: user.userId,
      // The name attached here is what a payee should see.
      // Whether that actually happens depends on the sponsor bank's
      // TPAP setup — this mock assumes the good case.
      accountName: user.name,
      vpa: `${handle}@finora`,
      balanceInr: 0,
      kycLevel: user.kycLevel || 'full',
      createdAt: new Date().toISOString(),
    };
    this._persist();
    return this.wallets[walletId];
  }

  async creditWallet(walletId, amountInr, ref) {
    await this._simulate('creditWallet');
    const w = this.wallets[walletId];
    if (!w) throw new Error(`wallet ${walletId} not found`);
    if (this.poolBalanceInr < amountInr) {
      throw new Error(
        `Finora INR pool exhausted: need ₹${amountInr.toFixed(2)}, have ₹${this.poolBalanceInr.toFixed(2)}`
      );
    }
    this.poolBalanceInr -= amountInr;
    w.balanceInr = Number((w.balanceInr + amountInr).toFixed(2));
    this._persist();
    return { walletId, credited: amountInr, newBalance: w.balanceInr, ref };
  }

  async debitWallet(walletId, amountInr, ref) {
    await this._simulate('debitWallet');
    const w = this.wallets[walletId];
    if (!w) throw new Error(`wallet ${walletId} not found`);
    if (w.balanceInr < amountInr) {
      throw new Error(`insufficient INR: have ₹${w.balanceInr.toFixed(2)}, need ₹${amountInr.toFixed(2)}`);
    }
    w.balanceInr = Number((w.balanceInr - amountInr).toFixed(2));
    this._persist();
    return { walletId, debited: amountInr, newBalance: w.balanceInr, ref };
  }

  async getBalance(walletId) {
    const w = this.wallets[walletId];
    if (!w) throw new Error(`wallet ${walletId} not found`);
    return w.balanceInr;
  }

  /** Mimics a UPI QR scan resolving to a payee name. */
  async resolveUpiId(upiId) {
    await this._simulate('resolveUpiId');
    const known = {
      'shop@upi': 'Rajesh Grocery Store',
      'cafe@okaxis': 'Priya Cafe',
      'kirana@paytm': 'Local Kirana Store',
    };
    if (!/^[\w.-]+@[\w.-]+$/.test(upiId)) throw new Error(`malformed UPI ID: ${upiId}`);
    return {
      upiId,
      payeeName: known[upiId.toLowerCase()] || upiId.split('@')[0],
      verified: true,
    };
  }

  async payToUpi({ walletId, upiId, amountInr, note }) {
    await this._simulate('payToUpi');
    const w = this.wallets[walletId];
    if (!w) throw new Error(`wallet ${walletId} not found`);

    await this.debitWallet(walletId, amountInr, `upi-${Date.now()}`);
    const payee = await this.resolveUpiId(upiId);

    const payment = {
      paymentId: `pay_${crypto.randomBytes(6).toString('hex')}`,
      utr: `UTR${Date.now().toString().slice(-12)}`,
      from: { walletId, vpa: w.vpa, name: w.accountName },
      to: { upiId, name: payee.payeeName },
      amountInr,
      note: note || '',
      // The whole product thesis rides on this line being true in production.
      merchantStatementShows: `${w.accountName} paid ₹${amountInr.toFixed(2)}`,
      status: 'success',
      completedAt: new Date().toISOString(),
    };

    this.payments.push(payment);
    this._persist();
    return payment;
  }
}

export default MockM2PProvider;
