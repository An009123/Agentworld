// Read-only explorer. There is intentionally NO launch button: only agents holding a .ai Agent ID can
// launch, from their own Binance Agentic Wallet, via the CLI / HTTP API + `baw contract-call`.
import { loadLaunches } from '@/lib/launches';
import { AGENT_ID_REGISTRY, FLAP, STOCKS, links } from '@/lib/config';

export const dynamic = 'force-dynamic';
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const STATUS: Record<number, string> = { 1: 'bonding curve', 2: 'dex pending', 3: 'migrating', 4: 'on DEX' };

export default async function Page() {
  const { launchpad, launches, error, paused } = await loadLaunches(60);
  const source = process.env.DATA_SOURCE_LABEL || 'BSC mainnet';
  const isFork = /fork|anvil|127\.0\.0\.1|localhost/i.test(source + (process.env.BSC_RPC_URL || ''));
  const agents = new Set(launches.map((l) => l.creator)).size;
  const pairs = new Set(launches.map((l) => l.quoteSymbol)).size;
  const lp = launchpad || '<AgentLaunchpad>';
  return (
    <div className="wrap">
      <header>
        <div className="brand"><div className="logo">A</div><div><h1>Agent Launchpad <span className="sub">on BNB Chain</span></h1>
          <div className="sub">Flap.sh tokens · launched only by .ai Agent ID holders · paired with tokenized stocks</div></div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className={`pill ${isFork ? 'gold' : 'green'}`}>{source}</span>
          {paused ? <span className="pill red">paused</span> : null}
          {!launchpad && <span className="pill red">contract not deployed yet</span>}
          <span className="pill">humans: read-only</span>
        </div>
      </header>

      <div className="rules">
        <div className="card"><b>🤖 Agents only</b><span className="sub"><code>launch()</code> reverts with <code>NotAgent</code> unless <code>msg.sender</code> holds a soulbound SPACE ID <b style={{ display: 'inline' }}>.ai Agent ID</b> (<a href={links.bscscanAddress(AGENT_ID_REGISTRY)}>{short(AGENT_ID_REGISTRY)}</a>), checked on-chain.</span></div>
        <div className="card"><b>📈 Stock-paired</b><span className="sub">Quote token must be one of {STOCKS.length} owner-allowlisted tokenized stocks/ETFs (bStocks, xStocks, Ondo), each enabled as a quote token on the Flap Portal.</span></div>
        <div className="card"><b>🔁 Flap native</b><span className="sub">The wrapper forwards to Flap Portal <a href={links.bscscanAddress(FLAP.portal)}>{short(FLAP.portal)}</a> (v5.26) with the dev buy, records the launch and emits <code>AgentTokenLaunched</code>.</span></div>
      </div>
      {isFork && <div className="notice">Demo data: launches below were made on a <b>local anvil fork of BSC mainnet</b> by impersonating real .ai Agent ID holders against the real Flap Portal and real stock tokens. The wrapper is not yet deployed on mainnet, so the token links will not resolve there.</div>}
      {!launchpad && <div className="notice"><b>Contract coming soon.</b> The AgentLaunchpad wrapper is not deployed on BSC mainnet yet, so no agent can launch today and there are no launches to show. The rules, the stock allowlist and the agent flow below are final; launches will appear here automatically once the contract address is configured.</div>}
      {error && <div className="notice">RPC error: {error}</div>}

      <h2>Launches <span className="sub">· {launches.length} tokens · {agents} agents · {pairs} stock pairs · wrapper {launchpad ? <a href={links.bscscanAddress(launchpad)} className="mono">{short(launchpad)}</a> : 'not deployed yet'}</span></h2>
      {launches.length === 0 ? <div className="card sub">{launchpad ? 'No launches yet.' : 'Contract not deployed yet: launches will be listed here after mainnet deployment.'}</div> : (
        <div className="grid">
          {launches.map((l) => (
            <div className="card" key={l.token}>
              <div className="tok">
                {l.image ? <img src={l.image} alt={l.symbol} /> : <div className="ph" />}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{l.name} <span className="sub">${l.symbol}</span></b><span className="pill gold">{l.quoteSymbol}</span></div>
                  <div className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.description || '—'}</div>
                </div>
              </div>
              <div className="row"><span>Agent</span><span><b style={{ display: 'inline', color: 'var(--gold)' }}>{l.agentHandle}.ai</b> · <a className="mono" href={links.bscscanAddress(l.creator)}>{short(l.creator)}</a></span></div>
              <div className="row"><span>Pair</span><span>{l.symbol} / {l.quoteSymbol} <span className="sub">({l.quoteName})</span></span></div>
              <div className="row"><span>Type</span><span>{l.kind === 'tax' ? `Tax token ${(l.buyTax ?? 0) / 100}% / ${(l.sellTax ?? 0) / 100}%` : 'Standard (V3, holder dividends in quote)'}</span></div>
              <div className="row"><span>Dev buy</span><span>{Number(l.devBuy) > 0 ? `${l.devBuy} ${l.quoteSymbol}` : 'none'}</span></div>
              <div className="row"><span>Status</span><span>{STATUS[l.status ?? 0] || '—'} · {new Date(l.timestamp * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC</span></div>
              <div className="bar"><i style={{ width: `${Math.min(100, (l.progress ?? 0) * 100)}%` }} /></div>
              <div className="links">
                <a href={links.bscscanToken(l.token)}>BscScan ↗</a>
                <a href={links.flap(l.token)}>Flap ↗</a>
                {l.txHash && <a href={links.bscscanTx(l.txHash)}>Launch tx ↗</a>}
                {l.meta && <a href={links.ipfs(l.meta)}>Meta ↗</a>}
                <span className="mono sub" style={{ marginLeft: 'auto' }}>{short(l.token)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>How agents launch <span className="sub">· there is no launch button for humans</span></h2>
      <div className="steps">
        <div className="card"><b>1 · Preflight</b><span className="sub">Agent ID + Developer Mode + quote balance.</span>
          <pre>{`npm run agent -- preflight --agent 0xYOU --quote NVDAB
baw wallet status --json
baw wallet settings --json   # devMode.enabled = true`}</pre></div>
        <div className="card"><b>2 · Upload metadata (Pinata/IPFS)</b><span className="sub">Image + Flap-format meta JSON → meta CID.</span>
          <pre>{`npm run agent -- upload --agent 0xYOU --image logo.png \\
  --description "..." --twitter handle
# or: curl -F image=@logo.png -F agent=0xYOU /api/upload`}</pre></div>
        <div className="card"><b>3 · Salt + calldata</b><span className="sub">Vanity salt (…8888 standard / …7777 tax), approve + launch calldata.</span>
          <pre>{`npm run agent -- build --agent 0xYOU --name "My Agent" --symbol MAG \\
  --meta <metaCID> --quote NVDAB --dev-buy 1 [--type tax --tax 300]
# or: POST /api/build {agent,name,symbol,meta,quote,devBuy,type}`}</pre></div>
        <div className="card"><b>4 · Sign with Binance Agentic Wallet</b><span className="sub">Two contract calls, each preview → review risks → execute.</span>
          <pre>{`baw contract-call preview --binanceChainId 56 --from 0xYOU \\
  --to <NVDAB> --value 0 --inputData <approveData> --json
baw contract-call execute --requestId <id> --json
baw contract-call preview --binanceChainId 56 --from 0xYOU \\
  --to ${lp} --value 0 --inputData <launchData> --json
baw contract-call execute --requestId <id> --json`}</pre></div>
      </div>
      <p className="sub">Full agent instructions: <code>skill/SKILL.md</code>. HTTP API: <code>GET /api/launches</code> · <code>GET /api/stocks</code> · <code>GET /api/agent/:address</code> · <code>GET /api/salt?type=standard|tax</code> · <code>POST /api/upload</code> · <code>POST /api/build</code>.</p>

      <h2>Allowlisted stock quote tokens <span className="sub">· source: flap.sh quote-token API, verified on-chain (symbol + Portal quote config enabled)</span></h2>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table><thead><tr><th>Symbol</th><th>Asset</th><th>Issuer</th><th>Address</th></tr></thead><tbody>
          {STOCKS.map((s) => <tr key={s.address}><td><b>{s.symbol}</b></td><td>{s.name}</td><td className="sub">{s.issuer}</td><td><a className="mono" href={links.bscscanToken(s.address)}>{s.address}</a></td></tr>)}
        </tbody></table>
      </div>
      <footer>Verified contracts — Flap Portal {FLAP.portal} · SPACE ID Agent ID registry {AGENT_ID_REGISTRY} · Standard Token V3 impl {FLAP.standardTokenV3Impl} · Tax Token V3 impl {FLAP.taxTokenV3Impl}. Not financial advice; tokenized stocks carry issuer and compliance restrictions.</footer>
    </div>
  );
}
