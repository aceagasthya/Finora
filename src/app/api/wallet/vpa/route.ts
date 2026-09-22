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
    select: { id: true, inrUpiId: true, inrWalletId: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const upiId = user.inrUpiId || `${user.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@finora`;

  return NextResponse.json({
    vpa: upiId,
    inrUpiId: upiId,
    walletId: user.inrWalletId || `m2p_${user.id}`,
    accountName: user.name,
    qrData: `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.name)}&cu=INR`,
  });
}
