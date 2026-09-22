import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('type') || 'all';
    const format = searchParams.get('format');

    const whereClause: any = { userId: session.id };
    if (filterType && filterType !== 'all') {
      whereClause.type = filterType;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const formatted = transactions.map((t) => {
      let counterparty = t.merchantUpiId || t.toAddress || t.fromAddress || 'Self / Finora';
      if (t.metadata) {
        try {
          const parsed = JSON.parse(t.metadata);
          if (parsed.merchantName) counterparty = parsed.merchantName;
          else if (parsed.recipient) counterparty = parsed.recipient;
        } catch {
          // ignore
        }
      }

      return {
        id: t.id,
        type: t.type,
        asset: t.asset,
        amount: Number(t.amount),
        status: t.status,
        txHash: t.txHash,
        utr: t.utr,
        counterparty,
        createdAt: t.createdAt.toISOString(),
        metadata: t.metadata,
      };
    });

    // If CSV download requested
    if (format === 'csv') {
      const headers = ['Transaction ID', 'Type', 'Asset', 'Amount', 'Status', 'Counterparty', 'TxHash / UTR', 'Date'];
      const rows = formatted.map((tx) => [
        `"${tx.id}"`,
        `"${tx.type}"`,
        `"${tx.asset}"`,
        tx.amount,
        `"${tx.status}"`,
        `"${tx.counterparty}"`,
        `"${tx.txHash || tx.utr || ''}"`,
        `"${tx.createdAt}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="finora-transactions-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      transactions: formatted,
      count: formatted.length,
    });
  } catch (err: any) {
    console.error('[Transactions API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}
