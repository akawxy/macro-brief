'use client';
import { useEffect, useState, useCallback } from 'react';

// ─── formatting ──────────────────────────────────────────────────────────────
const n  = (v, d = 0) => v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const nb = (v)        => v == null ? '—' : `$${n(v)}B`;
const pct = (v)       => v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

function fmtTs(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' });
}

function chgStyle(v) {
  if (v == null) return {};
  return { color: v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--neutral)' };
}

// ─── primitives ──────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' },

  topbar: {
    borderBottom: '1px solid var(--border)',
    padding: '0 24px',
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    background: 'var(--bg)',
    zIndex: 10,
  },

  wrap:    { maxWidth: 960, margin: '0 auto', padding: '0 20px' },
  divider: { height: 1, background: 'var(--border)', margin: '0' },

  sectionHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0 10px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 0,
  },

  label: { fontSize: 10, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  mono:  { fontFamily: 'var(--mono)' },

  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--border)' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--border)' },

  cell: {
    padding: '12px 16px',
    borderRight: '1px solid var(--border)',
  },

  cellLast: {
    padding: '12px 16px',
  },

  val:  { fontSize: 18, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--txt)', marginBottom: 3 },
  sub:  { fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--txt2)' },

  badge: (dir) => ({
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 10,
    fontFamily: 'var(--mono)',
    fontWeight: 700,
    letterSpacing: '0.06em',
    border: `1px solid ${dir === 'LONG' || dir === 'EXPANDING' ? 'var(--up)' : dir === 'SHORT' || dir === 'CONTRACTING' ? 'var(--down)' : 'var(--border2)'}`,
    color: dir === 'LONG' || dir === 'EXPANDING' ? 'var(--up)' : dir === 'SHORT' || dir === 'CONTRACTING' ? 'var(--down)' : 'var(--neutral)',
    background: 'transparent',
  }),
};

function Cell({ label, value, sub, subStyle, last }) {
  return (
    <div style={last ? S.cellLast : S.cell}>
      <div style={S.label}>{label}</div>
      <div style={S.val}>{value}</div>
      {sub != null && <div style={{ ...S.sub, ...subStyle }}>{sub}</div>}
    </div>
  );
}

function PctBar({ pct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: 'var(--border2)', borderRadius: 1 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct > 70 ? 'var(--up)' : pct < 30 ? 'var(--down)' : 'var(--neutral)', borderRadius: 1 }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--txt2)', minWidth: 40 }}>{pct}th</span>
    </div>
  );
}

