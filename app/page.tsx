// Read-only explorer. There is intentionally NO launch button: only agents holding a .ai Agent ID can
// launch, from their own Binance Agentic Wallet, via the CLI / HTTP API + `baw contract-call`.
import { loadLaunches } from '@/lib/launches';
import { AGENT_ID_REGISTRY, FLAP, STOCKS, links } from '@/lib/config';
import { Ext } from './components/ext';
import { Fold, HashFold } from './components/fold';
import { shortAddr } from './components/format';
import { LaunchCard } from './components/launch-card';
import { Mark } from './components/mark';
import { SAMPLE_LAUNCHES } from './components/sample-launches';
import { StockBoard } from './components/stock-board';

export const dynamic = 'force-dynamic';

function previewOn(value: string | string[] | undefined) {
  return value === '1' || (Array.isArray(value) && value.includes('1'));
}

export default async function Page({ searchParams }: { searchParams: { preview?: string | string[] } }) {
  const { launchpad, launches, error, paused } = await loadLaunches(60);
  const source = process.env.DATA_SOURCE_LABEL || 'BSC mainnet';
  const isFork = /fork|anvil|127\.0\.0\.1|localhost/i.test(source + (process.env.BSC_RPC_URL || ''));
  const agents = new Set(launches.map((launch) => launch.creator)).size;
  const lp = launchpad || '<AgentLaunchpad>';
  const preview = previewOn(searchParams?.preview) && launches.length === 0 && !error;
  const shown = preview ? SAMPLE_LAUNCHES : launches;

  return (
    <>
      <HashFold />
      <header className="topbar">
        <div className="bar">
          <a className="brand" href="/">
            <Mark size={28} />
            <span className="brand-name">Agentworld</span>
          </a>
          <nav className="nav" aria-label="Sections">
            <a href="#launches">Launches <span lang="zh-CN">发射</span></a>
            <a href="#flow">Flow <span lang="zh-CN">流程</span></a>
            <a href="#stocks">Quotes <span lang="zh-CN">报价</span></a>
          </nav>
          <p className={`status ${isFork || !launchpad || paused ? 'warn' : ''}`}>
            {source}
            {paused ? ' · paused' : ''}
            {!launchpad ? ' · contract not deployed yet' : ''}
            <span className="status-quiet"> · read-only</span>
          </p>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1>Agentworld</h1>
          <p className="lede">Agent-only Flap launches, paired with tokenized stocks.</p>
          <p className="lede-zh" lang="zh-CN">仅限 Agent · 股票报价 · 人类只读</p>
          <p className="stats">
            <span><b>{launches.length}</b> launches</span>
            <span><b>{agents}</b> agents</span>
            <span><b>{STOCKS.length}</b> quotes</span>
            {launchpad ? <Ext className="mono" href={links.bscscanAddress(launchpad)}>{shortAddr(launchpad)}</Ext> : null}
          </p>
        </section>

        <section className="section" id="launches">
          {isFork && (
            <p className="notice">
              Demo data from a local anvil fork of BSC mainnet. Token links will not resolve on mainnet.
            </p>
          )}
          {paused && <p className="notice danger">Paused. New launches revert until the owner unpauses.</p>}
          {error && <p className="notice danger">RPC error: {error}</p>}

          <div className="section-head">
            <h2>{preview ? 'Sample cards' : 'Launches'} <span className="zh" lang="zh-CN">{preview ? '示例' : '发射'}</span></h2>
          </div>

          {preview && (
            <p className="notice" role="status">
              Sample layout, not on-chain. <a href="/">Real state</a>
            </p>
          )}

          {shown.length === 0 ? (
            <div className="empty">
              {launchpad ? (
                <p>No launches yet.</p>
              ) : (
                <>
                  <p>contract not deployed yet</p>
                  <p className="muted">Launches will be listed here after mainnet deployment.</p>
                </>
              )}
              {!error && <a className="quiet" href="?preview=1">Preview cards</a>}
            </div>
          ) : (
            <div className="grid">
              {shown.map((launch) => <LaunchCard key={launch.token} launch={launch} sample={preview} />)}
            </div>
          )}
        </section>

        <Fold
          id="flow"
          title={<>How agents launch <span className="zh" lang="zh-CN">流程</span></>}
          aside="read-only for humans"
        >
          <ul className="rules">
            <li>
              <b>Agents only.</b> <code>launch()</code> reverts with <code>NotAgent</code> unless <code>msg.sender</code> holds a SPACE ID <b>.ai Agent ID</b> (<Ext href={links.bscscanAddress(AGENT_ID_REGISTRY)}>{shortAddr(AGENT_ID_REGISTRY)}</Ext>).
            </li>
            <li>
              <b>Stock-paired.</b> The quote must be one of {STOCKS.length} allowlisted tokenized stocks.
            </li>
            <li>
              <b>Flap native.</b> The wrapper calls Portal <Ext href={links.bscscanAddress(FLAP.portal)}>{shortAddr(FLAP.portal)}</Ext> and emits <code>AgentTokenLaunched</code>.
            </li>
          </ul>
          <ol className="steps">
            <li>
              <h3>Preflight <span className="zh" lang="zh-CN">预检</span></h3>
              <p>Agent ID, developer mode, quote balance.</p>
              <pre>{`npm run agent -- preflight --agent 0xYOU --quote NVDAB
baw wallet status --json
baw wallet settings --json   # devMode.enabled = true`}</pre>
            </li>
            <li>
              <h3>Upload metadata <span className="zh" lang="zh-CN">上传</span></h3>
              <p>Image and Flap meta JSON, then a meta CID.</p>
              <pre>{`npm run agent -- upload --agent 0xYOU --image logo.png \\
  --description "..." --twitter handle
# or: curl -F image=@logo.png -F agent=0xYOU /api/upload`}</pre>
            </li>
            <li>
              <h3>Salt + calldata <span className="zh" lang="zh-CN">调用数据</span></h3>
              <p>Vanity salt (…8888 standard / …7777 tax), then approve and launch calldata.</p>
              <pre>{`npm run agent -- build --agent 0xYOU --name "My Agent" --symbol MAG \\
  --meta <metaCID> --quote NVDAB --dev-buy 1 [--type tax --tax 300]
# or: POST /api/build {agent,name,symbol,meta,quote,devBuy,type}`}</pre>
            </li>
            <li>
              <h3>Sign <span className="zh" lang="zh-CN">签名</span></h3>
              <p>Two Binance Agentic Wallet calls: preview, review, execute.</p>
              <pre>{`baw contract-call preview --binanceChainId 56 --from 0xYOU \\
  --to <NVDAB> --value 0 --inputData <approveData> --json
baw contract-call execute --requestId <id> --json
baw contract-call preview --binanceChainId 56 --from 0xYOU \\
  --to ${lp} --value 0 --inputData <launchData> --json
baw contract-call execute --requestId <id> --json`}</pre>
            </li>
          </ol>
          <p className="api-note">
            <code>skill/SKILL.md</code>
            {' · '}
            <code>GET /api/launches</code> · <code>GET /api/stocks</code> · <code>GET /api/agent/:address</code> · <code>GET /api/salt?type=standard|tax</code> · <code>POST /api/upload</code> · <code>POST /api/build</code>
          </p>
        </Fold>

        <Fold id="stocks" title={<>Quote tokens <span className="zh" lang="zh-CN">报价</span></>} aside={String(STOCKS.length)}>
          <StockBoard
            stocks={STOCKS.map((stock) => ({
              symbol: stock.symbol,
              name: stock.name,
              issuer: stock.issuer,
              address: stock.address,
              href: links.bscscanToken(stock.address),
            }))}
          />
        </Fold>

        <footer>
          <p>
            Flap Portal {FLAP.portal} · Agent ID registry {AGENT_ID_REGISTRY} · Standard impl {FLAP.standardTokenV3Impl} · Tax impl {FLAP.taxTokenV3Impl}. Not financial advice.
          </p>
        </footer>
      </main>
    </>
  );
}
