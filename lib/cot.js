const CFTC_BASE = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json';

async function queryCFTC(searchTerm, limit = 56) {
  const url = new URL(CFTC_BASE);
  url.searchParams.set('$where', `market_and_exchange_names like '%${searchTerm}%'`);
  url.searchParams.set('$order', 'report_date_as_yyyy_mm_dd DESC');
  url.searchParams.set('$limit', String(limit));
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`CFTC ${res.status}`);
  return await res.json();
}

function parseRows(rows) {
  return rows.map((r) => {
    const long  = parseInt(r.noncomm_positions_long_all  ?? 0, 10);
    const short = parseInt(r.noncomm_positions_short_all ?? 0, 10);
    const oi    = parseInt(r.open_interest_all           ?? 0, 10);
    return {
      date:     r.report_date_as_yyyy_mm_dd?.slice(0, 10) ?? '—',
      long, short, oi,
      longChg:  parseInt(r.change_in_noncomm_long_all  ?? 0, 10),
      shortChg: parseInt(r.change_in_noncomm_short_all ?? 0, 10),
    };
  }).map((r) => ({ ...r, net: r.long - r.short, netChg: r.longChg - r.shortChg }));
}

function calcPercentile(current, series) {
  if (!series.length) return 50;
  const below = series.filter((v) => v <= current).length;
  return Math.round((below / series.length) * 100);
}

export async function fetchCOT() {
  let rows = await queryCFTC('NASDAQ-100', 56);
  if (!rows.length) rows = await queryCFTC('NASDAQ', 56);
  if (!rows.length) throw new Error('No CFTC data returned');

  const parsed = parseRows(rows);
  const latest = parsed[0];
  const prev   = parsed[1] ?? parsed[0];

  const history = parsed.slice(0, 8).reverse().map((r) => ({
    date: r.date, net: r.net, long: r.long, short: r.short,
  }));

  const specRatio = latest.oi > 0
    ? Math.round(((latest.long + latest.short) / latest.oi) * 100)
    : null;

  return {
    date:        latest.date,
    long:        latest.long,
    short:       latest.short,
    net:         latest.net,
    longChg:     latest.longChg,
    shortChg:    latest.shortChg,
    netChg:      latest.netChg,
    oi:          latest.oi,
    specRatio,
    percentile:  calcPercentile(latest.net, parsed.map((r) => r.net)),
    direction:   latest.net > 0 ? 'LONG' : 'SHORT',
    prevNet:     prev.net,
    history,
    weeksOfData: parsed.length,
  };
}
