import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBitGoWalletBalance } from '@/lib/bitgo';
import { m2pMock } from '@/lib/m2p-mock';

export async function GET() {
  try {
    // 1. Calculate Virtual USDC Sum (Sum of all users' virtualUsdcBalance)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        virtualUsdcBalance: true,
        virtualInrBalance: true,
      },
    });

    const totalVirtualUsdc = users.reduce((acc, u) => acc + Number(u.virtualUsdcBalance), 0);
    const totalVirtualInr = users.reduce((acc, u) => acc + Number(u.virtualInrBalance), 0);

    // 2. Fetch Actual BitGo wallet balance live via API
    const actualBitGoUsdc = await getBitGoWalletBalance();

    // 3. Compute USDC Drift (Virtual liability vs On-chain/Custodian asset)
    const usdcDrift = totalVirtualUsdc - actualBitGoUsdc;
    const usdcDriftStatus = Math.abs(usdcDrift) < 0.0001 ? 'MATCHED' : usdcDrift > 0 ? 'DEFICIT' : 'SURPLUS';

    // 4. INR Pool Balance & Drift
    const mockInrPool = m2pMock.getPoolBalance();
    const inrDrift = mockInrPool - totalVirtualInr;
    const inrDriftStatus = inrDrift >= 0 ? 'HEALTHY_RESERVE' : 'DEFICIT';

    // 5. Fetch recent ledger audit entries
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const formattedLedger = ledgerEntries.map((e) => ({
      id: e.id,
      userId: e.userId,
      userName: e.user?.name || 'Unknown',
      type: e.type,
      asset: e.asset,
      amount: Number(e.amount),
      balanceAfter: Number(e.balanceAfter),
      description: e.description,
      createdAt: e.createdAt.toISOString(),
      transactionId: e.transactionId,
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      reconciliation: {
        usdc: {
          virtualSum: Number(totalVirtualUsdc.toFixed(4)),
          actualBitGo: Number(actualBitGoUsdc.toFixed(4)),
          drift: Number(usdcDrift.toFixed(4)),
          status: usdcDriftStatus,
          walletId: process.env.BITGO_WALLET_ID || '6ab0355036e69a90fd29558eae1dc020',
          enterpriseId: process.env.BITGO_ENTERPRISE_ID || '6aace2efb068089b8423fed1ac030580',
          token: process.env.BITGO_TOKEN || 'ofctsol:usdc',
        },
        inr: {
          virtualSum: Number(totalVirtualInr.toFixed(2)),
          poolBalance: Number(mockInrPool.toFixed(2)),
          drift: Number(inrDrift.toFixed(2)),
          status: inrDriftStatus,
          provider: 'M2P FinTech / Sponsor Bank Sandbox',
        },
      },
      userCount: users.length,
      ledgerEntries: formattedLedger,
    });
  } catch (err: any) {
    console.error('[Ledger Reconciliation API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch reconciliation' }, { status: 500 });
  }
}
