export function shortAddr(address: string) {
  if (!address) return '';
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function fmtTime(ts: number) {
  if (!ts) return '—';
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
