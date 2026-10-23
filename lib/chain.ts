import { createPublicClient, http, type Address } from 'viem';
import { bsc } from 'viem/chains';
import { AGENT_ID_REGISTRY, FLAP, STOCKS, env } from './config';
import { agentIdAbi, erc20Abi, launchpadAbi } from './abi';

export const client = (rpc = env.rpc()) => createPublicClient({ chain: bsc, transport: http(rpc) });

export async function agentStatus(addr: Address, launchpad?: Address | '') {
  const c = client();
  const [bal, handle, bnb, code] = await Promise.all([
    c.readContract({ address: AGENT_ID_REGISTRY, abi: agentIdAbi, functionName: 'balanceOf', args: [addr] }),
    c.readContract({ address: AGENT_ID_REGISTRY, abi: agentIdAbi, functionName: 'handleOf', args: [addr] }).catch(() => ''),
    c.getBalance({ address: addr }),
    c.getCode({ address: addr }),
  ]);
  let onWrapper: boolean | null = null;
  if (launchpad) onWrapper = await c.readContract({ address: launchpad, abi: launchpadAbi, functionName: 'isAgent', args: [addr] }).catch(() => null);
  return { address: addr, hasAgentId: bal > 0n, handle: handle ? `${handle}.ai` : null, isEOA: !code || code === '0x', bnbWei: bnb.toString(), wrapperIsAgent: onWrapper };
}

export async function quoteState(owner: Address, quote: Address, spender?: Address | '') {
  const c = client();
  const [bal, allowance] = await Promise.all([
    c.readContract({ address: quote, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }),
    spender ? c.readContract({ address: quote, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] }) : Promise.resolve(0n),
  ]);
  return { balance: bal, allowance };
}

export async function listLaunches(launchpad: Address, limit = 50) {
  const c = client();
  const rows = await c.readContract({ address: launchpad, abi: launchpadAbi, functionName: 'getLaunches', args: [0n, BigInt(limit), true] });
  return rows.map((r) => ({
    ...r,
    quoteSymbol: STOCKS.find((s) => s.address.toLowerCase() === r.quoteToken.toLowerCase())?.symbol || r.quoteToken,
  }));
}
export { FLAP };
