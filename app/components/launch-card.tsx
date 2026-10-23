import type { LaunchView } from '@/lib/launches';
import { links } from '@/lib/config';
import { Ext } from './ext';
import { fmtTime, shortAddr } from './format';
import { StockBadge } from './stock-badge';
import { TokenImage } from './token-image';

const STATUS: Record<number, { en: string; zh: string; tone: string }> = {
  1: { en: 'bonding curve', zh: '曲线中', tone: 'gold' },
  2: { en: 'dex pending', zh: '待上 DEX', tone: '' },
  3: { en: 'migrating', zh: '迁移中', tone: 'gold' },
  4: { en: 'on DEX', zh: '已上 DEX', tone: 'green' },
};

export function LaunchCard({ launch, sample = false }: { launch: LaunchView; sample?: boolean }) {
  const status = STATUS[launch.status ?? 0];
  const hasProgress = typeof launch.progress === 'number' && !Number.isNaN(launch.progress);
  const pct = hasProgress ? Math.max(0, Math.min(100, Math.round(launch.progress! * 100))) : 0;
  const typeLabel = launch.kind === 'tax'
    ? `Tax token ${(launch.buyTax ?? 0) / 100}% / ${(launch.sellTax ?? 0) / 100}%`
    : 'Standard (V3, holder dividends in quote)';
  const devBuy = Number(launch.devBuy) > 0 ? `${launch.devBuy} ${launch.quoteSymbol}` : 'none';
  const statusText = status ? `${status.en} · ${status.zh}` : '—';

  return (
    <article className="card launch">
      <div className="tok">
        <TokenImage src={launch.image} symbol={launch.symbol} />
        <div className="tok-copy">
          <div className="name-row">
            <h3 className="tok-title">{launch.name} <span className="sym">${launch.symbol}</span></h3>
            <span className="pair-pill">
              <StockBadge symbol={launch.quoteSymbol} size={20} />
              {launch.quoteSymbol}
            </span>
          </div>
          <p className="desc">{launch.description || '—'}</p>
        </div>
      </div>

      <div className="progress" aria-hidden={!hasProgress}>
        <div className="track"><span className="fill" style={{ width: `${pct}%` }} /></div>
        <span className="pct">{hasProgress ? `${pct}%` : '—'}</span>
      </div>

      <dl className="meta">
        <div>
          <dt>Agent <span lang="zh-CN">发射者</span></dt>
          <dd>
            <b className="handle">{launch.agentHandle}.ai</b>
            {' · '}
            {sample ? <span className="mono">{shortAddr(launch.creator)}</span> : <Ext className="mono" href={links.bscscanAddress(launch.creator)}>{shortAddr(launch.creator)}</Ext>}
          </dd>
        </div>
        <div>
          <dt>Pair <span lang="zh-CN">交易对</span></dt>
          <dd>
            <span className="pair-inline"><StockBadge symbol={launch.quoteSymbol} size={16} />{launch.symbol} / {launch.quoteSymbol}</span>
            {launch.quoteName ? <span className="muted"> ({launch.quoteName})</span> : null}
          </dd>
        </div>
        <div>
          <dt>Type <span lang="zh-CN">类型</span></dt>
          <dd>{typeLabel}</dd>
        </div>
        <div>
          <dt>Dev buy <span lang="zh-CN">开发买入</span></dt>
          <dd>{devBuy}</dd>
        </div>
        <div>
          <dt>Status <span lang="zh-CN">状态</span></dt>
          <dd className={status?.tone === 'green' ? 'ok' : status?.tone === 'gold' ? 'hot' : undefined}>
            {statusText}
            <span className="when">{fmtTime(launch.timestamp)}</span>
          </dd>
        </div>
      </dl>

      <div className="links">
        {sample ? (
          <>
            <span className="link-btn is-disabled">BscScan ↗</span>
            <span className="link-btn is-disabled">Flap ↗</span>
          </>
        ) : (
          <>
            <Ext className="link-btn" href={links.bscscanToken(launch.token)}>BscScan ↗</Ext>
            <Ext className="link-btn" href={links.flap(launch.token)}>Flap ↗</Ext>
            {launch.txHash ? <Ext className="link-btn" href={links.bscscanTx(launch.txHash)}>Launch tx ↗</Ext> : null}
            {launch.meta ? <Ext className="link-btn" href={links.ipfs(launch.meta)}>Meta ↗</Ext> : null}
          </>
        )}
        <span className="mono addr">{shortAddr(launch.token)}</span>
      </div>
    </article>
  );
}
