'use client';
import { useEffect, useState, useCallback } from 'react';

const num = (v,d=0) => v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const sgn = (v,d=0) => v==null?'—':`${v>0?'+':''}${num(v,d)}`;
const bil = (v) => v==null?'—':`$${num(v)}B`;
const pct = (v) => v==null?'—':`${v>0?'+':''}${Number(v).toFixed(2)}%`;
function fmtTs(iso){if(!iso)return'—';return new Date(iso).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'});}
const col=(v,inv=false)=>{if(v==null)return'#3a3a3a';const up=inv?v<0:v>0;return up?'#22c55e':v===0?'#3a3a3a':'#ef4444';};

function computeBias(cot,fed,market){
  let s=0;
  if(cot){if(cot.direction==='LONG')s+=1;else s-=1;if(cot.percentile>60)s+=0.5;else if(cot.percentile<40)s-=0.5;if(cot.netChg>0)s+=0.5;else if(cot.netChg<0)s-=0.5;}
  if(fed){if(fed.weeklyChange>10)s+=0.5;else if(fed.weeklyChange<-10)s-=0.5;}
  if(market?.vix?.price>25)s-=0.5;
  if(s>0.5)return'LONG';if(s<-0.5)return'SHORT';return'NEUTRAL';
}

const INFO = {
  cta:{
    title:'CTA Proxy — CFTC COT',
    sections:[
      {h:'What it is',t:'The CFTC Commitments of Traders report, published every Friday, shows how large speculative traders (non-commercial participants) are positioned in NQ futures. This cohort includes trend-following CTAs, quant funds, and macro hedge funds — the closest public proxy for systematic flow.'},
      {h:'Non-commercial long / short',t:'Number of contracts held by speculators on each side. When longs vastly exceed shorts, systematic funds are leaning bullish and have already deployed capital.'},
      {h:'Net position',t:'Long minus short. Positive = net long bias. Negative = net short. The key number — it tells you which direction the systematic community is positioned.'},
      {h:'52-week percentile',t:'Where current net stands vs the past year. Above 70th = crowded long, limited additional buying power, mean-reversion risk elevated. Below 30th = crowded short, short-squeeze potential.'},
      {h:'Spec ratio',t:'Non-commercial contracts as a % of total open interest. High ratio means speculators dominate the market — moves can be amplified when they all rush the same direction.'},
      {h:'How to use it for NQ',t:'High percentile + net long: the easy CTA bid is already in. Upside needs fundamental confirmation. Low percentile + net short: systematic selling may be exhausted, watch for squeeze. Week-on-week change tells you whether funds are adding or reducing exposure right now.'},
    ]
  },
  fed:{
    title:'Fed Balance Sheet — H.4.1',
    sections:[
      {h:'What it is',t:'The Federal Reserve H.4.1 report, released every Thursday around 4:30 PM ET, shows the full Fed balance sheet. It tracks what the Fed owns (Treasuries, MBS) and what banks hold at the Fed (reserves). A primary macro liquidity indicator.'},
      {h:'Total assets',t:'The aggregate size of the Fed\'s balance sheet. Currently ~$6.7T, down from a peak of ~$9T in 2022. The trend matters more than the absolute number.'},
      {h:'QT — Quantitative Tightening',t:'Since June 2022, the Fed has been shrinking its balance sheet by letting bonds mature without reinvesting proceeds. This drains reserves from the banking system, tightening financial conditions over time.'},
      {h:'Reserve balances',t:'Cash commercial banks park at the Fed. High reserves = ample liquidity = supportive for risk assets. If reserves drop sharply, funding stress can emerge. Watch for reserves falling below ~$3T as a risk threshold.'},
      {h:'Weekly change',t:'The week-over-week change in total assets. Positive = balance sheet expanded (liquidity added). Negative = QT drain (liquidity removed). Large swings in either direction can move risk assets.'},
      {h:'How to use it for NQ',t:'Expanding balance sheet is a liquidity tailwind for equities — more dollars chasing assets. Contracting balance sheet is a headwind. Combine with CTA positioning: high CTA longs + QT drain = double headwind. Low CTA shorts + expansion = potential squeeze setup.'},
    ]
  }
};

function InfoModal({type,onClose}){
  const info=INFO[type];if(!info)return null;
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:48,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#0a0a0a',border:'1px solid #222',maxWidth:540,width:'90%',marginBottom:48}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #1a1a1a',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontFamily:'monospace',fontSize:11,color:'#888',letterSpacing:'0.1em',textTransform:'uppercase'}}>{info.title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#444',fontSize:18,cursor:'pointer',lineHeight:1,padding:'0 4px'}}>×</button>
        </div>
        <div style={{padding:'20px'}}>
          {info.sections.map(({h,t})=>(
            <div key={h} style={{marginBottom:22}}>
              <div style={{fontFamily:'monospace',fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:7}}>{h}</div>
              <div style={{fontSize:13,color:'#666',lineHeight:1.85,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ln(){return <div style={{height:'1px',background:'#141414',margin:'22px 0'}}/>;}

function DataRow({label,value,sub,subColor,indent=false}){
  return(
    <div style={{display:'flex',alignItems:'baseline',gap:0,marginBottom:7,paddingLeft:indent?16:0}}>
      <span style={{fontFamily:'monospace',fontSize:11,color:'#333',minWidth:130,textTransform:'lowercase',letterSpacing:'0.02em'}}>{label}</span>
      <span style={{fontFamily:'monospace',fontSize:14,color:'#ccc',fontWeight:500,minWidth:110,textAlign:'right'}}>{value}</span>
      {sub!=null&&<span style={{fontFamily:'monospace',fontSize:11,color:subColor??'#3a3a3a',marginLeft:16}}>{sub}</span>}
    </div>
  );
}

function SectionTitle({children,right,badge,info,onInfo}){
  const bColor=badge==='LONG'||badge==='EXPANDING'?'#22c55e':badge==='SHORT'||badge==='CONTRACTING'?'#ef4444':'#555';
  return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:6}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontFamily:'monospace',fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:'0.14em',fontWeight:700}}>{children}</span>
        {badge&&<span style={{fontFamily:'monospace',fontSize:10,color:bColor,letterSpacing:'0.06em',fontWeight:700}}>{badge}</span>}
        {info&&<button onClick={()=>onInfo(info)} style={{background:'none',border:'none',color:'#2a2a2a',fontSize:10,fontFamily:'monospace',cursor:'pointer',padding:0,letterSpacing:'0.04em',textDecoration:'underline',textUnderlineOffset:3}}>what is this</button>}
      </div>
      {right&&<span style={{fontFamily:'monospace',fontSize:10,color:'#252525'}}>{right}</span>}
    </div>
  );
}

function PctBar({p}){
  if(p==null)return null;
  const c=p>70?'#22c55e':p<30?'#ef4444':'#555';
  const label=p>70?'crowded long':p<30?'crowded short':'neutral range';
  return(
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:7,paddingLeft:0}}>
      <span style={{fontFamily:'monospace',fontSize:11,color:'#333',minWidth:130,letterSpacing:'0.02em'}}>52w percentile</span>
      <div style={{width:100,height:2,background:'#1a1a1a',flexShrink:0}}>
        <div style={{width:`${p}%`,height:'100%',background:c}}/>
      </div>
      <span style={{fontFamily:'monospace',fontSize:11,color:c}}>{p}th</span>
      <span style={{fontFamily:'monospace',fontSize:10,color:'#2a2a2a'}}>{label}</span>
    </div>
  );
}

export default function Page(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [ts,setTs]=useState(null);
  const [modal,setModal]=useState(null);
  const [ready,setReady]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{const res=await fetch('/api/data');setData(await res.json());setTs(new Date().toISOString());}catch{}
    setLoading(false);
  },[]);

  useEffect(()=>{
    setTimeout(()=>setReady(true),400);
    load();
    const id=setInterval(load,60000);
    return()=>clearInterval(id);
  },[load]);

  const {market:m,cot,fed,brief,errors}=data??{};
  const bias=data?computeBias(cot,fed,m):null;
  const biasColor=bias==='LONG'?'#22c55e':bias==='SHORT'?'#ef4444':'#888';

  return(
    <div style={{minHeight:'100vh',background:'#070707',color:'#ccc',fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif",paddingBottom:80}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .s0{animation:fadeUp 0.5s ease 0.1s both}
        .s1{animation:fadeUp 0.5s ease 0.25s both}
        .s2{animation:fadeUp 0.5s ease 0.4s both}
        .s3{animation:fadeUp 0.5s ease 0.55s both}
        .s4{animation:fadeUp 0.5s ease 0.7s both}
        .cursor{display:inline-block;animation:blink 1s step-end infinite}
      `}</style>

      {modal&&<InfoModal type={modal} onClose={()=>setModal(null)}/>}

      {/* topbar */}
      <div style={{borderBottom:'1px solid #111',padding:'0 32px',height:42,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#070707',zIndex:10}}>
        <span style={{fontFamily:'monospace',fontSize:14,fontWeight:700,color:'#e0e0e0',letterSpacing:'-0.02em'}}>
          y<sup style={{fontSize:9,verticalAlign:'super'}}>3</sup>
        </span>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {ts&&<span style={{fontFamily:'monospace',fontSize:10,color:'#222'}}>{fmtTs(ts)}</span>}
          <button onClick={load} disabled={loading} style={{background:'none',border:'none',color:loading?'#222':'#333',fontFamily:'monospace',fontSize:10,cursor:'pointer',letterSpacing:'0.06em',padding:0}}>
            {loading?'loading...':'↻ refresh'}
          </button>
        </div>
      </div>

      <div style={{maxWidth:720,padding:'32px 32px 0',opacity:ready?1:0,transition:'opacity 0.3s'}}>

        {/* MARKET */}
        <div className="s0">
          <SectionTitle right={ts?fmtTs(ts):'—'}>Market</SectionTitle>
          <DataRow label="NQ futures" value={m?.nq?num(m.nq.price):'—'} sub={m?.nq?pct(m.nq.changePct):null} subColor={col(m?.nq?.change)}/>
          <DataRow label="SPX"        value={m?.spx?num(m.spx.price):'—'} sub={m?.spx?pct(m.spx.changePct):null} subColor={col(m?.spx?.change)}/>
          <DataRow label="VIX"        value={m?.vix?num(m.vix.price,2):'—'} sub={m?.vix?sgn(m.vix.change,2):null} subColor={col(m?.vix?.change,true)}/>
          <DataRow label="10Y yield"  value={m?.tny?`${num(m.tny.price,2)}%`:'—'} sub={m?.tny?sgn(m.tny.change,2):null} subColor={col(m?.tny?.change,true)}/>
        </div>

        <Ln/>

        {/* CTA */}
        <div className="s1">
          <SectionTitle badge={cot?.direction} right={cot?`COT ${cot.date} · ${cot.weeksOfData}w`:(errors?.find(e=>e.startsWith('cot:'))??'—')} info="cta" onInfo={setModal}>
            CTA proxy — CFTC COT
          </SectionTitle>
          {cot?(
            <>
              <DataRow label="non-comm long"  value={num(cot.long)}  sub={`${sgn(cot.longChg)} w/w`}  subColor={col(cot.longChg)}/>
              <DataRow label="non-comm short" value={num(cot.short)} sub={`${sgn(cot.shortChg)} w/w`} subColor={col(cot.shortChg,true)}/>
              <DataRow label="net"            value={`${cot.net>=0?'+':''}${num(cot.net)}`} sub={`${sgn(cot.netChg)} w/w`} subColor={col(cot.netChg)}/>
              <DataRow label="open interest"  value={num(cot.oi)} sub={cot.specRatio!=null?`spec ${cot.specRatio}% of OI`:null} subColor="#2a2a2a"/>
              <div style={{height:8}}/>
              <PctBar p={cot.percentile}/>
            </>
          ):(
            <div style={{fontFamily:'monospace',fontSize:11,color:'#ef4444',marginBottom:8}}>{errors?.find(e=>e.startsWith('cot:'))??'data unavailable'}</div>
          )}
        </div>

        <Ln/>

        {/* FED */}
        <div className="s2">
          <SectionTitle badge={fed?.qtStatus} right={fed?`FRED ${fed.date}`:'—'} info="fed" onInfo={setModal}>
            Fed balance sheet — H.4.1
          </SectionTitle>
          {fed?(
            <>
              <DataRow label="total assets"   value={bil(fed.totalAssets)}  sub={`${sgn(fed.weeklyChange)}B w/w`} subColor={col(fed.weeklyChange)}/>
              <DataRow label="reserves"        value={bil(fed.reserves)}/>
              <DataRow label="treasuries"      value={bil(fed.treasuries)}/>
              <DataRow label="MBS"             value={bil(fed.mbs)}/>
              <DataRow label="4-week change"   value={`${sgn(fed.fourWeekChange)}B`} subColor={col(fed.fourWeekChange)} sub={fed.fourWeekChange<-20?'consistent drain':fed.fourWeekChange>20?'expanding':'flat'} />
            </>
          ):(
            <div style={{fontFamily:'monospace',fontSize:11,color:'#3a3a3a',marginBottom:8}}>data unavailable</div>
          )}
        </div>

        <Ln/>

        {/* BRIEF */}
        <div className="s3">
          <SectionTitle>Brief</SectionTitle>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <span style={{fontFamily:'monospace',fontSize:10,color:'#2a2a2a',textTransform:'uppercase',letterSpacing:'0.1em'}}>bias</span>
            <span style={{fontFamily:'monospace',fontSize:12,color:biasColor,fontWeight:700,letterSpacing:'0.08em'}}>{bias??'—'}</span>
          </div>
          <div style={{fontSize:13,color:'#3a3a3a',lineHeight:2,fontFamily:'monospace',maxWidth:600}}>
            {loading&&!brief?<span>loading<span className="cursor">_</span></span>:brief||'—'}
          </div>
        </div>

        {errors?.length>0&&(
          <div className="s4" style={{marginTop:24,fontFamily:'monospace',fontSize:10,color:'#222'}}>
            {errors.map((e,i)=><div key={i}>{e}</div>)}
          </div>
        )}

      </div>
    </div>
  );
}
