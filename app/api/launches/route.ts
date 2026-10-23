import { loadLaunches } from '@/lib/launches';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const limit = Math.min(200, Number(new URL(req.url).searchParams.get('limit') || 50));
  const r = await loadLaunches(limit);
  if (!r.launchpad) return Response.json({ ...r, deployed: false, message: 'AgentLaunchpad is not deployed on BSC mainnet yet' });
  return Response.json({ ...r, deployed: true });
}
