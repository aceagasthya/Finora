import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateUsdcToInr, calculateInrToUsdc } from '@/lib/fee-calculator';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { flow, amount } = await req.json();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (flow === 'USDC_TO_INR') {
      // Flow A: Convert USDC -> INR
      // amount is INR target
      const quote = calculateUsdcToInr(numAmount);
      const userUsdcBal = Number(user.virtualUsdcBalance);

      if (userUsdcBal < quote.totalUsdcToDeduct) {
        return NextResponse.json(
          {
            error: `Insufficient USDC balance. Required: ${quote.totalUsdcToDeduct} USDC (including ₹${quote.inrAmount} + 1% fee + 1% TDS), Available: ${userUsdcBal} USDC. Please deposit USDC first.`,
            required: quote.totalUsdcToDeduct,
            available: userUsdcBal,
          },
          { status: 400 }
        );
      }

      const newUsdcBal = userUsdcBal - quote.totalUsdcToDeduct;
      const newInrBal = Number(user.virtualInrBalance) + quote.inrAmount;
      const txId = `conv_${Date.now()}`;

      // Atomic conversion transaction
      const [updatedUser, txRecord] = await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            virtualUsdcBalance: { decrement: quote.totalUsdcToDeduct },
            virtualInrBalance: { increment: quote.inrAmount },
          },
        }),
        prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'conversion',
            asset: 'USDC',
            amount: quote.totalUsdcToDeduct,
            status: 'confirmed',
            txHash: txId,
            metadata: JSON.stringify({
              flow: 'USDC_TO_INR',
              inrCredited: quote.inrAmount,
              feeUsdc: quote.platformFeeUsdc,
              tdsUsdc: quote.tdsUsdc,
              rate: quote.rate,
            }),
          },
        }),
        prisma.ledgerEntry.create({
          data: {
            userId: user.id,
            type: 'conversion_debit',
            asset: 'USDC',
            amount: -quote.totalUsdcToDeduct,
            balanceAfter: newUsdcBal,
            description: `Converted ${quote.totalUsdcToDeduct} USDC for ₹${quote.inrAmount} INR (Fee: ${quote.platformFeeUsdc} USDC, TDS: ${quote.tdsUsdc} USDC)`,
            transactionId: txId,
          },
        }),
        prisma.ledgerEntry.create({
          data: {
            userId: user.id,
            type: 'conversion_credit',
            asset: 'INR',
            amount: quote.inrAmount,
            balanceAfter: newInrBal,
            description: `Credited ₹${quote.inrAmount} INR from USDC conversion`,
            transactionId: txId,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Successfully converted ${quote.totalUsdcToDeduct} USDC to ₹${quote.inrAmount}`,
        virtualUsdcBalance: Number(updatedUser.virtualUsdcBalance),
        virtualInrBalance: Number(updatedUser.virtualInrBalance),
        quote,
      });
    } else if (flow === 'INR_TO_USDC') {
      // Flow B: Convert INR -> USDC
      // amount is USDC target
      const quote = calculateInrToUsdc(numAmount);
      const userInrBal = Number(user.virtualInrBalance);

      if (userInrBal < quote.totalInrToDeduct) {
        return NextResponse.json(
          {
            error: `Insufficient INR balance. Required: ₹${quote.totalInrToDeduct}, Available: ₹${userInrBal}`,
            required: quote.totalInrToDeduct,
            available: userInrBal,
          },
          { status: 400 }
        );
      }

      const newInrBal = userInrBal - quote.totalInrToDeduct;
      const newUsdcBal = Number(user.virtualUsdcBalance) + quote.usdcAmount;
      const txId = `conv_${Date.now()}`;

      const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            virtualInrBalance: { decrement: quote.totalInrToDeduct },
            virtualUsdcBalance: { increment: quote.usdcAmount },
          },
        }),
        prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'conversion',
            asset: 'INR',
            amount: quote.totalInrToDeduct,
            status: 'confirmed',
            txHash: txId,
            metadata: JSON.stringify({
              flow: 'INR_TO_USDC',
              usdcCredited: quote.usdcAmount,
              feeInr: quote.platformFeeInr,
              tdsInr: quote.tdsInr,
              rate: quote.rate,
            }),
          },
        }),
        prisma.ledgerEntry.create({
          data: {
            userId: user.id,
            type: 'conversion_debit',
            asset: 'INR',
            amount: -quote.totalInrToDeduct,
            balanceAfter: newInrBal,
            description: `Converted ₹${quote.totalInrToDeduct} INR for ${quote.usdcAmount} USDC (Fee: ₹${quote.platformFeeInr}, TDS: ₹${quote.tdsInr})`,
            transactionId: txId,
          },
        }),
        prisma.ledgerEntry.create({
          data: {
            userId: user.id,
            type: 'conversion_credit',
            asset: 'USDC',
            amount: quote.usdcAmount,
            balanceAfter: newUsdcBal,
            description: `Credited ${quote.usdcAmount} USDC from INR conversion`,
            transactionId: txId,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Successfully converted ₹${quote.totalInrToDeduct} to ${quote.usdcAmount} USDC`,
        virtualUsdcBalance: Number(updatedUser.virtualUsdcBalance),
        virtualInrBalance: Number(updatedUser.virtualInrBalance),
        quote,
      });
    } else {
      return NextResponse.json({ error: 'Invalid conversion flow' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[Pay Convert] Error:', err);
    return NextResponse.json({ error: err.message || 'Conversion failed' }, { status: 500 });
  }
}
