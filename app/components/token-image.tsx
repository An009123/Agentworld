'use client';

import { useState } from 'react';

export function TokenImage({ src, symbol }: { src?: string; symbol: string }) {
  const [failed, setFailed] = useState(false);
  const letters = (symbol || '?').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || '?';
  if (!src || failed) return <div className="ph" aria-hidden="true">{letters}</div>;
  return <img src={src} alt="" onError={() => setFailed(true)} />;
}
