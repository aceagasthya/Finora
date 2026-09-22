import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, depositAddress } = await req.json();
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json({ error: 'Valid deposit amount required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetAddress = depositAddress || user.usdcDepositAddress;
    if (!targetAddress) {
      return NextResponse.json({ error: 'User has no USDC deposit address configured' }, { status: 400 });
    }

    const txHash = `sim_tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newBalance = Number(user.virtualUsdcBalance) + depositAmount;

    // Atomic transaction for deposit simulation
    const [updatedUser, tx, ledger] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          virtualUsdcBalance: { increment: depositAmount },
        },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'deposit',
          asset: 'USDC',
          amount: depositAmount,
          status: 'confirmed',
          txHash,
          toAddress: targetAddress,
          metadata: JSON.stringify({
            simulated: true,
            provider: 'BitGo Testnet Deposit Simulator',
          }),
        },
      }),
      prisma.ledgerEntry.create({
        data: {
          userId: user.id,
          type: 'deposit',
          asset: 'USDC',
          amount: depositAmount,
          balanceAfter: newBalance,
          description: `Simulated USDC deposit into ${targetAddress.slice(0, 10)}...`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      amount: depositAmount,
      txHash,
      newVirtualUsdcBalance: Number(updatedUser.virtualUsdcBalance),
      message: `Successfully credited ${depositAmount} USDC via simulated BitGo deposit`,
    });
  } catch (err: any) {
    console.error('[Deposit Simulate] Error:', err);
    return NextResponse.json({ error: err.message || 'Deposit simulation failed' }, { status: 500 });
  }
}
