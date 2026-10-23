import { findSaltFast } from '@/lib/saltFast';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const type = (new URL(req.url).searchParams.get('type') || 'standard') as 'standard' | 'tax';
  try { return Response.json(await findSaltFast({ type, threads: 1 })); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
}
