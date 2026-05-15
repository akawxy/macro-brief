// FRED CSV endpoints — public, no API key required
const FRED = {
  totalAssets:  'https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL',   // millions USD
  reserves:     'https://fred.stlouisfed.org/graph/fredgraph.csv?id=WRESBAL', // millions USD
  treasuries:   'https://fred.stlouisfed.org/graph/fredgraph.csv?id=TREAST',  // millions USD
  mbs:          'https://fred.stlouisfed.org/graph/fredgraph.csv?id=WMBSEC',  // millions USD
};

function parseCSV(text) {
  const lines = text.trim().split('\n').slice(1); // skip header
  return lines
    .map((l) => {
      const [date, val] = l.split(',');
      return { date: date?.trim(), value: parseFloat(val) };
    })
    .filter((r) => r.date && !isNaN(r.value))
    .reverse(); // newest first
}

async function fetchSeries(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`FRED ${res.status}`);
  return parseCSV(await res.text());
}

function toBillions(millions) {
  return Math.round(millions / 1000);
}

export async function fetchFed() {
  const [assets, reserves, treasuries, mbs] = await Promise.all([
    fetchSeries(FRED.totalAssets),
    fetchSeries(FRED.reserves),
    fetchSeries(FRED.treasuries),
    fetchSeries(FRED.mbs),
  ]);

  const latest     = assets[0];
  const prev       = assets[1];
  const weekChange = prev ? Math.round((latest.value - prev.value) / 1000) : 0; // billions

  // QT status: Fed has been running QT since Jun 2022
  // Simple heuristic: if 4-week trend is consistently negative → QT ongoing
  const fourWeekChange = assets[4] ? Math.round((latest.value - assets[4].value) / 1000) : 0;
  let qtStatus = 'QT ONGOING';
  if (fourWeekChange > 50) qtStatus = 'EXPANDING';
  else if (Math.abs(fourWeekChange) < 20) qtStatus = 'STABLE';

  return {
    date:          latest.date,
    totalAssets:   toBillions(latest.value),
    weeklyChange:  weekChange,
    reserves:      reserves[0]   ? toBillions(reserves[0].value)   : null,
    treasuries:    treasuries[0] ? toBillions(treasuries[0].value) : null,
    mbs:           mbs[0]        ? toBillions(mbs[0].value)        : null,
    qtStatus,
    fourWeekChange,
  };
}
