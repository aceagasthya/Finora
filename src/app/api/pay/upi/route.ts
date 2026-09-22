import { NextRequest, NextResponse } from 'next/server';
import { POST as handleExecute } from '@/app/api/pay/execute/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Adapt legacy payload if needed
    const adaptedReq = new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        flow: body.directInr ? 'FLOW_C' : 'FLOW_A',
        amount: body.inrAmount,
        merchantUpiId: body.upiId,
        pin: body.upiPin || body.pin,
      }),
    });
    return handleExecute(adaptedReq);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
