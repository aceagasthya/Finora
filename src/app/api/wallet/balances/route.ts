import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USDC_INR_RATE } from '@/lib/fee-calculator';

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      virtualUsdcBalance: true,
      virtualInrBalance: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const usdc = Number(user.virtualUsdcBalance);
  const inr = Number(user.virtualInrBalance);

  return NextResponse.json({
    balances: {
      usdc,
      usdt: usdc, // for backwards compat with older components
      inr,
      totalPortfolioInr: inr + usdc * USDC_INR_RATE,
    },
    exchangeRate: USDC_INR_RATE,
  });
}