function SectionHead({ title, sub, badge }) {
  return (
    <div style={S.sectionHead}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>{title}</span>
        {badge && <span style={S.badge(badge)}>{badge}</span>}
      </div>
      {sub && <span style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--mono)' }}>{sub}</span>}
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────
export default function Page() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLast]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const d   = await res.json();
      setData(d);
      setLast(new Date().toISOString());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, [load]);

  const { market, cot, fed, brief, errors } = data ?? {};

  return (
    <div style={S.page}>

      {/* topbar */}
      <div style={S.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--txt)' }}>
            MACRO BRIEF
          </span>
          <span style={{ fontSize: 10, color: 'var(--txt2)', letterSpacing: '0.06em' }}>
            CTA · FED H.4.1 · MARKET
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {lastFetch && (
            <span style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--mono)' }}>
              {fmtTs(lastFetch)}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: 'none',
              border: '1px solid var(--border2)',
              color: 'var(--txt2)',
              padding: '4px 12px',
              fontSize: 10,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              opacity: loading ? 0.4 : 1,
            }}
          >
            {loading ? 'LOADING' : 'REFRESH'}
          </button>
        </div>
      </div>

      <div style={S.wrap}>

        {/* ── MARKET ── */}
        <SectionHead
          title="Market"
          sub={market ? fmtTs(data.ts) : '—'}
        />
        <div style={S.grid4}>
          <Cell
            label="NQ futures"
            value={market?.nq ? n(market.nq.price) : '—'}
            sub={market?.nq ? pct(market.nq.changePct) : '—'}
            subStyle={chgStyle(market?.nq?.change)}
          />
          <Cell
            label="SPX"
            value={market?.spx ? n(market.spx.price) : '—'}
            sub={market?.spx ? pct(market.spx.changePct) : '—'}
            subStyle={chgStyle(market?.spx?.change)}
          />
          <Cell
            label="VIX"
            value={market?.vix ? n(market.vix.price, 2) : '—'}
            sub={market?.vix ? `${market.vix.change > 0 ? '+' : ''}${n(market.vix.change, 2)}` : '—'}
            subStyle={chgStyle(market?.vix?.change ? -market.vix.change : null)}
          />
          <Cell
            label="10Y yield"
            value={market?.tny ? `${n(market.tny.price, 2)}%` : '—'}
            sub={market?.tny ? `${market.tny.change > 0 ? '+' : ''}${n(market.tny.change, 2)}` : '—'}
            subStyle={chgStyle(market?.tny?.change ? -market.tny.change : null)}
            last
          />
        </div>

        <div style={{ height: 20 }} />

        {/* ── CTA / COT ── */}
        <SectionHead
          title="CTA proxy — CFTC COT / E-Mini NQ non-commercial"
          sub={cot ? `COT report ${cot.date}` : '—'}
          badge={cot?.direction}
        />

        <div style={S.grid4}>
          <Cell
            label="Non-comm long"
            value={cot ? n(cot.long) : '—'}
            sub={cot ? `${cot.longChg >= 0 ? '+' : ''}${n(cot.longChg)} w/w` : '—'}
            subStyle={chgStyle(cot?.longChg)}
          />
          <Cell
            label="Non-comm short"
            value={cot ? n(cot.short) : '—'}
            sub={cot ? `${cot.shortChg >= 0 ? '+' : ''}${n(cot.shortChg)} w/w` : '—'}
            subStyle={chgStyle(cot?.shortChg ? -cot.shortChg : null)}
          />
          <Cell
            label="Net position"
            value={cot ? `${cot.net >= 0 ? '+' : ''}${n(cot.net)}` : '—'}
            sub={cot ? `${cot.netChg >= 0 ? '+' : ''}${n(cot.netChg)} w/w` : '—'}
            subStyle={chgStyle(cot?.netChg)}
          />
          <Cell
            label="Open interest"
            value={cot ? n(cot.oi) : '—'}
            last
          />
        </div>

        {/* percentile bar */}
        {cot && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 10, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.1em', minWidth: 120 }}>
              52-week percentile
            </span>
            <div style={{ flex: 1 }}>
              <PctBar pct={cot.percentile} />
            </div>
          </div>
        )}

        <div style={{ height: 20 }} />

        {/* ── FED H.4.1 ── */}
        <SectionHead
          title="Fed balance sheet — H.4.1"
          sub={fed ? `FRED data ${fed.date}` : '—'}
          badge={fed?.qtStatus?.split(' ')[0]}
        />

        <div style={S.grid4}>
          <Cell
            label="Total assets"
            value={fed ? nb(fed.totalAssets) : '—'}
            sub={fed ? `${fed.weeklyChange >= 0 ? '+' : ''}${nb(fed.weeklyChange)} w/w` : '—'}
            subStyle={chgStyle(fed?.weeklyChange)}
          />
          <Cell
            label="Reserve balances"
            value={fed ? nb(fed.reserves) : '—'}
          />
          <Cell
            label="Treasuries"
            value={fed ? nb(fed.treasuries) : '—'}
          />
          <Cell
            label="MBS"
            value={fed ? nb(fed.mbs) : '—'}
            sub={fed?.qtStatus ?? '—'}
            subStyle={{ color: 'var(--txt2)' }}
            last
          />
        </div>

        <div style={{ height: 20 }} />

        {/* ── BRIEF ── */}
        <SectionHead title="Brief" />
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: 'var(--txt2)',
          lineHeight: 1.8,
        }}>
          {loading && !brief
            ? <span style={{ color: 'var(--txt3)' }}>fetching data...</span>
            : brief || <span style={{ color: 'var(--txt3)' }}>—</span>
          }
        </div>

        {/* errors */}
        {errors?.length > 0 && (
          <div style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--txt3)' }}>
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        {/* footer */}
        <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--txt3)' }}>Sources: CFTC Socrata API · FRED (St. Louis Fed) · Yahoo Finance</span>
          <span style={{ fontSize: 10, color: 'var(--txt3)' }}>Refreshes every 60s</span>
        </div>

      </div>
    </div>
  );
}
