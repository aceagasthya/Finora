import { NextRequest, NextResponse } from 'next/server';
import { POST as handleExecute } from '@/app/api/pay/execute/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adaptedReq = new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        flow: 'FLOW_C',
        amount: body.amount,
        merchantUpiId: body.recipientVpa,
        pin: body.upiPin || body.pin || '1234',
      }),
    });
    return handleExecute(adaptedReq);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
