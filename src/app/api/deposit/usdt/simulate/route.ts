import { NextRequest } from 'next/server';
import { POST as handleDepositSimulate } from '@/app/api/deposit/simulate/route';

export async function POST(req: NextRequest) {
  return handleDepositSimulate(req);
}
