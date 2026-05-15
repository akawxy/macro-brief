'use client';
import { useEffect, useState, useCallback } from 'react';

const num = (v, d=0) => v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const sgn = (v, d=0) => v==null?'—':`${v>0?'+':''}${num(v,d)}`;
const bil = (v) => v==null?'—':`$${num(v)}B`;
const pct = (v) => v==null?'—':`${v>0?'+':''}${Number(v).toFixed(2)}%`;

function fmtTs(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'});
}

const col = (v, inv=false) => {
  if (v==null) return '#444';
  const up = inv ? v<0 : v>0;
  return up ? '#22c55e' : v===0 ? '#444' : '#ef4444';
};

function computeBias(cot, fed, market) {
  let score = 0;
  if (cot) {
    if (cot.direction === 'LONG') score += 1; else score -= 1;
    if (cot.percentile > 60) score += 0.5; else if (cot.percentile < 40) score -= 0.5;
    if (cot.netChg > 0) score += 0.5; else if (cot.netChg < 0) score -= 0.5;
  }
  if (fed) {
    if (fed.weeklyChange > 10) score += 0.5;
    else if (fed.weeklyChange < -10) score -= 0.5;
  }
  if (market?.vix?.price > 25) score -= 0.5;
  if (score > 0.5) return 'LONG';
  if (score < -0.5) return 'SHORT';
  return 'NEUTRAL';
}

// ── info modal ────────────────────────────────────────────────────────────────
const INFO = {
  cta: {
    title: 'CTA Proxy — CFTC COT',
    body: [
      ['What is it', 'The CFTC Commitments of Traders (COT) report is published every Friday and shows the positioning of large non-commercial (speculative/systematic) traders in NQ futures. These funds are the closest public proxy for CTA (Commodity Trading Advisor) flow.'],
      ['Non-comm long / short', 'Number of contracts held long or short by non-commercial participants — mainly trend-following and systematic funds (CTAs), hedge funds.'],
      ['Net position', 'Long minus short. Positive = net long (bullish bias). Negative = net short (bearish bias).'],
      ['52-week percentile', 'Where the current net position ranks vs the last 52 weeks. Above 70th = crowded long, mean-reversion risk. Below 30th = crowded short, short-squeeze risk.'],
      ['Spec ratio', 'Non-commercial contracts as % of open interest. High ratio = speculative activity dominant.'],
      ['How to use it', 'High percentile + net long → CTAs already bought, less fuel for upside. Low percentile + net short → potential squeeze catalyst. Week-over-week change shows if funds are adding or cutting.'],
    ]
  },
  fed: {
    title: 'Fed Balance Sheet — H.4.1',
    body: [
      ['What is it', 'The Federal Reserve\'s H.4.1 report is published every Thursday and shows the Fed\'s balance sheet. It tracks total assets, reserve balances held by banks, Treasury holdings, and MBS holdings.'],
      ['Total assets', 'The total size of the Fed\'s balance sheet. Currently ~$6.7T. Peak was ~$9T in 2022.'],
      ['QT (Quantitative Tightening)', 'The Fed is actively reducing its balance sheet by letting bonds mature without reinvesting. This drains liquidity from the system over time.'],
      ['Reserve balances', 'Cash that commercial banks hold at the Fed. High reserves = ample liquidity in the system = supportive for risk assets like NQ.'],
      ['Weekly change', 'The week-over-week change in total assets. Positive = balance sheet expanding (liquidity adding). Negative = QT drain (liquidity removing).'],
      ['How to use it', 'Expanding balance sheet → more liquidity → tailwind for equities/NQ. Shrinking balance sheet → tighter conditions → headwind. Watch for large weekly swings as potential catalysts.'],
    ]
  }
};

