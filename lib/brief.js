export function generateBrief(market, cot, fed) {
  const lines = [];

  // ── CTA / COT ──────────────────────────────────────────────────────────────
  if (cot) {
    const p = cot.percentile;
    const dir = cot.direction;

    if (p >= 80)
      lines.push(`CTA net ${dir} NQ at ${p}th pct — crowded positioning, systematic bid present but mean-reversion risk elevated.`);
    else if (p >= 60)
      lines.push(`CTA net ${dir} NQ at ${p}th pct — trend-following bid in place, momentum supportive.`);
    else if (p >= 40)
      lines.push(`CTA positioning neutral (${p}th pct) — no strong systematic directional pressure.`);
    else if (p >= 20)
      lines.push(`CTA net SHORT NQ at ${p}th pct — systematic selling ongoing, watch for short-covering squeeze.`);
    else
      lines.push(`CTA heavily net SHORT (${p}th pct) — extreme positioning historically precedes sharp reversals.`);

    if (cot.netChg > 2000)
      lines.push(`Added ${cot.netChg.toLocaleString()} net contracts this week.`);
    else if (cot.netChg < -2000)
      lines.push(`Cut ${Math.abs(cot.netChg).toLocaleString()} net contracts this week.`);
  }

  // ── Fed ────────────────────────────────────────────────────────────────────
  if (fed) {
    if (fed.weeklyChange < -15)
      lines.push(`Fed drained $${Math.abs(fed.weeklyChange)}B via QT — liquidity headwind.`);
    else if (fed.weeklyChange > 15)
      lines.push(`Fed balance sheet expanded $${fed.weeklyChange}B — liquidity tailwind.`);
    else
      lines.push(`Fed balance sheet roughly flat w/w ($${Math.abs(fed.weeklyChange)}B), ${fed.qtStatus.toLowerCase()}.`);
  }

  // ── VIX regime ─────────────────────────────────────────────────────────────
  if (market?.vix) {
    const v = parseFloat(market.vix.price.toFixed(1));
    if (v > 30)
      lines.push(`VIX ${v} — high vol regime, NQ ranges wide, size down.`);
    else if (v > 22)
      lines.push(`VIX ${v} — vol elevated, caution on mean-reversion entries.`);
    else if (v < 13)
      lines.push(`VIX ${v} — vol compressed, low-range sessions, fade breakouts.`);
    else
      lines.push(`VIX ${v} — normal vol regime.`);
  }

  // ── 10Y yield ──────────────────────────────────────────────────────────────
  if (market?.tny) {
    const y = market.tny.price.toFixed(2);
    const chg = market.tny.change.toFixed(2);
    if (Math.abs(market.tny.change) > 0.08)
      lines.push(`10Y yield ${y}% (${chg > 0 ? '+' : ''}${chg}) — notable rates move, watch NQ correlation.`);
  }

  return lines.join(' ');
}
