import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
  });

  const headers = ['Timestamp', 'Entry ID', 'Type', 'Asset', 'Amount', 'Balance After', 'Description', 'Transaction ID'];
  const rows = entries.map((e) => [
    e.createdAt.toISOString(),
    e.id,
    e.type,
    e.asset,
    e.amount.toString(),
    e.balanceAfter.toString(),
    `"${(e.description || '').replace(/"/g, '""')}"`,
    e.transactionId || '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="finora-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
