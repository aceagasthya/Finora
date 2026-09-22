export interface UserSession {
  id: string;
  email: string;
  name: string;
  vpa: string;
  solanaAddress: string;
  kycStatus: string;
}

export interface Quote {
  quoteId: string;
  userId: string;
  upiId: string;
  payeeName: string | null;
  inrAmount: number;
  rate: number;
  usdtForMerchant: number;
  platformFeeUsdt: number;
  tdsUsdt: number;
  totalUsdt: number;
  expiresAt: string;
}

export interface UpiPaymentReceipt {
  paymentId: string;
  utr: string;
  from: {
    name: string;
    vpa: string;
    walletId: string;
  };
  to: {
    name: string;
    upiId: string;
  };
  amountInr: number;
  note?: string;
  merchantStatementShows: string;
  quoteId?: string;
  usdtDeducted?: number;
  feeUsdt?: number;
  tdsUsdt?: number;
  status: 'success' | 'failed';
  completedAt: string;
}

export interface ReconciliationStatus {
  ok: boolean;
  usdt: {
    owed: number;
    actual: number;
    drift: number;
  };
  inr: {
    owed: number;
    actual: number;
    drift: number;
  };
  checkedAt: string;
}