function InfoModal({ type, onClose }) {
  const info = INFO[type];
  if (!info) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:60 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#0f0f0f', border:'1px solid #222', maxWidth:560, width:'90%', maxHeight:'80vh', overflow:'auto' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #1a1a1a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#ccc' }}>{info.title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#444', fontSize:16, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:'16px 20px' }}>
          {info.body.map(([label, text]) => (
            <div key={label} style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:'#444', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:13, color:'#888', lineHeight:1.8 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatIsThis({ type, onClick }) {
  return (
    <button onClick={onClick} style={{ background:'none', border:'1px solid #222', color:'#444', padding:'1px 8px', fontSize:10, fontFamily:'monospace', cursor:'pointer', letterSpacing:'0.04em' }}>
      what is this
    </button>
  );
}

function Badge({ v }) {
  if (!v) return null;
  const up = ['LONG','EXPANDING','STABLE'].includes(v.toUpperCase());
  const dn = ['SHORT','CONTRACTING'].includes(v.toUpperCase());
  return (
    <span style={{ padding:'1px 8px', fontSize:10, fontFamily:'monospace', fontWeight:700, letterSpacing:'0.06em', border:`1px solid ${up?'#22c55e':dn?'#ef4444':'#333'}`, color:up?'#22c55e':dn?'#ef4444':'#888' }}>
      {v}
    </span>
  );
}

function BiasBadge({ bias }) {
  if (!bias) return null;
  const c = bias==='LONG'?'#22c55e':bias==='SHORT'?'#ef4444':'#888';
  const bc = bias==='LONG'?'#14532d':bias==='SHORT'?'#450a0a':'#1a1a1a';
  return (
    <span style={{ padding:'2px 10px', fontSize:11, fontFamily:'monospace', fontWeight:700, letterSpacing:'0.08em', background:bc, border:`1px solid ${c}`, color:c }}>
      {bias}
    </span>
  );
}

function PctBar({ p }) {
  if (p==null) return <span style={{ color:'#333', fontFamily:'monospace', fontSize:12 }}>—</span>;
  const c = p>70?'#22c55e':p<30?'#ef4444':'#888';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, height:3, background:'#1e1e1e' }}>
        <div style={{ width:`${p}%`, height:'100%', background:c }} />
      </div>
      <span style={{ fontFamily:'monospace', fontSize:12, color:c, minWidth:52, textAlign:'right' }}>{p}th pct</span>
    </div>
  );
}

function SHead({ title, badge, right, infoType, onInfo }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 0 10px', borderBottom:'1px solid #1a1a1a', flexWrap:'wrap', gap:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:600 }}>{title}</span>
        {badge && <Badge v={badge} />}
        {infoType && <WhatIsThis type={infoType} onClick={()=>onInfo(infoType)} />}
      </div>
      {right && <span style={{ fontSize:10, color:'#2a2a2a', fontFamily:'monospace' }}>{right}</span>}
    </div>
  );
}

