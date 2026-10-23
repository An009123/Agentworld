import { type Address, formatUnits, parseAbiItem } from 'viem';
import { client } from './chain';
import { launchpadAbi, portalAbi, erc20Abi } from './abi';
import { FLAP, STOCKS, env } from './config';
import { gatewayUrl } from './pinata';
import { loadEnv } from './env';

export type LaunchView = {
  index: number; token: string; name: string; symbol: string; creator: string; agentHandle: string;
  quoteToken: string; quoteSymbol: string; quoteName: string; tokenVersion: number; kind: 'standard' | 'tax';
  devBuy: string; timestamp: number; txHash?: string; meta?: string; image?: string; description?: string;
  status?: number; progress?: number; buyTax?: number; sellTax?: number;
};

export async function loadLaunches(limit = 50): Promise<{ launchpad: string | null; launches: LaunchView[]; error?: string; paused?: boolean }> {
  loadEnv();
  const lp = env.launchpad();
  if (!lp) return { launchpad: null, launches: [] };
  try {
    const c = client();
    const rows = await c.readContract({ address: lp, abi: launchpadAbi, functionName: 'getLaunches', args: [0n, BigInt(limit), true] });
    const count = Number(await c.readContract({ address: lp, abi: launchpadAbi, functionName: 'launchesCount' }));
    const paused = await c.readContract({ address: lp, abi: launchpadAbi, functionName: 'paused' }).catch(() => false);
    const txByToken = new Map<string, string>();
    const evMeta = new Map<string, { name: string; symbol: string; meta: string }>();
    try {
      const latest = await c.getBlockNumber();
      // tx hashes are cosmetic: scan at most the last LOG_WINDOW blocks (default 10k), 1k-block chunks in parallel
      const win = BigInt(process.env.LOG_WINDOW || 10000);
      const dep = process.env.LAUNCHPAD_DEPLOY_BLOCK ? BigInt(process.env.LAUNCHPAD_DEPLOY_BLOCK) : 0n;
      const from = latest > win && latest - win > dep ? latest - win : dep;
      const ev = launchpadAbi.find((x) => x.type === 'event' && x.name === 'AgentTokenLaunched')!;
      const ranges: [bigint, bigint][] = [];
      for (let start = from; start <= latest; start += 1000n) ranges.push([start, start + 999n > latest ? latest : start + 999n]);
      const all = await Promise.all(ranges.map(([a, b]) => c.getLogs({ address: lp, event: ev as never, fromBlock: a, toBlock: b }).catch(() => [])));
      for (const l of all.flat() as unknown as { transactionHash: string; args: { token: string; name: string; symbol: string; meta: string } }[]) {
        txByToken.set(l.args.token.toLowerCase(), l.transactionHash);
        evMeta.set(l.args.token.toLowerCase(), { name: l.args.name, symbol: l.args.symbol, meta: l.args.meta });
      }
    } catch { /* logs are best-effort */ }
    const launches = await Promise.all(rows.map(async (r, i): Promise<LaunchView> => {
      const stock = STOCKS.find((s) => s.address.toLowerCase() === r.quoteToken.toLowerCase());
      const em = evMeta.get(r.token.toLowerCase());
      const [name, symbol, meta, st] = await Promise.all([
        em?.name ?? c.readContract({ address: r.token, abi: erc20Abi, functionName: 'name' }).catch(() => '?'),
        em?.symbol ?? c.readContract({ address: r.token, abi: erc20Abi, functionName: 'symbol' }).catch(() => '?'),
        em?.meta ?? c.readContract({ address: r.token, abi: erc20Abi, functionName: 'metaURI' }).catch(() => ''),
        c.readContract({ address: FLAP.portal as Address, abi: portalAbi, functionName: 'getTokenV8Safe', args: [r.token] }).catch(() => null),
      ]);
      let image: string | undefined, description: string | undefined;
      if (meta) {
        try {
          const j = await fetch(gatewayUrl(meta), { next: { revalidate: 3600 } } as RequestInit).then((x) => x.json());
          if (j.image) image = `/api/ipfs/${j.image}`;
          description = j.description;
        } catch { /* ignore */ }
      }
      return {
        index: count - 1 - i, token: r.token, name, symbol, creator: r.creator, agentHandle: r.agentHandle,
        quoteToken: r.quoteToken, quoteSymbol: stock?.symbol || '?', quoteName: stock?.name || '', tokenVersion: r.tokenVersion,
        kind: r.tokenVersion === 6 ? 'tax' : 'standard', devBuy: formatUnits(r.quoteAmt, stock?.decimals ?? 18), timestamp: Number(r.timestamp),
        txHash: txByToken.get(r.token.toLowerCase()), meta, image, description,
        status: st ? Number(st.status) : undefined, progress: st ? Number(st.progress) / 1e18 : undefined,
        buyTax: st ? Number(st.buyTaxRate) : undefined, sellTax: st ? Number(st.sellTaxRate) : undefined,
      };
    }));
    return { launchpad: lp, launches, paused };
  } catch (e) {
    return { launchpad: lp, launches: [], error: (e as Error).message.slice(0, 200) };
  }
}
void parseAbiItem;
