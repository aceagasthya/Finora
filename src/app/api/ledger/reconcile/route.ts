import { GET as handleReconciliation } from '@/app/api/ledger/reconciliation/route';

export async function GET() {
  return handleReconciliation();
}
