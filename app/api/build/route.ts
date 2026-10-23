import { isAddress, type Address } from 'viem';
import { buildLaunch, type BuildInput } from '@/lib/build';
import { env, stockBySymbolOrAddress } from '@/lib/config';
import { agentStatus, quoteState } from '@/lib/chain';
import { findSaltFast } from '@/lib/saltFast';
export const dynamic = 'force-dynamic';
// POST {agent,name,symbol,meta,quote,devBuy?,type?,buyTaxBps?,...,salt?} -> approve + launch calldata and exact baw commands.
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Partial<BuildInput>;
    const launchpad = b.launchpad || env.launchpad();
    if (!launchpad) return Response.json({ error: 'NOT_DEPLOYED', message: 'AgentLaunchpad is not deployed on BSC mainnet yet; launch calldata cannot be built.' }, { status: 503 });
    if (!isAddress(launchpad)) throw new Error('invalid launchpad address');
    if (!b.agent || !isAddress(b.agent)) throw new Error('agent address required');
    const st = await agentStatus(b.agent as Address, launchpad as Address);
    const stock = stockBySymbolOrAddress(b.quote || '');
    const allowance = stock ? (await quoteState(b.agent as Address, stock.address, launchpad as Address)).allowance : 0n;
    const salt = b.salt || (await findSaltFast({ type: b.type || 'standard', threads: 1 })).salt;
    const plan = buildLaunch({ ...(b as BuildInput), launchpad, salt, currentAllowance: allowance });
    return Response.json({ agent: st, warning: st.hasAgentId ? undefined : 'this address holds no .ai Agent ID: launch() will revert with NotAgent', ...plan }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
}
