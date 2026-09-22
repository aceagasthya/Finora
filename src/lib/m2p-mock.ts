/**
 * Mocked M2P Layer for INR PPI Wallet & UPI Payments
 * Simulates M2P FinTech / Sponsor Bank Integration
 */

export interface UpiMerchantInfo {
  upiId: string;
  payeeName: string;
  category: string;
  verified: boolean;
}

// Global in-memory pool balance for demonstration and reconciliation
let globalPoolBalanceInr = 10_000_000; // ₹1,00,00,000 INR Liquidity Pool

export const m2pMock = {
  /**
   * Creates an INR PPI wallet + UPI ID for the user
   */
  async createWallet(userId: string, username: string) {
    const cleanUsername = (username || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const upiId = `${cleanUsername}@finora`;
    return {
      walletId: `m2p_${userId}`,
      upiId,
      upiPin: '1234',
    };
  },

  /**
   * Credits the user's virtual INR PPI wallet
   */
  async creditWallet(walletId: string, amount: number) {
    globalPoolBalanceInr += amount;
    return {
      success: true,
      utr: `CR${Date.now()}`,
    };
  },

  /**
   * Initiates a UPI payment to a merchant
   * Merchant statement shows: "{payerName} paid ₹{amount}"
   */
  async initiateUpiPayment(walletId: string, merchantUpiId: string, amount: number, pin: string) {
    if (pin !== '1234') {
      return { success: false, error: 'Invalid PIN' };
    }

    const utr = `UTR${Date.now().toString().slice(-12)}`;
    return {
      success: true,
      utr,
      status: 'success' as const,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Resolves merchant details and verified state
   */
  async resolveMerchant(upiId: string): Promise<UpiMerchantInfo> {
    const directory: Record<string, { name: string; category: string }> = {
      'swiggy@icici': { name: 'Swiggy Food & Instamart', category: 'Food & Groceries' },
      'zomato@hdfcbank': { name: 'Zomato Dining & Delivery', category: 'Food & Dining' },
      'starbucks@axisbank': { name: 'Tata Starbucks India', category: 'Cafe & Beverages' },
      'chaipoint@yesbank': { name: 'Chai Point Outlets', category: 'Tea & Snacks' },
      'reliance@sbi': { name: 'Reliance Smart Superstore', category: 'Retail & Supermarket' },
      'kirana@paytm': { name: 'Sharma General Mart', category: 'Daily Essentials' },
      'shop@upi': { name: 'Rajesh Kirana & General Store', category: 'Retail & Daily Needs' },
    };

    const clean = upiId.trim().toLowerCase();
    if (directory[clean]) {
      return {
        upiId: clean,
        payeeName: directory[clean].name,
        category: directory[clean].category,
        verified: true,
      };
    }

    const prefix = clean.split('@')[0] || 'Merchant';
    const formatted = prefix
      .split(/[._-]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');

    return {
      upiId: clean,
      payeeName: `${formatted} Store`,
      category: 'UPI Merchant',
      verified: true,
    };
  },

  /**
   * Returns current mock INR pool balance for reconciliation
   */
  getPoolBalance(): number {
    return globalPoolBalanceInr;
  },
};

export default m2pMock;
