import { fetchMarket } from '@/lib/market';
import { fetchCOT } from '@/lib/cot';
import { fetchFed } from '@/lib/fed';
import { generateBrief } from '@/lib/brief';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const [marketRes, cotRes, fedRes] = await Promise.allSettled([
    fetchMarket(),
    fetchCOT(),
    fetchFed(),
  ]);

  const market = marketRes.status === 'fulfilled' ? marketRes.value : null;
  const cot    = cotRes.status    === 'fulfilled' ? cotRes.value    : null;
  const fed    = fedRes.status    === 'fulfilled' ? fedRes.value    : null;

  const errors = [
    marketRes.status === 'rejected' ? `market: ${marketRes.reason?.message}` : null,
    cotRes.status    === 'rejected' ? `cot: ${cotRes.reason?.message}`       : null,
    fedRes.status    === 'rejected' ? `fed: ${fedRes.reason?.message}`       : null,
  ].filter(Boolean);

  const brief = generateBrief(market, cot, fed);

  return Response.json({
    ts: new Date().toISOString(),
    market,
    cot,
    fed,
    brief,
    errors,
  });
}
