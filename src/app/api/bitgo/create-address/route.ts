import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createBitGoAddress } from '@/lib/bitgo';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    const userId = body.userId || session?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized or userId missing' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user already has an address and force is not set, return existing
    if (user.usdcDepositAddress && user.bitgoAddressId && !body.force && !body.forceNew) {
      return NextResponse.json({
        success: true,
        address: user.usdcDepositAddress,
        addressId: user.bitgoAddressId,
        alreadyExisted: true,
        message: 'Existing BitGo deposit address returned',
      });
    }

    const cleanName = (user.name || user.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
    const label = body.label || `finora-${cleanName}`;
    const bitgoResult = await createBitGoAddress(user.id, label);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        usdcDepositAddress: bitgoResult.address,
        bitgoAddressId: bitgoResult.addressId,
      },
    });

    return NextResponse.json({
      success: true,
      address: updatedUser.usdcDepositAddress,
      addressId: updatedUser.bitgoAddressId,
    });
  } catch (err: any) {
    console.error('[BitGo Create Address API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create BitGo address' }, { status: 500 });
  }
}
