import prisma from './prisma';
import { calculateUsdcToInr, calculateInrToUsdc, USDC_INR_RATE } from './fee-calculator';

export class PaymentService {
  private static instance: PaymentService;

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async getExchangeRate(): Promise<number> {
    return USDC_INR_RATE;
  }

  async getDerivedBalances(userId: string): Promise<{ usdc: number; inr: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { virtualUsdcBalance: true, virtualInrBalance: true },
    });

    return {
      usdc: Number(user?.virtualUsdcBalance || 0),
      inr: Number(user?.virtualInrBalance || 0),
    };
  }
}

export const paymentService = PaymentService.getInstance();
export default paymentService;
