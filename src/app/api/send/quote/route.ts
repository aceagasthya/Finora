import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { calculateUsdcToInr, calculateInrToUsdc, USDC_INR_RATE } from '@/lib/fee-calculator';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, method } = await req.json();
    const numAmount = Number(amount) || 0;

    let quoteDetails: any = {};

    if (method === 'USDC_USDC' || method === 'USDT_USDT') {
      quoteDetails = {
        sendAsset: 'USDC',
        receiveAsset: 'USDC',
        amount: numAmount,
        networkFeeUsdc: 0,
        totalDeductUsdc: numAmount,
      };
    } else if (method === 'INR_USDC') {
      const q = calculateInrToUsdc(numAmount);
      quoteDetails = {
        sendAsset: 'INR',
        receiveAsset: 'USDC',
        amount: numAmount,
        rate: q.rate,
        totalDeductInr: q.totalInrToDeduct,
        platformFeeInr: q.platformFeeInr,
        tdsInr: q.tdsInr,
      };
    } else {
      const q = calculateUsdcToInr(numAmount);
      quoteDetails = {
        sendAsset: 'USDC',
        receiveAsset: 'INR',
        amount: numAmount,
        rate: q.rate,
        totalDeductUsdc: q.totalUsdcToDeduct,
        platformFeeUsdc: q.platformFeeUsdc,
        tdsUsdc: q.tdsUsdc,
      };
    }

    return NextResponse.json({ quote: quoteDetails });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
