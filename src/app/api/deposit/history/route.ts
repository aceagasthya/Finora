import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deposits = await prisma.transaction.findMany({
    where: {
      userId: session.id,
      type: 'deposit',
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  return NextResponse.json({ deposits });
}
