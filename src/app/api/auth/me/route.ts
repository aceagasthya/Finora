import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getUserAvatarUrl } from '@/lib/avatar';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        kycStatus: true,
        bitgoAddressId: true,
        usdcDepositAddress: true,
        inrWalletId: true,
        inrUpiId: true,
        avatarUrl: true,
        virtualUsdcBalance: true,
        virtualInrBalance: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Also fetch last 5 transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      user: {
        ...user,
        avatarUrl: user.avatarUrl || getUserAvatarUrl(user),
        virtualUsdcBalance: Number(user.virtualUsdcBalance),
        virtualInrBalance: Number(user.virtualInrBalance),
      },
      recentTransactions: recentTransactions.map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
      })),
    });
  } catch (err: any) {
    console.error('[Auth Me] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch user' }, { status: 500 });
  }
}
