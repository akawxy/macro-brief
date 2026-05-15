const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
};

async function fetchQuote(symbol) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: YF_HEADERS,
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`YF ${symbol} ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`no meta for ${symbol}`);

  const price = meta.regularMarketPrice ?? meta.chartPreviousClose;
  const prev  = meta.previousClose ?? meta.chartPreviousClose;
  const change     = price - prev;
  const changePct  = prev ? (change / prev) * 100 : 0;

  return { symbol, price, prev, change, changePct };
}

export async function fetchMarket() {
  const symbols = {
    nq:  'NQ=F',
    spx: '^GSPC',
    vix: '^VIX',
    tny: '^TNX',
  };

  const results = await Promise.allSettled(
    Object.entries(symbols).map(async ([key, sym]) => [key, await fetchQuote(sym)])
  );

  const out = {};
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const [key, val] = r.value;
      out[key] = val;
    }
  }
  return out;
}
