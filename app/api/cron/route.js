export const maxDuration = 30;

export async function GET() {
  // Just trigger a data refresh — Vercel cron keeps the serverless fn warm
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    await fetch(`${base}/api/data`, { signal: AbortSignal.timeout(25000) });
  } catch {}

  return Response.json({ ok: true, ts: new Date().toISOString() });
}