function Grid({ cols }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols.length}, 1fr)`, borderBottom:'1px solid #1a1a1a' }}>
      {cols.map((c,i) => (
        <div key={i} style={{ padding:'12px 14px', borderRight:i<cols.length-1?'1px solid #1a1a1a':'none' }}>
          <div style={{ fontSize:10, color:'#2a2a2a', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>{c.label}</div>
          <div style={{ fontSize:18, fontFamily:'monospace', fontWeight:600, color:'#e0e0e0', marginBottom:3 }}>{c.val}</div>
          {c.sub!=null && <div style={{ fontSize:11, fontFamily:'monospace', color:c.sc??'#444' }}>{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 14px', borderBottom:'1px solid #1a1a1a' }}>
      <span style={{ fontSize:10, color:'#2a2a2a', textTransform:'uppercase', letterSpacing:'0.08em', minWidth:160 }}>{label}</span>
      <div style={{ flex:1 }}>{children}</div>
    </div>
  );
}

export default function Page() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [ts, setTs]         = useState(null);
  const [modal, setModal]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      setData(await res.json());
      setTs(new Date().toISOString());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const id=setInterval(load,60000); return ()=>clearInterval(id); }, [load]);

  const { market:m, cot, fed, brief, errors } = data ?? {};
  const bias = data ? computeBias(cot, fed, m) : null;

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:60, color:'#e0e0e0', fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif" }}>
      {modal && <InfoModal type={modal} onClose={()=>setModal(null)} />}

      {/* topbar */}
      <div style={{ borderBottom:'1px solid #1a1a1a', padding:'0 24px', height:40, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#080808', zIndex:10 }}>
        <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, letterSpacing:'0.06em', color:'#e0e0e0' }}>
          y<sup style={{ fontSize:9 }}>3</sup>
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {ts && <span style={{ fontSize:10, color:'#2a2a2a', fontFamily:'monospace' }}>{fmtTs(ts)}</span>}
          <button onClick={load} disabled={loading} style={{ background:'none', border:'1px solid #1e1e1e', color:loading?'#2a2a2a':'#444', padding:'3px 10px', fontSize:10, fontFamily:'monospace', cursor:'pointer', letterSpacing:'0.06em' }}>
            {loading ? 'LOADING' : 'REFRESH'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px' }}>

        {/* MARKET */}
        <SHead title="Market" right={ts ? fmtTs(ts) : '—'} />
        <Grid cols={[
          { label:'NQ futures', val:m?.nq  ? num(m.nq.price)          :'—', sub:m?.nq  ? pct(m.nq.changePct)  :null, sc:col(m?.nq?.change) },
          { label:'SPX',        val:m?.spx ? num(m.spx.price)         :'—', sub:m?.spx ? pct(m.spx.changePct) :null, sc:col(m?.spx?.change) },
          { label:'VIX',        val:m?.vix ? num(m.vix.price,2)       :'—', sub:m?.vix ? sgn(m.vix.change,2)  :null, sc:col(m?.vix?.change,true) },
          { label:'10Y yield',  val:m?.tny ? `${num(m.tny.price,2)}%` :'—', sub:m?.tny ? sgn(m.tny.change,2)  :null, sc:col(m?.tny?.change,true) },
        ]} />

        <div style={{ height:24 }} />

        {/* CTA */}
        <SHead
          title="CTA proxy — CFTC COT / E-Mini NQ"
          badge={cot?.direction}
          right={cot ? `COT ${cot.date} · ${cot.weeksOfData}w` : errors?.find(e=>e.startsWith('cot:')) ?? '—'}
          infoType="cta"
          onInfo={setModal}
        />
        <Grid cols={[
          { label:'Non-comm long',  val:cot?num(cot.long) :'—', sub:cot?`${sgn(cot.longChg)} w/w` :null, sc:col(cot?.longChg) },
          { label:'Non-comm short', val:cot?num(cot.short):'—', sub:cot?`${sgn(cot.shortChg)} w/w`:null, sc:col(cot?.shortChg,true) },
          { label:'Net position',   val:cot?`${cot.net>=0?'+':''}${num(cot.net)}`:'—', sub:cot?`${sgn(cot.netChg)} w/w`:null, sc:col(cot?.netChg) },
          { label:'Open interest',  val:cot?num(cot.oi):'—', sub:cot?.specRatio!=null?`spec ${cot.specRatio}% of OI`:null, sc:'#444' },
        ]} />
        <Row label="52-week percentile"><PctBar p={cot?.percentile} /></Row>
        {cot?.specRatio!=null && (
          <Row label="Spec ratio (non-comm / OI)">
            <span style={{ fontFamily:'monospace', fontSize:12, color:'#555' }}>{cot.specRatio}%</span>
          </Row>
        )}

        <div style={{ height:24 }} />

        {/* FED */}
        <SHead
          title="Fed balance sheet — H.4.1"
          badge={fed?.qtStatus}
          right={fed ? `FRED ${fed.date}` : '—'}
          infoType="fed"
          onInfo={setModal}
        />
        <Grid cols={[
          { label:'Total assets',     val:fed?bil(fed.totalAssets):'—', sub:fed?`${sgn(fed.weeklyChange)}B w/w`:null, sc:col(fed?.weeklyChange) },
          { label:'Reserve balances', val:fed?bil(fed.reserves)   :'—' },
          { label:'Treasuries',       val:fed?bil(fed.treasuries) :'—' },
          { label:'MBS',              val:fed?bil(fed.mbs)        :'—' },
        ]} />
        {fed && (
          <Row label="4-week net change">
            <span style={{ fontFamily:'monospace', fontSize:12, color:col(fed.fourWeekChange) }}>{sgn(fed.fourWeekChange)}B</span>
            <span style={{ fontSize:10, color:'#2a2a2a', marginLeft:10 }}>
              {fed.fourWeekChange < -20 ? 'consistent QT drain' : fed.fourWeekChange > 20 ? 'balance sheet expanding' : 'roughly flat'}
            </span>
          </Row>
        )}

        <div style={{ height:24 }} />

        {/* BRIEF + BIAS */}
        <SHead title="Brief" />
        <div style={{ padding:'14px', borderBottom:'1px solid #1a1a1a' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <span style={{ fontSize:10, color:'#2a2a2a', textTransform:'uppercase', letterSpacing:'0.1em' }}>bias</span>
            <BiasBadge bias={bias} />
          </div>
          <div style={{ fontFamily:'monospace', fontSize:12, color:'#555', lineHeight:1.9 }}>
            {loading && !brief ? <span style={{ color:'#2a2a2a' }}>fetching...</span> : brief || '—'}
          </div>
        </div>

        {errors?.length > 0 && (
          <div style={{ padding:'8px 14px', fontFamily:'monospace', fontSize:10, color:'#2a2a2a', borderBottom:'1px solid #1a1a1a' }}>
            {errors.map((e,i) => <div key={i}>{e}</div>)}
          </div>
        )}

        <div style={{ marginTop:28 }}>
          <span style={{ fontSize:10, color:'#1e1e1e' }}>60s refresh</span>
        </div>
      </div>
    </div>
  );
}
