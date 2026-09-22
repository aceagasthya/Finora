import { NextRequest } from 'next/server';
import { POST as handleSimulate } from '@/app/api/deposit/simulate/route';

export async function POST(req: NextRequest) {
  return handleSimulate(req);
}
