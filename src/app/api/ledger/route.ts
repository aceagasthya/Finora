import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const asset = searchParams.get('asset');
  const type = searchParams.get('type');
  const limit = Number(searchParams.get('limit')) || 100;

  const whereClause: any = { userId: session.id };
  if (asset && asset !== 'ALL') whereClause.asset = asset;
  if (type && type !== 'ALL') whereClause.type = type;

  const entries = await prisma.ledgerEntry.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ entries });
}
