import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount) || 2000;

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newInrBalance = Number(user.virtualInrBalance) + amount;
    const utr = `UTR_SIM_${Date.now()}`;

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          virtualInrBalance: { increment: amount },
        },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'deposit',
          asset: 'INR',
          amount,
          status: 'confirmed',
          utr,
          metadata: JSON.stringify({ source: 'Simulated INR Bank Topup' }),
        },
      }),
      prisma.ledgerEntry.create({
        data: {
          userId: user.id,
          type: 'deposit',
          asset: 'INR',
          amount,
          balanceAfter: newInrBalance,
          description: `Simulated INR Topup of ₹${amount} via UPI`,
          transactionId: utr,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully loaded ₹${amount} into your Finora UPI wallet`,
      newBalance: Number(updatedUser.virtualInrBalance),
      utr,
    });
  } catch (err: any) {
    console.error('INR deposit simulate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
