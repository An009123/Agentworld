import type { LaunchView } from '@/lib/launches';
import { links } from '@/lib/config';
import { Ext } from './ext';
import { fmtTime, shortAddr } from './format';
import { StockBadge } from './stock-badge';
import { TokenImage } from './token-image';

const STATUS: Record<number, { en: string; tone: string }> = {
  1: { en: 'bonding curve', tone: 'gold' },
  2: { en: 'dex pending', tone: '' },
  3: { en: 'migrating', tone: 'gold' },
  4: { en: 'on DEX', tone: 'green' },
};

export function LaunchCard({ launch, sample = false }: { launch: LaunchView; sample?: boolean }) {
  const status = STATUS[launch.status ?? 0];
  const hasProgress = typeof launch.progress === 'number' && !Number.isNaN(launch.progress);
  const pct = hasProgress ? Math.max(0, Math.min(100, Math.round(launch.progress! * 100))) : 0;
  const typeLabel = launch.kind === 'tax'
    ? `Tax ${(launch.buyTax ?? 0) / 100}% / ${(launch.sellTax ?? 0) / 100}%`
    : 'Standard';
  const devBuy = Number(launch.devBuy) > 0 ? `${launch.devBuy} ${launch.quoteSymbol}` : 'none';

  return (
    <article className="card launch">
      <div className="tok">
        <TokenImage src={launch.image} symbol={launch.symbol} />
        <div className="tok-copy">
          <div className="name-row">
            <h3 className="tok-title">{launch.name} <span className="sym">${launch.symbol}</span></h3>
            <span className="pair-pill">
              <StockBadge symbol={launch.quoteSymbol} size={18} />
              {launch.quoteSymbol}
            </span>
          </div>
          {launch.description ? <p className="desc">{launch.description}</p> : null}
        </div>
      </div>

      <div className="progress">
        <div className="track"><span className="fill" style={{ width: `${pct}%` }} /></div>
        <span className="pct">{hasProgress ? `${pct}%` : '—'}</span>
      </div>

      <dl className="meta">
        <div>
          <dt>Agent</dt>
          <dd>
            <b className="handle">{launch.agentHandle}.ai</b>
            {' · '}
            {sample ? <span className="mono">{shortAddr(launch.creator)}</span> : <Ext className="mono" href={links.bscscanAddress(launch.creator)}>{shortAddr(launch.creator)}</Ext>}
          </dd>
        </div>
        <div>
          <dt>Pair</dt>
          <dd>{launch.symbol} / {launch.quoteSymbol}{launch.quoteName ? <span className="muted"> · {launch.quoteName}</span> : null}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{typeLabel}</dd>
        </div>
        <div>
          <dt>Dev buy</dt>
          <dd>{devBuy}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className={status?.tone === 'green' ? 'ok' : status?.tone === 'gold' ? 'hot' : undefined}>
            {status?.en || '—'}
            <span className="when">{fmtTime(launch.timestamp)}</span>
          </dd>
        </div>
      </dl>

      <div className="links">
        {sample ? (
          <span className="is-disabled">BscScan · Flap</span>
        ) : (
          <>
            <Ext href={links.bscscanToken(launch.token)}>BscScan</Ext>
            <Ext href={links.flap(launch.token)}>Flap</Ext>
            {launch.txHash ? <Ext href={links.bscscanTx(launch.txHash)}>Tx</Ext> : null}
            {launch.meta ? <Ext href={links.ipfs(launch.meta)}>Meta</Ext> : null}
          </>
        )}
        <span className="mono addr">{shortAddr(launch.token)}</span>
      </div>
    </article>
  );
}
