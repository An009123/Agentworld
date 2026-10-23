'use client';

import { useMemo, useState } from 'react';
import { StockBadge } from './stock-badge';

export type StockRow = { symbol: string; name: string; issuer: string; address: string; href: string };

export function StockBoard({ stocks }: { stocks: StockRow[] }) {
  const [query, setQuery] = useState('');
  const [issuer, setIssuer] = useState('all');
  const issuers = useMemo(() => Array.from(new Set(stocks.map((s) => s.issuer))), [stocks]);
  const needle = query.trim().toLowerCase();
  const rows = stocks.filter((s) => {
    if (issuer !== 'all' && s.issuer !== issuer) return false;
    if (!needle) return true;
    return [s.symbol, s.name, s.address, s.issuer].some((value) => value.toLowerCase().includes(needle));
  });

  return (
    <div>
      <div className="toolbar">
        <label className="search-wrap">
          <span className="search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.2 10.2L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <input
            className="search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search quote tokens"
          />
        </label>
        <div className="chips" role="group" aria-label="Filter by issuer">
          <button type="button" className={issuer === 'all' ? 'chip on' : 'chip'} aria-pressed={issuer === 'all'} onClick={() => setIssuer('all')}>
            All
          </button>
          {issuers.map((name) => (
            <button key={name} type="button" className={issuer === name ? 'chip on' : 'chip'} aria-pressed={issuer === name} onClick={() => setIssuer(name)}>
              {name}
            </button>
          ))}
        </div>
        <p className="count">{rows.length} / {stocks.length}</p>
      </div>

      {rows.length === 0 ? (
        <p className="empty">No matches.</p>
      ) : (
        <div className="table-wrap">
          <table className="stock-table">
            <caption className="sr">Allowlisted stock quote tokens</caption>
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                <th scope="col">Asset</th>
                <th scope="col">Issuer</th>
                <th scope="col">Address</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((stock) => (
                <tr key={stock.address}>
                  <td data-label="Symbol">
                    <span className="symcell">
                      <StockBadge symbol={stock.symbol} size={28} />
                      <b>{stock.symbol}</b>
                    </span>
                  </td>
                  <td data-label="Asset">{stock.name}</td>
                  <td data-label="Issuer" className="muted">{stock.issuer}</td>
                  <td data-label="Address">
                    <a className="mono addr-link" href={stock.href} target="_blank" rel="noopener noreferrer">
                      <span className="addr-full">{stock.address}</span>
                      <span className="addr-short">{`${stock.address.slice(0, 6)}…${stock.address.slice(-4)}`}</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
