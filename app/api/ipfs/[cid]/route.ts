import { gatewayUrl } from '@/lib/pinata';
import { loadEnv } from '@/lib/env';
export async function GET(_: Request, { params }: { params: { cid: string } }) {
  if (!/^[a-zA-Z0-9]{46,100}$/.test(params.cid)) return new Response('bad cid', { status: 400 });
  loadEnv();
  for (const u of [gatewayUrl(params.cid), `https://flap.mypinata.cloud/ipfs/${params.cid}`]) {
    const r = await fetch(u).catch(() => null);
    if (r?.ok) return new Response(r.body, { headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'public, max-age=86400, immutable' } });
  }
  return new Response('not found', { status: 404 });
}
