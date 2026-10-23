import { STOCKS, STOCK_SOURCE } from '@/lib/config';
export async function GET() { return Response.json({ source: STOCK_SOURCE, count: STOCKS.length, stocks: STOCKS }); }
