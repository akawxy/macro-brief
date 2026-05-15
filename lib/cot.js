// CFTC public Socrata API — no key required
// Legacy Futures-Only COT dataset
const CFTC_URL = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json';

// E-Mini NASDAQ-100 contract as listed in CFTC database
const NQ_QUERY = `$where=market_and_exchange_names like '%NASDAQ-100%'&$order=report_date_as_yyyy_mm_dd DESC&$limit=56`;

function calcPercentile(current, series) {
  if (!series.length) return 50;
  const below = series.filter((v) => v <= current).length;
  return Math.round((below / series.length) * 100);
}

export async function fetchCOT() {
  const url = `${CFTC_URL}?${NQ_QUERY}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`CFTC ${res.status}`);
  const rows = await res.json();
  if (!rows.length) throw new Error('no CFTC data');

  // Parse each row
  const parsed = rows.map((r) => ({
    date:      r.report_date_as_yyyy_mm_dd?.slice(0, 10) ?? '—',
    long:      parseInt(r.noncomm_positions_long_all  ?? 0, 10),
    short:     parseInt(r.noncomm_positions_short_all ?? 0, 10),
    longChg:   parseInt(r.change_in_noncomm_long_all  ?? 0, 10),
    shortChg:  parseInt(r.change_in_noncomm_short_all ?? 0, 10),
    oi:        parseInt(r.open_interest_all           ?? 0, 10),
  })).map((r) => ({ ...r, net: r.long - r.short, netChg: r.longChg - r.shortChg }));

  const latest   = parsed[0];
  const prev     = parsed[1] ?? parsed[0];
  const netSeries = parsed.map((r) => r.net);

  return {
    date:          latest.date,
    long:          latest.long,
    short:         latest.short,
    net:           latest.net,
    longChg:       latest.longChg,
    shortChg:      latest.shortChg,
    netChg:        latest.netChg,
    oi:            latest.oi,
    percentile:    calcPercentile(latest.net, netSeries),
    direction:     latest.net > 0 ? 'LONG' : 'SHORT',
    prevNet:       prev.net,
  };
}
