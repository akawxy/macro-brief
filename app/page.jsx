'use client';
import { useEffect, useState, useCallback } from 'react';

const num = (v, d = 0) => v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const sgn = (v, d = 0) => v == null ? '—' : `${v > 0 ? '+' : ''}${num(v, d)}`;
const bil = (v) => v == null ? '—' : `$${num(v)}B`;
const pct = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

function fmtTs(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  });
}

const color = (v, inv = false) => {
  if (v == null) return 'var(--txt2)';
  const up = inv ? v < 0 : v > 0;
  return up ? 'var(--up)' : v === 0 ? 'var(--txt2)' : 'var(--dn)';
};

function Badge({ v }) {
  if (!v) return null;
  const up = ['LONG','EXPANDING','STABLE'].includes(v.toUpperCase());
  const dn = ['SHORT','CONTRACTING'].includes(v.toUpperCase());
  return (
    <span style={{
      padding: '1px 8px', fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
      letterSpacing: '0.06em',
      border: `1px solid ${up ? 'var(--up)' : dn ? 'var(--dn)' : 'var(--b2)'}`,
      color: up ? 'var(--up)' : dn ? 'var(--dn)' : 'var(--txt2)',
    }}>{v}</span>
  );
}

function PctBar({ p }) {
  if (p == null) return <span style={{ color: 'var(--txt3)', fontFamily: 'var(--mono)', fontSize: 12 }}>—</span>;
  const c = p > 70 ? 'var(--up)' : p < 30 ? 'var(--dn)' : 'var(--txt2)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 3, background: 'var(--b2)' }}>
        <div style={{ width: `${p}%`, height: '100%', background: c }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: c, minWidth: 52, textAlign: 'right' }}>
        {p}th pct
      </span>
    </div>
  );
}

function SHead({ title, badge, right }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0 10px', borderBottom: '1px solid var(--b)', marginBottom: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>{title}</span>
        {badge && <Badge v={badge} />}
      </div>
      {right && <span style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--mono)' }}>{right}</span>}
    </div>
  );
}

