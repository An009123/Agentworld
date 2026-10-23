#!/usr/bin/env -S npx tsx
// Agent CLI for AgentLaunchpad (BNB Chain). Never sends transactions: it prints calldata and the exact
// Binance Agentic Wallet (baw) commands; the agent's own wallet signs.
//
//   npx tsx cli/agent-launch.ts preflight --agent 0x...
//   npx tsx cli/agent-launch.ts stocks
//   npx tsx cli/agent-launch.ts upload  --image ./logo.png --agent 0x... [--description ..] [--website ..] [--twitter ..] [--telegram ..] [--flap-pin]
//   npx tsx cli/agent-launch.ts salt    --type standard|tax
//   npx tsx cli/agent-launch.ts build   --agent 0x... --name N --symbol S --meta CID --quote NVDAB --dev-buy 1 [--type tax --tax 300] [--salt 0x..]
//   npx tsx cli/agent-launch.ts prepare --agent 0x... --name N --symbol S --image ./logo.png --quote NVDAB --dev-buy 1 [...]   (upload + salt + build)
//   npx tsx cli/agent-launch.ts launches [--limit 20]
import fs from 'fs';
import path from 'path';
import { type Address, type Hex, formatUnits, isAddress } from 'viem';
import { loadEnv, secretStatus } from '../lib/env';
import { env, STOCKS, STOCK_SOURCE, AGENT_ID_REGISTRY, FLAP, stockBySymbolOrAddress, links } from '../lib/config';
import { agentStatus, quoteState, listLaunches } from '../lib/chain';
import { uploadTokenMeta, requestFlapPin } from '../lib/pinata';
import { findSaltFast } from '../lib/saltFast';
import { buildLaunch } from '../lib/build';

loadEnv();
const [cmd, ...rest] = process.argv.slice(2);
const flags: Record<string, string> = {};
for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) { const k = rest[i].slice(2); const v = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true'; flags[k] = v; }
const need = (k: string) => { if (!flags[k]) throw new Error(`--${k} is required`); return flags[k]; };
const out = (o: unknown) => console.log(JSON.stringify(o, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
const launchpad = () => { const a = flags.launchpad || env.launchpad(); if (!a || !isAddress(a)) throw new Error('AgentLaunchpad address unknown: pass --launchpad 0x... or set LAUNCHPAD_ADDRESS'); return a as Address; };
const mime = (f: string) => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' } as Record<string, string>)[path.extname(f).toLowerCase()] || 'application/octet-stream';
const libDir = path.join(__dirname, '../lib');

async function upload() {
  const img = need('image');
  const r = await uploadTokenMeta({ image: new Uint8Array(fs.readFileSync(img)), imageName: path.basename(img), imageType: mime(img), creator: need('agent'), description: flags.description, website: flags.website, twitter: flags.twitter, telegram: flags.telegram });
  const pins = flags['flap-pin'] === 'true' ? { image: await requestFlapPin(r.imageCid, 'image'), meta: await requestFlapPin(r.metaCid, 'meta') } : undefined;
  return { ...r, flapPin: pins };
}

async function build(meta: string, salt?: Hex) {
  const lp = launchpad();
  const type = (flags.type || 'standard') as 'standard' | 'tax';
  const s = salt || (flags.salt as Hex) || (await findSaltFast({ type, threads: 4, libDir })).salt;
  const stock = stockBySymbolOrAddress(need('quote'));
  let allowance = 0n;
  if (stock && flags['skip-chain'] !== 'true') allowance = (await quoteState(need('agent') as Address, stock.address, lp)).allowance;
  return buildLaunch({
    launchpad: lp, agent: need('agent'), name: need('name'), symbol: need('symbol'), meta, salt: s, quote: need('quote'), devBuy: flags['dev-buy'] || '0', type,
    buyTaxBps: flags.tax ? Number(flags.tax) : undefined, sellTaxBps: flags['sell-tax'] ? Number(flags['sell-tax']) : undefined,
    taxDurationDays: flags['tax-days'] ? Number(flags['tax-days']) : undefined, antiFarmerDays: flags['anti-farmer-days'] ? Number(flags['anti-farmer-days']) : undefined,
    mktBps: flags['mkt-bps'] ? Number(flags['mkt-bps']) : undefined, deflationBps: flags['deflation-bps'] ? Number(flags['deflation-bps']) : undefined,
    dividendBps: flags['dividend-bps'] ? Number(flags['dividend-bps']) : undefined, lpBps: flags['lp-bps'] ? Number(flags['lp-bps']) : undefined,
    currentAllowance: allowance,
  });
}

async function main() {
  switch (cmd) {
    case 'preflight': {
      const agent = need('agent') as Address;
      const lp = flags.launchpad || env.launchpad();
      const st = await agentStatus(agent, lp as Address | '');
      const quote = flags.quote ? stockBySymbolOrAddress(flags.quote) : undefined;
      const qs = quote ? await quoteState(agent, quote.address, lp as Address | '') : undefined;
      out({
        ...st, agentIdRegistry: AGENT_ID_REGISTRY, launchpad: lp || null,
        quote: quote && qs ? { symbol: quote.symbol, balance: formatUnits(qs.balance, quote.decimals), allowanceToLaunchpad: formatUnits(qs.allowance, quote.decimals) } : undefined,
        pinata: secretStatus(),
        ready: st.hasAgentId && st.isEOA,
        bawChecklist: [
          'baw wallet status --json            # must be signed in (else: baw auth signin --json, then baw auth verify --qrCodeId <id> --json)',
          'baw wallet settings --json          # devMode.enabled must be true (Binance App > Agentic Wallet > Developer Mode)',
          'baw wallet address --json           # BSC address must equal --agent',
          `baw wallet resolve-domain --name ${st.handle || '<handle>.ai'} --binanceChainId 56 --json   # optional cross-check`,
        ],
      });
      break;
    }
    case 'stocks': out({ source: STOCK_SOURCE, count: STOCKS.length, stocks: STOCKS }); break;
    case 'upload': out(await upload()); break;
    case 'salt': out(await findSaltFast({ type: (flags.type || 'standard') as 'standard' | 'tax', engine: (flags.engine as 'auto') || 'auto', threads: Number(flags.threads || 4), libDir })); break;
    case 'build': out(await build(need('meta'))); break;
    case 'prepare': { const u = await upload(); const b = await build(u.metaCid); out({ upload: u, ...b }); break; }
    case 'launches': {
      const rows = await listLaunches(launchpad(), Number(flags.limit || 20));
      out(rows.map((r) => ({ token: r.token, creator: r.creator, agent: `${r.agentHandle}.ai`, pair: r.quoteSymbol, tokenVersion: r.tokenVersion, timestamp: new Date(Number(r.timestamp) * 1000).toISOString(), bscscan: links.bscscanToken(r.token), flap: links.flap(r.token) })));
      break;
    }
    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).join('\n'));
      console.log(`\nPortal ${FLAP.portal} · Agent ID registry ${AGENT_ID_REGISTRY}`);
  }
}
main().catch((e) => { console.error('error:', e.shortMessage || e.message); process.exit(1); });
