import { NextRequest, NextResponse } from 'next/server';
import { POST as handleKyc } from '@/app/api/onboarding/kyc/route';

export async function POST(req: NextRequest) {
  return handleKyc(req);
}