function Grid({ cols }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, borderBottom: '1px solid var(--b)' }}>
      {cols.map((c, i) => (
        <div key={i} style={{ padding: '12px 14px', borderRight: i < cols.length - 1 ? '1px solid var(--b)' : 'none' }}>
          <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{c.label}</div>
          <div style={{ fontSize: 18, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--txt)', marginBottom: 3 }}>{c.val}</div>
          {c.sub != null && <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: c.sc ?? 'var(--txt2)' }}>{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid var(--b)' }}>
      <span style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 160 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function Page() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ts, setTs] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      setData(await res.json());
      setTs(new Date().toISOString());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, [load]);

  const { market: m, cot, fed, brief, errors } = data ?? {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60,
      '--bg':'#080808','--b':'#1a1a1a','--b2':'#252525','--txt':'#e0e0e0',
      '--txt2':'#555','--txt3':'#2a2a2a','--up':'#22c55e','--dn':'#ef4444',
      '--mono':"'SF Mono','Fira Code','Consolas',monospace",
    }}>

      {/* topbar */}
      <div style={{ borderBottom:'1px solid #1a1a1a', padding:'0 24px', height:40, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#080808', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontFamily:"'SF Mono','Consolas',monospace", fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#e0e0e0' }}>MACRO BRIEF</span>
          <span style={{ fontSize:10, color:'#2a2a2a', letterSpacing:'0.06em' }}>CTA · FED H.4.1 · MARKET</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {ts && <span style={{ fontSize:10, color:'#2a2a2a', fontFamily:"monospace" }}>{fmtTs(ts)}</span>}
          <button onClick={load} disabled={loading} style={{ background:'none', border:'1px solid #252525', color:'#555', padding:'3px 10px', fontSize:10, fontFamily:'monospace', cursor:'pointer', letterSpacing:'0.06em' }}>
            {loading ? 'LOADING' : 'REFRESH'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 20px' }}>

        {/* MARKET */}
        <SHead title="Market" right={ts ? fmtTs(ts) : '—'} />
        <Grid cols={[
          { label:'NQ futures', val: m?.nq  ? num(m.nq.price)          : '—', sub: m?.nq  ? pct(m.nq.changePct)  : null, sc: color(m?.nq?.change) },
          { label:'SPX',        val: m?.spx ? num(m.spx.price)         : '—', sub: m?.spx ? pct(m.spx.changePct) : null, sc: color(m?.spx?.change) },
          { label:'VIX',        val: m?.vix ? num(m.vix.price,2)       : '—', sub: m?.vix ? sgn(m.vix.change,2)  : null, sc: color(m?.vix?.change, true) },
          { label:'10Y yield',  val: m?.tny ? `${num(m.tny.price,2)}%` : '—', sub: m?.tny ? sgn(m.tny.change,2)  : null, sc: color(m?.tny?.change, true) },
        ]} />

        <div style={{ height:24 }} />

        {/* CTA */}
        <SHead title="CTA proxy — CFTC COT / E-Mini NQ" badge={cot?.direction} right={cot ? `COT ${cot.date} · ${cot.weeksOfData}w` : errors?.find(e=>e.startsWith('cot:')) ?? '—'} />
        <Grid cols={[
          { label:'Non-comm long',  val: cot ? num(cot.long)  : '—', sub: cot ? `${sgn(cot.longChg)} w/w`  : null, sc: color(cot?.longChg) },
          { label:'Non-comm short', val: cot ? num(cot.short) : '—', sub: cot ? `${sgn(cot.shortChg)} w/w` : null, sc: color(cot?.shortChg, true) },
          { label:'Net position',   val: cot ? `${cot.net>=0?'+':''}${num(cot.net)}` : '—', sub: cot ? `${sgn(cot.netChg)} w/w` : null, sc: color(cot?.netChg) },
          { label:'Open interest',  val: cot ? num(cot.oi) : '—', sub: cot?.specRatio != null ? `spec ${cot.specRatio}% of OI` : null, sc: 'var(--txt2)' },
        ]} />
        <Row label="52-week percentile"><PctBar p={cot?.percentile} /></Row>
        {cot?.specRatio != null && (
          <Row label="Spec ratio (non-comm / OI)">
            <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--txt2)' }}>{cot.specRatio}%</span>
          </Row>
        )}

        <div style={{ height:24 }} />

        {/* FED */}
        <SHead title="Fed balance sheet — H.4.1" badge={fed?.qtStatus} right={fed ? `FRED ${fed.date}` : '—'} />
        <Grid cols={[
          { label:'Total assets',     val: fed ? bil(fed.totalAssets) : '—', sub: fed ? `${sgn(fed.weeklyChange)}B w/w` : null, sc: color(fed?.weeklyChange) },
          { label:'Reserve balances', val: fed ? bil(fed.reserves)   : '—' },
          { label:'Treasuries',       val: fed ? bil(fed.treasuries) : '—' },
          { label:'MBS',              val: fed ? bil(fed.mbs)        : '—' },
        ]} />
        {fed && (
          <Row label="4-week net change">
            <span style={{ fontFamily:'var(--mono)', fontSize:12, color: color(fed.fourWeekChange) }}>{sgn(fed.fourWeekChange)}B</span>
            <span style={{ fontSize:10, color:'var(--txt3)', marginLeft:10 }}>
              {fed.fourWeekChange < -20 ? 'consistent QT drain' : fed.fourWeekChange > 20 ? 'balance sheet expanding' : 'roughly flat'}
            </span>
          </Row>
        )}

        <div style={{ height:24 }} />

        {/* BRIEF */}
        <SHead title="Brief" />
        <div style={{ padding:'14px', borderBottom:'1px solid var(--b)', fontFamily:'var(--mono)', fontSize:12, color:'var(--txt2)', lineHeight:1.9 }}>
          {loading && !brief ? <span style={{ color:'var(--txt3)' }}>fetching...</span> : brief || '—'}
        </div>

        {errors?.length > 0 && (
          <div style={{ padding:'8px 14px', fontFamily:'monospace', fontSize:10, color:'#333', borderBottom:'1px solid var(--b)' }}>
            {errors.map((e,i) => <div key={i}>{e}</div>)}
          </div>
        )}

        <div style={{ marginTop:32, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:10, color:'#2a2a2a' }}>CFTC Socrata · FRED · Yahoo Finance</span>
          <span style={{ fontSize:10, color:'#2a2a2a' }}>60s refresh</span>
        </div>
      </div>
    </div>
  );
}
