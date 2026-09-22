import crypto from 'crypto';
import config from '../config/index.js';

/** Round to USDT's 6-decimal precision. */
const round6 = (n) => Number(n.toFixed(6));

/**
 * FINORA PAYMENT ENGINE
 *
 * Orchestrates: quote -> convert (USDT out, INR in) -> pay merchant.
 *
 * The flow is deliberately TWO user actions (Convert, then Pay) rather than
 * one. Reason: the user must see and accept the exchange rate before any
 * USDT leaves their balance. Hiding conversion inside a single "Pay" tap
 * means the user can't consent to the rate — which is both a UX problem
 * and, for a regulated money flow, a disclosure problem.
 */
export class PaymentEngine {
  constructor({ ledger, fiatProvider, rateProvider }) {
    this.ledger = ledger;
    this.fiat = fiatProvider;
    this.rateProvider = rateProvider || (() => config.mockUsdtInrRate);
    this.activeQuotes = new Map();
  }

  /**
   * Build a quote. Locked for config.rateLockSeconds so the user isn't
   * surprised by a rate move while reviewing.
   *
   * Fee structure (all borne by the user, on top of the merchant amount):
   *   merchant gets  : exactly the INR they asked for
   *   platform fee   : max(1% of USDT, 0.5 USDT)  -> Finora revenue
   *   TDS            : 1% of USDT                 -> remitted to govt (194S)
   */
  async getQuote({ userId, inrAmount, upiId }) {
    if (!inrAmount || inrAmount <= 0) throw new Error('inrAmount must be positive');

    const rate = await this.rateProvider();
    const payee = upiId ? await this.fiat.resolveUpiId(upiId) : null;

    // Round each component to USDT precision FIRST, then sum them for the
    // total. Summing the raw floats and rounding the result can leave the
    // total off by 1 unit in the last place from the sum of the line items
    // the user actually sees — unacceptable when those numbers are on screen
    // next to each other.
    const usdtForMerchant = round6(inrAmount / rate);
    const platformFee = round6(
      Math.max(usdtForMerchant * config.platformFeePct, config.minPlatformFeeUsdt)
    );
    const tds = round6(usdtForMerchant * config.tdsPct);
    const totalUsdt = round6(usdtForMerchant + platformFee + tds);

    const quote = {
      quoteId: `q_${crypto.randomBytes(8).toString('hex')}`,
      userId,
      upiId,
      payeeName: payee?.payeeName || null,
      inrAmount: Number(inrAmount.toFixed(2)),
      rate: Number(rate.toFixed(4)),
      usdtForMerchant,
      platformFeeUsdt: platformFee,
      tdsUsdt: tds,
      totalUsdt,
      expiresAt: new Date(Date.now() + config.rateLockSeconds * 1000).toISOString(),
    };

    this.activeQuotes.set(quote.quoteId, quote);
    return quote;
  }

  _assertQuoteValid(quoteId) {
    const q = this.activeQuotes.get(quoteId);
    if (!q) throw new Error('quote not found');
    if (new Date(q.expiresAt) < new Date()) {
      this.activeQuotes.delete(quoteId);
      throw new Error('quote expired — fetch a new one');
    }
    return q;
  }

  /** Credit a confirmed on-chain deposit into the user's USDT balance. */
  async recordDeposit({ userId, amount, signature }) {
    return this.ledger.append({
      userId,
      type: 'deposit',
      asset: 'USDT',
      amount,
      externalRef: signature,
      metadata: { network: config.cluster, source: 'solana-spl' },
    });
  }

