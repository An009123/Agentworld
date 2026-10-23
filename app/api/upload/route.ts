import { isAddress, type Address } from 'viem';
import { uploadTokenMeta } from '@/lib/pinata';
import { agentStatus } from '@/lib/chain';
export const dynamic = 'force-dynamic';
// multipart: image (<=2MB), agent, description?, website?, twitter?, telegram?  -> { imageCid, metaCid }
// Only wallets holding a .ai Agent ID may pin (protects the Pinata quota). Optional AGENT_API_KEY header gate.
export async function POST(req: Request) {
  try {
    if (process.env.AGENT_API_KEY && req.headers.get('x-api-key') !== process.env.AGENT_API_KEY) return Response.json({ error: 'unauthorized' }, { status: 401 });
    const fd = await req.formData();
    const file = fd.get('image'); const agent = String(fd.get('agent') || '');
    if (!(file instanceof File)) throw new Error('image file required');
    if (file.size > 2 * 1024 * 1024) throw new Error('image too large (max 2MB)');
    if (!/^image\//.test(file.type)) throw new Error('image/* required');
    if (!isAddress(agent)) throw new Error('agent address required');
    if (!(await agentStatus(agent as Address)).hasAgentId) return Response.json({ error: 'agent holds no .ai Agent ID' }, { status: 403 });
    const s = (k: string) => (fd.get(k) ? String(fd.get(k)).slice(0, 500) : undefined);
    const r = await uploadTokenMeta({ image: new Uint8Array(await file.arrayBuffer()), imageName: file.name || 'image', imageType: file.type, creator: agent, description: s('description'), website: s('website'), twitter: s('twitter'), telegram: s('telegram') });
    return Response.json(r);
  } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
}
