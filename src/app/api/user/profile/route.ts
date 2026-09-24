import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, avatarUrl } = await req.json();

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: {
        name: name || undefined,
        phone: phone !== undefined ? phone : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        kycStatus: updated.kycStatus,
        usdcDepositAddress: updated.usdcDepositAddress,
        inrUpiId: updated.inrUpiId,
      },
    });
  } catch (err: any) {
    console.error('[User Profile API] Error:', err);
    return NextResponse.json({ error: err.message || 'Profile update failed' }, { status: 500 });
  }
}
