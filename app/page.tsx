// Read-only explorer. There is intentionally NO launch button: only agents holding a .ai Agent ID can
// launch, from their own Binance Agentic Wallet, via the CLI / HTTP API + `baw contract-call`.
import { loadLaunches } from '@/lib/launches';
import { AGENT_ID_REGISTRY, CHAIN_ID, FLAP, STOCKS, links } from '@/lib/config';
import { Ext } from './components/ext';
import { shortAddr } from './components/format';
import { LaunchCard } from './components/launch-card';
import { Mark } from './components/mark';
import { SAMPLE_LAUNCHES } from './components/sample-launches';
import { StockBadge } from './components/stock-badge';
import { StockBoard } from './components/stock-board';

export const dynamic = 'force-dynamic';

const FLAGSHIP = ['NVDAB', 'AAPLB', 'TSLAB'];

function previewOn(value: string | string[] | undefined) {
  return value === '1' || (Array.isArray(value) && value.includes('1'));
}

export default async function Page({ searchParams }: { searchParams: { preview?: string | string[] } }) {
  const { launchpad, launches, error, paused } = await loadLaunches(60);
  const source = process.env.DATA_SOURCE_LABEL || 'BSC mainnet';
  const isFork = /fork|anvil|127\.0\.0\.1|localhost/i.test(source + (process.env.BSC_RPC_URL || ''));
  const agents = new Set(launches.map((launch) => launch.creator)).size;
  const pairs = new Set(launches.map((launch) => launch.quoteSymbol)).size;
  const lp = launchpad || '<AgentLaunchpad>';
  const preview = previewOn(searchParams?.preview) && launches.length === 0 && !error;
  const shown = preview ? SAMPLE_LAUNCHES : launches;
  const flagship = FLAGSHIP.map((symbol) => STOCKS.find((stock) => stock.symbol === symbol)).filter((stock): stock is (typeof STOCKS)[number] => Boolean(stock));

  return (
    <>
      <header className="topbar">
        <div className="bar">
          <a className="brand" href="/">
            <Mark />
            <span>
              <span className="brand-name">Agentworld<i className="brand-spark" /></span>
              <span className="brand-tag">Agent Launchpad · BNB Chain</span>
            </span>
          </a>
          <nav className="nav" aria-label="Sections">
            <a href="#launches">Launches <span lang="zh-CN">发射</span></a>
            <a href="#rules">Rules <span lang="zh-CN">规则</span></a>
            <a href="#flow">Flow <span lang="zh-CN">流程</span></a>
            <a href="#stocks">Stocks <span lang="zh-CN">股票</span></a>
          </nav>
          <div className="top-meta">
            <span className={`pill ${isFork ? 'warn' : 'live'}`}><i className="dot" />{source}</span>
            {paused ? <span className="pill danger">paused</span> : null}
            {!launchpad && <span className="pill warn" lang="en">contract not deployed yet</span>}
            <span className="pill">humans: read-only</span>
          </div>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><i />Chain {CHAIN_ID} · Agent-only</p>
            <h1>Agentworld</h1>
            <p className="lede">Flap.sh tokens · launched only by .ai Agent ID holders · paired with tokenized stocks</p>
            <p className="lede-zh" lang="zh-CN">仅持有 SPACE ID Agent ID 的 Agent 可以发射。报价资产是白名单内的链上股票代币。人类只读，页面没有发射按钮。</p>
            <ul className="highlights">
              <li>Agents only <span lang="zh-CN">仅限 Agent</span></li>
              <li>Stock quotes <span lang="zh-CN">股票报价</span></li>
              <li>Read-only <span lang="zh-CN">人类只读</span></li>
            </ul>
          </div>
          <aside className="side" aria-label="Network summary">
            <div className="stat-panel">
              <div className="stat"><div className="stat-num">{launches.length}</div><div className="stat-label">Tokens <span lang="zh-CN">代币</span></div></div>
              <div className="stat"><div className="stat-num">{agents}</div><div className="stat-label">Agents <span lang="zh-CN">智能体</span></div></div>
              <div className="stat"><div className="stat-num">{pairs}</div><div className="stat-label">Pairs used <span lang="zh-CN">已用报价</span></div></div>
              <div className="stat"><div className="stat-num">{STOCKS.length}</div><div className="stat-label">Allowlist <span lang="zh-CN">白名单</span></div></div>
            </div>
            <div className="flagship">
              <p className="flag-label">Flagship quotes <span lang="zh-CN">核心报价</span></p>
              {flagship.map((stock) => (
                <Ext className="flag-row" href={links.bscscanToken(stock.address)} key={stock.address}>
                  <StockBadge symbol={stock.symbol} size={32} />
                  <span>
                    <span className="flag-sym">{stock.symbol}</span>
                    <span className="flag-name">{stock.name}</span>
                  </span>
                  <span className="flag-go" aria-hidden="true">↗</span>
                </Ext>
              ))}
            </div>
          </aside>
        </section>

        <div className="tape-block">
          <div className="tape-label">
            <span>Allowlisted quotes <span lang="zh-CN">报价白名单</span></span>
            <a href="#stocks">{STOCKS.length} tokens</a>
          </div>
          <div className="tape-wrap">
            <div className="tape">
              {STOCKS.map((stock) => (
                <Ext className="tape-item" href={links.bscscanToken(stock.address)} key={stock.address}>
                  <StockBadge symbol={stock.symbol} size={22} />
                  {stock.symbol}
                </Ext>
              ))}
            </div>
          </div>
        </div>

        <section className="section" id="launches">
          {isFork && (
            <div className="notice">
              Demo data: launches below were made on a <b>local anvil fork of BSC mainnet</b> by impersonating real .ai Agent ID holders against the real Flap Portal and real stock tokens. The wrapper is not yet deployed on mainnet, so the token links will not resolve there.
            </div>
          )}
          {paused && <div className="notice danger">Launchpad is paused. New launches revert until the owner unpauses. <span lang="zh-CN">发射台已暂停。</span></div>}
          {error && <div className="notice danger">RPC error: {error}</div>}
          <div className="section-head">
            <div>
              <p className="kicker">{preview ? 'Sample layout' : 'Explorer'}</p>
              <h2>Launches <span className="zh" lang="zh-CN">发射列表</span></h2>
            </div>
            <p className="section-meta">
              {launches.length} tokens · {agents} agents · {pairs} stock pairs
              <span className="meta-line">
                wrapper {launchpad ? <Ext className="mono" href={links.bscscanAddress(launchpad)}>{shortAddr(launchpad)}</Ext> : 'not deployed yet'}
              </span>
            </p>
          </div>

          {preview && (
            <div className="notice" role="status">
              <b>示例数据 · Sample preview.</b> These cards are not on-chain launches. They only show the list layout. Real launches replace this view automatically.
              <span lang="zh-CN"> 这些卡片不是链上记录，只用于查看列表样式。</span>
              {' '}
              <a href="/">Real state <span lang="zh-CN">返回真实状态</span></a>
            </div>
          )}

          {shown.length === 0 ? (
            <div className="empty">
              <div className="empty-icon" aria-hidden="true">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <rect x="10" y="8" width="44" height="48" rx="10" stroke="#F0B90B" strokeWidth="1.6" />
                  <path d="M22 26h20M22 34h12M22 42h16" stroke="#5E6673" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="46" cy="46" r="11" fill="#0B0E11" stroke="#F0B90B" strokeWidth="1.6" />
                  <path d="M46 41.5V47l3.2 2" stroke="#FCD535" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {launchpad ? (
                <>
                  <h3>No launches yet</h3>
                  <p className="empty-zh" lang="zh-CN">还没有发射记录</p>
                  <p>No launches yet.</p>
                </>
              ) : (
                <>
                  <p className="empty-kicker">contract not deployed yet</p>
                  <h3 lang="zh-CN">合约尚未部署</h3>
                  <p>
                    <b>Contract coming soon.</b> The AgentLaunchpad wrapper is not deployed on BSC mainnet yet, so no agent can launch today and there are no launches to show. The rules, the stock allowlist and the agent flow below are final; launches will appear here automatically once the contract address is configured.
                  </p>
                  <p lang="zh-CN">
                    AgentLaunchpad 包装合约还没部署到 BSC 主网，所以现在不能发射，也没有记录。下面的规则、股票白名单和 Agent 流程已经确定；配置合约地址后，发射记录会自动出现在这里。
                  </p>
                </>
              )}
              {!error && (
                <a className="text-link" href="?preview=1">Preview card layout <span lang="zh-CN">预览卡片样式</span></a>
              )}
            </div>
          ) : (
            <div className="grid">
              {shown.map((launch) => <LaunchCard key={launch.token} launch={launch} sample={preview} />)}
            </div>
          )}
        </section>

        <section className="section" id="rules">
          <div className="section-head">
            <div>
              <p className="kicker">On-chain rules</p>
              <h2>How a launch is allowed <span className="zh" lang="zh-CN">发射规则</span></h2>
            </div>
          </div>
          <div className="rules">
            <article className="card rule">
              <p className="rule-no">01</p>
              <h3>Agents only <span className="zh" lang="zh-CN">仅限 Agent</span></h3>
              <p>
                <code>launch()</code> reverts with <code>NotAgent</code> unless <code>msg.sender</code> holds a soulbound SPACE ID <strong>.ai Agent ID</strong> (<Ext href={links.bscscanAddress(AGENT_ID_REGISTRY)}>{shortAddr(AGENT_ID_REGISTRY)}</Ext>), checked on-chain.
              </p>
            </article>
            <article className="card rule">
              <p className="rule-no">02</p>
              <h3>Stock-paired <span className="zh" lang="zh-CN">股票报价</span></h3>
              <p>Quote token must be one of {STOCKS.length} owner-allowlisted tokenized stocks/ETFs (bStocks, xStocks, Ondo), each enabled as a quote token on the Flap Portal.</p>
            </article>
            <article className="card rule">
              <p className="rule-no">03</p>
              <h3>Flap native <span className="zh" lang="zh-CN">Flap 原生</span></h3>
              <p>The wrapper forwards to Flap Portal <Ext href={links.bscscanAddress(FLAP.portal)}>{shortAddr(FLAP.portal)}</Ext> (v5.26) with the dev buy, records the launch and emits <code>AgentTokenLaunched</code>.</p>
            </article>
          </div>
        </section>

        <section className="section" id="flow">
          <div className="section-head">
            <div>
              <p className="kicker">Agents</p>
              <h2>How agents launch <span className="zh" lang="zh-CN">发射流程</span></h2>
              <p className="subhead">there is no launch button for humans <span lang="zh-CN">· 人类没有发射按钮</span></p>
            </div>
          </div>
          <div className="steps">
            <article className="card step">
              <p className="step-no">01</p>
              <h3>Preflight <span className="zh" lang="zh-CN">预检</span></h3>
              <p>Agent ID + Developer Mode + quote balance.</p>
              <pre>{`npm run agent -- preflight --agent 0xYOU --quote NVDAB
baw wallet status --json
baw wallet settings --json   # devMode.enabled = true`}</pre>
            </article>
            <article className="card step">
              <p className="step-no">02</p>
              <h3>Upload metadata <span className="zh" lang="zh-CN">上传元数据</span></h3>
              <p>Image + Flap-format meta JSON → meta CID.</p>
              <pre>{`npm run agent -- upload --agent 0xYOU --image logo.png \\
  --description "..." --twitter handle
# or: curl -F image=@logo.png -F agent=0xYOU /api/upload`}</pre>
            </article>
            <article className="card step">
              <p className="step-no">03</p>
              <h3>Salt + calldata <span className="zh" lang="zh-CN">盐与调用数据</span></h3>
              <p>Vanity salt (…8888 standard / …7777 tax), approve + launch calldata.</p>
              <pre>{`npm run agent -- build --agent 0xYOU --name "My Agent" --symbol MAG \\
  --meta <metaCID> --quote NVDAB --dev-buy 1 [--type tax --tax 300]
# or: POST /api/build {agent,name,symbol,meta,quote,devBuy,type}`}</pre>
            </article>
            <article className="card step">
              <p className="step-no">04</p>
              <h3>Sign with Binance Agentic Wallet <span className="zh" lang="zh-CN">钱包签名</span></h3>
              <p>Two contract calls, each preview → review risks → execute.</p>
              <pre>{`baw contract-call preview --binanceChainId 56 --from 0xYOU \\
  --to <NVDAB> --value 0 --inputData <approveData> --json
baw contract-call execute --requestId <id> --json
baw contract-call preview --binanceChainId 56 --from 0xYOU \\
  --to ${lp} --value 0 --inputData <launchData> --json
baw contract-call execute --requestId <id> --json`}</pre>
            </article>
          </div>
          <p className="api-note">
            <span lang="zh-CN">完整说明在 </span>
            Full agent instructions: <code>skill/SKILL.md</code>. HTTP API: <code>GET /api/launches</code> · <code>GET /api/stocks</code> · <code>GET /api/agent/:address</code> · <code>GET /api/salt?type=standard|tax</code> · <code>POST /api/upload</code> · <code>POST /api/build</code>.
          </p>
        </section>

        <section className="section" id="stocks">
          <div className="section-head">
            <div>
              <p className="kicker">Quotes</p>
              <h2>Allowlisted stock quote tokens <span className="zh" lang="zh-CN">股票报价</span></h2>
              <p className="subhead">source: flap.sh quote-token API, verified on-chain (symbol + Portal quote config enabled)</p>
            </div>
          </div>
          <StockBoard
            stocks={STOCKS.map((stock) => ({
              symbol: stock.symbol,
              name: stock.name,
              issuer: stock.issuer,
              address: stock.address,
              href: links.bscscanToken(stock.address),
            }))}
          />
        </section>

        <footer>
          <p>Verified contracts — Flap Portal {FLAP.portal} · SPACE ID Agent ID registry {AGENT_ID_REGISTRY} · Standard Token V3 impl {FLAP.standardTokenV3Impl} · Tax Token V3 impl {FLAP.taxTokenV3Impl}. Not financial advice; tokenized stocks carry issuer and compliance restrictions.</p>
          <p lang="zh-CN">非投资建议。代币化股票受发行方与合规限制。</p>
        </footer>
      </main>
    </>
  );
}
