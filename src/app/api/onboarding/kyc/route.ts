import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createBitGoAddress } from '@/lib/bitgo';
import { m2pMock } from '@/lib/m2p-mock';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, pan, aadhaar, address, dob } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const username = (name || user.name || user.email.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Action 1: Create USDC deposit address on BitGo
    let bitgoAddress = user.usdcDepositAddress;
    let bitgoId = user.bitgoAddressId;
    if (!bitgoAddress) {
      const bitgoRes = await createBitGoAddress(user.id, `finora-${username}`);
      bitgoAddress = bitgoRes.address;
      bitgoId = bitgoRes.addressId;
    }

    // Action 2: Create mocked INR PPI wallet + UPI ID (format: {username}@finora)
    let inrWallet = user.inrWalletId;
    let upiId = user.inrUpiId;
    let upiPin = user.inrUpiPin || '1234';
    if (!inrWallet || !upiId) {
      let candidateUpi = `${username}@finora`;
      const existingUpi = await prisma.user.findFirst({
        where: { inrUpiId: candidateUpi, NOT: { id: user.id } },
      });
      if (existingUpi) {
        candidateUpi = `${username}${Math.floor(100 + Math.random() * 900)}@finora`;
      }
      const m2pRes = await m2pMock.createWallet(user.id, candidateUpi.replace('@finora', ''));
      inrWallet = m2pRes.walletId;
      upiId = candidateUpi;
      upiPin = m2pRes.upiPin;
    }

    // Save both to database, update KYC status to verified
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        kycStatus: 'verified',
        usdcDepositAddress: bitgoAddress,
        bitgoAddressId: bitgoId,
        inrWalletId: inrWallet,
        inrUpiId: upiId,
        inrUpiPin: upiPin,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'KYC verified and accounts created successfully',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        kycStatus: updated.kycStatus,
        usdcDepositAddress: updated.usdcDepositAddress,
        inrUpiId: updated.inrUpiId,
        inrWalletId: updated.inrWalletId,
        virtualUsdcBalance: Number(updated.virtualUsdcBalance),
        virtualInrBalance: Number(updated.virtualInrBalance),
      },
    });
  } catch (err: any) {
    console.error('[KYC Onboarding] Error:', err);
    return NextResponse.json({ error: err.message || 'KYC verification failed' }, { status: 500 });
  }
}
