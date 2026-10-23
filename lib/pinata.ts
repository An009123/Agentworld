// Pinata (IPFS) upload of the token image + Flap-format metadata JSON. Secrets come from env only and are never logged.
import { loadEnv } from './env';

const headers = (): Record<string, string> => {
  loadEnv();
  if (process.env.PINATA_JWT) return { Authorization: `Bearer ${process.env.PINATA_JWT}` };
  if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY)
    return { pinata_api_key: process.env.PINATA_API_KEY, pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY };
  throw new Error('Pinata credentials missing: set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_API_KEY');
};
const scrub = (s: string) => s.replace(/(eyJ[\w-]+\.[\w-]+\.[\w-]+)|([a-f0-9]{20,})/gi, '***').slice(0, 300);

export async function pinFile(data: Uint8Array, filename: string, contentType: string): Promise<string> {
  const h = headers();
  const mk = () => { const fd = new FormData(); fd.append('file', new Blob([new Uint8Array(data)], { type: contentType }), filename); return fd; };
  const v3 = mk(); v3.append('network', 'public'); v3.append('name', filename);
  let r = await fetch('https://uploads.pinata.cloud/v3/files', { method: 'POST', headers: h, body: v3 });
  if (r.ok) return (await r.json()).data.cid as string;
  const e1 = scrub(await r.text());
  r = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', { method: 'POST', headers: h, body: mk() });
  if (!r.ok) throw new Error(`Pinata upload failed (v3: ${e1}; legacy: ${scrub(await r.text())})`);
  return (await r.json()).IpfsHash as string;
}

export type FlapMeta = { buy: null; creator: string; description: string; image: string; sell: null; telegram: string | null; twitter: string | null; website: string | null };

/** Uploads image, then metadata JSON in the exact shape Flap's indexer reads (image = CID). Returns the meta CID for LaunchParams.meta. */
export async function uploadTokenMeta(o: { image: Uint8Array; imageName: string; imageType: string; creator: string; description?: string; website?: string; twitter?: string; telegram?: string }) {
  const imageCid = await pinFile(o.image, o.imageName, o.imageType);
  const meta: FlapMeta = {
    buy: null, creator: o.creator, description: o.description || '', image: imageCid, sell: null,
    telegram: o.telegram || null, twitter: o.twitter ? o.twitter.replace(/^@/, '') : null, website: o.website || null,
  };
  const metaCid = await pinFile(new TextEncoder().encode(JSON.stringify(meta)), 'meta.json', 'application/json');
  return { imageCid, metaCid, meta };
}

/** Optional: ask Flap to also pin the CIDs so they load on flap.mypinata.cloud (public, keyless Flap API). */
export async function requestFlapPin(cid: string, name: string) {
  const r = await fetch('https://funcs.flap.sh/api/v1/ipfs/pins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, name }) });
  return { status: r.status, body: (await r.text()).slice(0, 300) };
}

export const gatewayUrl = (cid: string) => `${(process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud').replace(/\/$/, '')}/ipfs/${cid}`;
