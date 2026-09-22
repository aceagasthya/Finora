import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { usdcDepositAddress: true, inrUpiId: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    usdcDepositAddress: user.usdcDepositAddress,
    inrUpiId: user.inrUpiId,
    solanaAddress: user.usdcDepositAddress,
    token: 'ofctsol:usdc',
    network: 'BitGo Solana Testnet',
    qrData: user.usdcDepositAddress,
  });
}