  /**
   * Step 1 of payment: USDT out, INR in.
   *
   * Failure handling: if the fiat credit fails AFTER we've debited USDT,
   * we write a compensating entry to restore the user's balance. We can't
   * "roll back" an append-only ledger — we offset it. The failed attempt
   * stays visible in history, which is correct for audit.
   */
  async convert({ quoteId, walletId }) {
    const q = this._assertQuoteValid(quoteId);

    const usdtBalance = this.ledger.balance(q.userId, 'USDT');
    if (usdtBalance < q.totalUsdt) {
      throw new Error(
        `insufficient USDT: have ${usdtBalance.toFixed(6)}, need ${q.totalUsdt.toFixed(6)}`
      );
    }

    const legs = this.ledger.appendGroup([
      {
        userId: q.userId, type: 'conversion', asset: 'USDT',
        amount: -q.usdtForMerchant,
        metadata: { quoteId, rate: q.rate, inrAmount: q.inrAmount },
      },
      {
        userId: q.userId, type: 'fee', asset: 'USDT',
        amount: -q.platformFeeUsdt,
        metadata: { quoteId, description: 'Finora platform fee' },
      },
      {
        userId: q.userId, type: 'tds', asset: 'USDT',
        amount: -q.tdsUsdt,
        metadata: { quoteId, section: '194S', description: '1% TDS on VDA transfer' },
      },
    ]);

    const txnGroup = legs[0].txnGroup;

    try {
      const credit = await this.fiat.creditWallet(walletId, q.inrAmount, quoteId);

      this.ledger.append({
        userId: q.userId, txnGroup, type: 'conversion', asset: 'INR',
        amount: q.inrAmount,
        externalRef: `credit-${quoteId}`,
        metadata: { walletId, newBalance: credit.newBalance },
      });

      // Fee and TDS move to Finora's own books.
      this.ledger.append({
        userId: 'FINORA', txnGroup, type: 'fee', asset: 'USDT',
        amount: q.platformFeeUsdt, metadata: { from: q.userId, quoteId },
      });
      this.ledger.append({
        userId: 'FINORA', txnGroup, type: 'tds', asset: 'USDT',
        amount: q.tdsUsdt,
        metadata: { from: q.userId, quoteId, remitTo: 'Income Tax Dept (194S)' },
      });

      return { ...q, txnGroup, converted: true, inrWalletBalance: credit.newBalance };
    } catch (err) {
      this.ledger.appendGroup([
        {
          userId: q.userId, type: 'conversion', asset: 'USDT',
          amount: q.usdtForMerchant,
          metadata: { quoteId, reversalOf: txnGroup, reason: err.message },
        },
        {
          userId: q.userId, type: 'fee', asset: 'USDT',
          amount: q.platformFeeUsdt,
          metadata: { quoteId, reversalOf: txnGroup },
        },
        {
          userId: q.userId, type: 'tds', asset: 'USDT',
          amount: q.tdsUsdt,
          metadata: { quoteId, reversalOf: txnGroup },
        },
      ]);
      throw new Error(`conversion failed, USDT restored: ${err.message}`);
    }
  }

  /** Step 2: push INR from the user's own wallet to the merchant. */
  async payMerchant({ quoteId, walletId, upiPin }) {
    const q = this.activeQuotes.get(quoteId);
    if (!q) throw new Error('quote not found');

    // Sandbox-only stand-in. Real UPI PINs are entered on the PSP's
    // secure screen and never transit your backend.
    if (upiPin !== '1234') throw new Error('invalid UPI PIN');

    const payment = await this.fiat.payToUpi({
      walletId,
      upiId: q.upiId,
      amountInr: q.inrAmount,
      note: 'Finora',
    });

    this.ledger.append({
      userId: q.userId, type: 'payment', asset: 'INR',
      amount: -q.inrAmount,
      externalRef: payment.utr,
      metadata: {
        quoteId,
        merchant: payment.to.name,
        upiId: q.upiId,
        merchantStatementShows: payment.merchantStatementShows,
      },
    });

    this.activeQuotes.delete(quoteId);
    return payment;
  }

  async reconcile({ actualUsdtOnChain, actualInrInPool }) {
    return this.ledger.reconcile({ actualUsdtOnChain, actualInrInPool });
  }
}

export default PaymentEngine;
