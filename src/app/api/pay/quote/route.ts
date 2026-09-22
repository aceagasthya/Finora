import { NextRequest, NextResponse } from 'next/server';
import { calculateUsdcToInr, calculateInrToUsdc } from '@/lib/fee-calculator';

export async function POST(req: NextRequest) {
  try {
    const { flow, amount } = await req.json();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (flow === 'USDC_TO_INR') {
      // User specifies INR amount to pay merchant, quote shows USDC needed
      const quote = calculateUsdcToInr(numAmount);
      return NextResponse.json({ success: true, quote });
    } else if (flow === 'INR_TO_USDC') {
      // User specifies USDC to withdraw, quote shows INR needed
      const quote = calculateInrToUsdc(numAmount);
      return NextResponse.json({ success: true, quote });
    } else if (flow === 'INR_TO_INR') {
      return NextResponse.json({
        success: true,
        quote: {
          inrAmount: numAmount,
          rate: 1,
          platformFeeInr: 0,
          tdsInr: 0,
          totalInrToDeduct: numAmount,
        },
      });
    } else if (flow === 'USDC_TO_USDC') {
      return NextResponse.json({
        success: true,
        quote: {
          usdcAmount: numAmount,
          rate: 1,
          platformFeeUsdc: 0,
          tdsUsdc: 0,
          totalUsdcToDeduct: numAmount,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid payment flow' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[Pay Quote] Error:', err);
    return NextResponse.json({ error: err.message || 'Quote calculation failed' }, { status: 500 });
  }
}
