import { isAddress, type Address } from 'viem';
import { agentStatus } from '@/lib/chain';
import { env } from '@/lib/config';
export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: { address: string } }) {
  if (!isAddress(params.address)) return Response.json({ error: 'bad address' }, { status: 400 });
  return Response.json(await agentStatus(params.address as Address, env.launchpad()), { headers: { 'cache-control': 'no-store' } });
}
