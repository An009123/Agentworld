'use client';

import { useEffect, type ReactNode } from 'react';

/** Opens a collapsed section when the nav links to it. */
export function HashFold() {
  useEffect(() => {
    const openFromHash = (hash = window.location.hash) => {
      const id = hash.replace(/^#/, '');
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      const href = link?.getAttribute('href');
      if (href) openFromHash(href);
    };
    const onHash = () => openFromHash();
    openFromHash();
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick);
    };
  }, []);
  return null;
}

export function Fold({ id, title, aside, children }: { id: string; title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <details id={id} className="fold">
      <summary>
        <span className="fold-title">{title}</span>
        <span className="fold-end">{aside}</span>
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
