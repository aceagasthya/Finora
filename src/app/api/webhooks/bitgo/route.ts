import prisma from '@/lib/prisma';
import { bitgoFetch } from '@/lib/bitgo';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (payload.token && !['ofctsol:usdc', 'ofctsol:usdcv2', 'ofc', 'ofctsol'].includes(payload.token)) {
      return Response.json({ ok: true, ignored: `token ${payload.token} ignored` });
    }

    if (payload.state && payload.state !== 'confirmed') {
      return Response.json({ ok: true, ignored: 'not confirmed' });
    }

    let transfer: any = payload.transferDetails;
    let depositAddress = payload.depositAddress;
    let txid = payload.txid;
    let amount = payload.amount;

    // If real BitGo webhook notification (with wallet and transfer ID)
    if (!transfer && payload.wallet && payload.transfer) {
      const transferRes = await bitgoFetch(
        `https://app.bitgo-test.com/api/v2/ofc/wallet/${payload.wallet}/transfer/${payload.transfer}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.BITGO_ACCESS_TOKEN}`,
          },
        }
      );
      if (transferRes.ok) {
        transfer = await transferRes.json();
      }
    }

    if (transfer) {
      depositAddress = depositAddress || transfer.entries?.[0]?.address || transfer.toAddress;
      txid = txid || transfer.txid || transfer.id || `bitgo_tx_${Date.now()}`;
      if (!amount && transfer.valueString) {
        amount = Math.abs(parseInt(transfer.valueString, 10)) / 1_000_000;
      }
    }

    if (!depositAddress) {
      console.error('[BitGo Webhook] Missing deposit address in payload:', payload);
      return Response.json({ ok: false, error: 'Missing deposit address' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { usdcDepositAddress: depositAddress },
    });

    if (!user) {
      console.error('[BitGo Webhook] Unknown deposit address:', depositAddress);
      return Response.json({ ok: false, error: 'Unknown deposit address' }, { status: 400 });
    }

    const finalTxHash = txid || `tx_dep_${Date.now()}`;

    // Idempotency check: prevent double processing
    const existing = await prisma.transaction.findFirst({
      where: { txHash: finalTxHash },
    });

    if (existing) {
      return Response.json({ ok: true, message: 'Already processed' });
    }

    const depositAmount = Number(amount || 50);
    const newBalance = Number(user.virtualUsdcBalance) + depositAmount;

    // Atomic database transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { virtualUsdcBalance: { increment: depositAmount } },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'deposit',
          asset: 'USDC',
          amount: depositAmount,
          status: 'confirmed',
          txHash: finalTxHash,
          toAddress: depositAddress,
          metadata: JSON.stringify({
            source: 'BitGo OFC Webhook',
            raw: payload,
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
          description: `USDC deposit into BitGo address ${depositAddress.slice(0, 8)}...`,
        },
      }),
    ]);

    console.log(`[BitGo Webhook] Successfully credited ${depositAmount} USDC to user ${user.name} (${user.id})`);
    return Response.json({ ok: true, newBalance });
  } catch (err: any) {
    console.error('[BitGo Webhook] Exception:', err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
