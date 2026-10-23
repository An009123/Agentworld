import { loadLaunches } from '@/lib/launches';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const limit = Math.min(200, Number(new URL(req.url).searchParams.get('limit') || 50));
  return Response.json(await loadLaunches(limit));
}
