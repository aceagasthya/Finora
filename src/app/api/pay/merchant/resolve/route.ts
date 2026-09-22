import { NextRequest, NextResponse } from 'next/server';
import { m2pMock } from '@/lib/m2p-mock';

export async function POST(req: NextRequest) {
  try {
    const { upiId } = await req.json();
    if (!upiId) {
      return NextResponse.json({ error: 'UPI ID is required' }, { status: 400 });
    }

    const merchantInfo = await m2pMock.resolveMerchant(upiId);
    return NextResponse.json({ success: true, merchant: merchantInfo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
