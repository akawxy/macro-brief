'use client';
import { useEffect, useState, useCallback } from 'react';

const num = (v,d=0) => v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const sgn = (v,d=0) => v==null?'—':`${v>0?'+':''}${num(v,d)}`;
const bil = (v) => v==null?'—':`$${num(v)}B`;
const pct = (v) => v==null?'—':`${v>0?'+':''}${Number(v).toFixed(2)}%`;
function fmtTs(iso){if(!iso)return'—';return new Date(iso).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'});}
const col=(v,inv=false)=>{if(v==null)return'#3a3a3a';const up=inv?v<0:v>0;return up?'#22c55e':v===0?'#3a3a3a':'#ef4444';};

function nextWeekday(day){
  const d=new Date();const diff=(day+7-d.getDay())%7;
  d.setDate(d.getDate()+(diff===0?7:diff));
  return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
}

function computeBias(cot,fed,market){
  let s=0;
  if(cot){if(cot.direction==='LONG')s+=1;else s-=1;if(cot.percentile>60)s+=0.5;else if(cot.percentile<40)s-=0.5;if(cot.netChg>0)s+=0.5;else if(cot.netChg<0)s-=0.5;}
  if(fed){if(fed.weeklyChange>10)s+=0.5;else if(fed.weeklyChange<-10)s-=0.5;}
  if(market?.vix?.price>25)s-=0.5;
  if(s>0.5)return'LONG';if(s<-0.5)return'SHORT';return'NEUTRAL';
}

const INFO={
  cta:{title:'CTA Proxy — CFTC COT',sections:[
    {h:'What it is',t:'The CFTC Commitments of Traders report, published every Friday, shows how large speculative traders (non-commercial participants) are positioned in NQ futures. This is the closest public proxy for CTA and systematic fund flow.'},
    {h:'Non-commercial long / short',t:'Contracts held by speculative participants on each side. When longs vastly exceed shorts, systematic funds are already long and have deployed capital — less fuel for additional upside.'},
    {h:'Net position',t:'Long minus short. Positive = net long bias. Negative = net short. This is the key number — it shows which direction the systematic community is leaning.'},
    {h:'52-week percentile',t:'Where the current net position ranks vs the past year. Above 70th = crowded long, mean-reversion risk. Below 30th = crowded short, short-squeeze potential.'},
    {h:'Spec ratio',t:'Non-commercial contracts as % of total open interest. High ratio = speculators dominate the book — moves get amplified.'},
    {h:'How to use it',t:'High percentile + net long: the easy CTA bid is already in, upside needs fresh catalysts. Low percentile + net short: systematic selling may be exhausted, watch for squeeze. Week-on-week change shows if funds are adding or reducing exposure.'},
  ]},
  fed:{title:'Fed Balance Sheet — H.4.1',sections:[
    {h:'What it is',t:'The Federal Reserve H.4.1 report, released every Thursday at ~4:30 PM ET, shows the full Fed balance sheet — what it owns and what banks hold there. A primary macro liquidity indicator.'},
    {h:'Total assets',t:'Aggregate size of the Fed\'s balance sheet. Currently ~$6.7T, down from a ~$9T peak in 2022. The direction of change matters more than the absolute level.'},
    {h:'QT — Quantitative Tightening',t:'Since June 2022 the Fed has been shrinking its balance sheet by letting bonds mature without reinvesting. This drains reserves from the banking system over time.'},
    {h:'Reserve balances',t:'Cash commercial banks park at the Fed. High reserves = ample liquidity = supportive for risk assets. Watch for reserves falling sharply as a potential stress signal.'},
    {h:'Weekly change',t:'Week-over-week change in total assets. Positive = liquidity added. Negative = QT drain. Large swings can move risk assets directly.'},
    {h:'How to use it',t:'Expanding balance sheet is a liquidity tailwind for equities and NQ. Contracting is a headwind. Stack with CTA: crowded longs + QT drain = double headwind. Crowded shorts + expansion = potential squeeze setup.'},
  ]}
};

function InfoModal({type,origin,onClose}){
  const info=INFO[type];if(!info)return null;
  const ox=origin?`${origin.x}px`:'50%';
  const oy=origin?`${origin.y}px`:'50%';
  return(
    <div style={{position:'fixed',inset:0,zIndex:200,overflow:'hidden'}} onClick={onClose}>
      <style>{`
        @keyframes blobExpand{
          0%{clip-path:circle(24px at ${ox} ${oy});opacity:0.6}
          40%{opacity:1}
          100%{clip-path:circle(200% at ${ox} ${oy});opacity:1}
        }
        @keyframes contentIn{
          0%{opacity:0;transform:translateY(8px)}
          60%{opacity:0}
          100%{opacity:1;transform:translateY(0)}
        }
        .blob-bg{animation:blobExpand 0.55s cubic-bezier(0.4,0,0.2,1) forwards}
        .blob-content{animation:contentIn 0.55s cubic-bezier(0.4,0,0.2,1) forwards}
      `}</style>
      <div className="blob-bg" style={{position:'absolute',inset:0,background:'rgba(7,7,7,0.97)',backdropFilter:'blur(8px)'}}/>
      <div className="blob-content" style={{position:'absolute',inset:0,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:60,overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{maxWidth:520,width:'90%',marginBottom:60}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
            <span style={{fontFamily:'monospace',fontSize:11,color:'#555',letterSpacing:'0.12em',textTransform:'uppercase'}}>{info.title}</span>
            <button onClick={onClose} style={{background:'none',border:'none',color:'#333',fontSize:20,cursor:'pointer',lineHeight:1,fontFamily:'monospace'}}>×</button>
          </div>
          {info.sections.map(({h,t})=>(
            <div key={h} style={{marginBottom:24}}>
              <div style={{fontFamily:'monospace',fontSize:10,color:'#333',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8}}>{h}</div>
              <div style={{fontSize:13,color:'#555',lineHeight:1.9,fontFamily:"-apple-system,'Inter',sans-serif"}}>{t}</div>
            </div>
          ))}
          <div style={{marginTop:32,paddingTop:16,borderTop:'1px solid #111'}}>
            <button onClick={onClose} style={{background:'none',border:'1px solid #1e1e1e',color:'#333',padding:'6px 16px',fontFamily:'monospace',fontSize:10,cursor:'pointer',letterSpacing:'0.06em'}}>← close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ln(){return <div style={{height:'1px',background:'#111',margin:'22px 0'}}/>;}

function DataRow({label,value,sub,subColor}){
  return(
    <div style={{display:'flex',alignItems:'baseline',marginBottom:7}}>
      <span style={{fontFamily:'monospace',fontSize:11,color:'#2d2d2d',minWidth:140,letterSpacing:'0.02em'}}>{label}</span>
      <span style={{fontFamily:'monospace',fontSize:14,color:'#bbb',fontWeight:500,minWidth:110,textAlign:'right'}}>{value}</span>
      {sub!=null&&<span style={{fontFamily:'monospace',fontSize:11,color:subColor??'#3a3a3a',marginLeft:16}}>{sub}</span>}
    </div>
  );
}

function SHead({children,badge,right,info,onInfo}){
  const bc=badge==='LONG'||badge==='EXPANDING'?'#22c55e':badge==='SHORT'||badge==='CONTRACTING'?'#ef4444':'#555';
  return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:6}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontFamily:'monospace',fontSize:10,color:'#383838',textTransform:'uppercase',letterSpacing:'0.14em',fontWeight:700}}>{children}</span>
        {badge&&<span style={{fontFamily:'monospace',fontSize:10,color:bc,letterSpacing:'0.06em',fontWeight:700}}>{badge}</span>}
        {info&&(
          <button
            onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();onInfo(info,{x:r.left+r.width/2,y:r.top+r.height/2});}}
            style={{background:'none',border:'none',color:'#282828',fontSize:10,fontFamily:'monospace',cursor:'pointer',padding:0,letterSpacing:'0.04em',textDecoration:'underline',textUnderlineOffset:3,transition:'color 0.2s'}}
            onMouseEnter={e=>e.target.style.color='#555'}
            onMouseLeave={e=>e.target.style.color='#282828'}
          >what is this</button>
        )}
      </div>
      {right&&<span style={{fontFamily:'monospace',fontSize:10,color:'#1e1e1e'}}>{right}</span>}
    </div>
  );
}

function PctBar({p}){
  if(p==null)return null;
  const c=p>70?'#22c55e':p<30?'#ef4444':'#555';
  const label=p>70?'crowded long':p<30?'crowded short':'neutral';
  return(
    <div style={{display:'flex',alignItems:'center',marginBottom:7}}>
      <span style={{fontFamily:'monospace',fontSize:11,color:'#2d2d2d',minWidth:140,letterSpacing:'0.02em'}}>52w percentile</span>
      <div style={{width:90,height:2,background:'#181818',flexShrink:0}}>
        <div style={{width:`${p}%`,height:'100%',background:c,transition:'width 0.6s ease'}}/>
      </div>
      <span style={{fontFamily:'monospace',fontSize:11,color:c,marginLeft:12,minWidth:34}}>{p}th</span>
      <span style={{fontFamily:'monospace',fontSize:10,color:'#222',marginLeft:10}}>{label}</span>
    </div>
  );
}

// ── right panel ───────────────────────────────────────────────────────────────
function RightPanel({cot,fed,market,bias}){
  const biasC=bias==='LONG'?'#22c55e':bias==='SHORT'?'#ef4444':'#555';
  const dot=(ok)=><span style={{color:ok?'#22c55e':'#333',marginRight:6}}>●</span>;
  return(
    <div style={{width:160,flexShrink:0,paddingTop:2}}>

      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'monospace',fontSize:9,color:'#222',textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:12}}>Next releases</div>
        <div style={{marginBottom:8}}>
          <div style={{fontFamily:'monospace',fontSize:10,color:'#2a2a2a',marginBottom:3}}>COT report</div>
          <div style={{fontFamily:'monospace',fontSize:11,color:'#444'}}>{nextWeekday(5)}</div>
        </div>
        <div>
          <div style={{fontFamily:'monospace',fontSize:10,color:'#2a2a2a',marginBottom:3}}>Fed H.4.1</div>
          <div style={{fontFamily:'monospace',fontSize:11,color:'#444'}}>{nextWeekday(4)}</div>
        </div>
      </div>

      <div style={{height:1,background:'#111',marginBottom:20}}/>

      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'monospace',fontSize:9,color:'#222',textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:12}}>Data status</div>
        <div style={{fontFamily:'monospace',fontSize:10,color:'#333',lineHeight:2}}>
          <div>{dot(market?.nq)}market</div>
          <div>{dot(cot)}cot · {cot?cot.date:'—'}</div>
          <div>{dot(fed)}fed · {fed?fed.date:'—'}</div>
        </div>
      </div>

      <div style={{height:1,background:'#111',marginBottom:20}}/>

      <div>
        <div style={{fontFamily:'monospace',fontSize:9,color:'#222',textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:12}}>Summary</div>
        <div style={{marginBottom:8}}>
          <div style={{fontFamily:'monospace',fontSize:9,color:'#222',marginBottom:3}}>bias</div>
          <div style={{fontFamily:'monospace',fontSize:13,fontWeight:700,color:biasC}}>{bias??'—'}</div>
        </div>
        {cot&&<div style={{marginBottom:8}}>
          <div style={{fontFamily:'monospace',fontSize:9,color:'#222',marginBottom:3}}>cta</div>
          <div style={{fontFamily:'monospace',fontSize:11,color:cot.direction==='LONG'?'#22c55e':'#ef4444'}}>{cot.direction} · {cot.percentile}th</div>
        </div>}
        {fed&&<div style={{marginBottom:8}}>
          <div style={{fontFamily:'monospace',fontSize:9,color:'#222',marginBottom:3}}>fed</div>
          <div style={{fontFamily:'monospace',fontSize:11,color:col(fed.weeklyChange)}}>{fed.weeklyChange>=0?'+':''}{fed.weeklyChange}B w/w</div>
        </div>}
        {market?.vix&&<div>
          <div style={{fontFamily:'monospace',fontSize:9,color:'#222',marginBottom:3}}>vix</div>
          <div style={{fontFamily:'monospace',fontSize:11,color:market.vix.price>25?'#ef4444':market.vix.price<14?'#22c55e':'#555'}}>{num(market.vix.price,2)}</div>
        </div>}
      </div>

    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function Page(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [ts,setTs]=useState(null);
  const [modal,setModal]=useState(null); // {type, origin}
  const [ready,setReady]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{const res=await fetch('/api/data');setData(await res.json());setTs(new Date().toISOString());}catch{}
    setLoading(false);
  },[]);

  useEffect(()=>{
    setTimeout(()=>setReady(true),300);
    load();
    const id=setInterval(load,60000);
    return()=>clearInterval(id);
  },[load]);

  const {market:m,cot,fed,brief,errors}=data??{};
  const bias=data?computeBias(cot,fed,m):null;

  return(
    <div style={{minHeight:'100vh',background:'#070707',color:'#ccc',fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif",paddingBottom:80}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .s0{animation:fadeUp 0.4s ease 0.05s both}
        .s1{animation:fadeUp 0.4s ease 0.15s both}
        .s2{animation:fadeUp 0.4s ease 0.25s both}
        .s3{animation:fadeUp 0.4s ease 0.35s both}
        .s4{animation:fadeUp 0.4s ease 0.45s both}
        .cursor{animation:blink 1s step-end infinite}
      `}</style>

      {modal&&<InfoModal type={modal.type} origin={modal.origin} onClose={()=>setModal(null)}/>}

      {/* topbar */}
      <div style={{borderBottom:'1px solid #0f0f0f',padding:'0 32px',height:42,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#070707',zIndex:10}}>
        <span style={{fontFamily:'monospace',fontSize:14,fontWeight:700,color:'#ddd',letterSpacing:'-0.01em'}}>
          y<sup style={{fontSize:9,verticalAlign:'super'}}>3</sup>
        </span>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {ts&&<span style={{fontFamily:'monospace',fontSize:10,color:'#1e1e1e'}}>{fmtTs(ts)}</span>}
          <button onClick={load} disabled={loading} style={{background:'none',border:'none',color:loading?'#1e1e1e':'#2e2e2e',fontFamily:'monospace',fontSize:10,cursor:'pointer',letterSpacing:'0.06em',padding:0,transition:'color 0.2s'}}
            onMouseEnter={e=>!loading&&(e.target.style.color='#555')}
            onMouseLeave={e=>e.target.style.color=loading?'#1e1e1e':'#2e2e2e'}
          >{loading?'loading...':'↻ refresh'}</button>
        </div>
      </div>

      {/* main layout */}
      <div style={{maxWidth:920,margin:'0 auto',padding:'32px 32px 0',opacity:ready?1:0,transition:'opacity 0.4s',display:'flex',gap:48,alignItems:'flex-start'}}>

        {/* left — content */}
        <div style={{flex:1,minWidth:0}}>

          <div className="s0">
            <SHead right={ts?fmtTs(ts):'—'}>Market</SHead>
            <DataRow label="nq futures" value={m?.nq?num(m.nq.price):'—'} sub={m?.nq?pct(m.nq.changePct):null} subColor={col(m?.nq?.change)}/>
            <DataRow label="spx"        value={m?.spx?num(m.spx.price):'—'} sub={m?.spx?pct(m.spx.changePct):null} subColor={col(m?.spx?.change)}/>
            <DataRow label="vix"        value={m?.vix?num(m.vix.price,2):'—'} sub={m?.vix?sgn(m.vix.change,2):null} subColor={col(m?.vix?.change,true)}/>
            <DataRow label="10y yield"  value={m?.tny?`${num(m.tny.price,2)}%`:'—'} sub={m?.tny?sgn(m.tny.change,2):null} subColor={col(m?.tny?.change,true)}/>
          </div>

          <Ln/>

          <div className="s1">
            <SHead badge={cot?.direction} right={cot?`COT ${cot.date} · ${cot.weeksOfData}w`:errors?.find(e=>e.startsWith('cot:'))??'—'} info="cta" onInfo={(t,o)=>setModal({type:t,origin:o})}>
              CTA proxy — CFTC COT
            </SHead>
            {cot?(
              <>
                <DataRow label="non-comm long"  value={num(cot.long)}  sub={`${sgn(cot.longChg)} w/w`}  subColor={col(cot.longChg)}/>
                <DataRow label="non-comm short" value={num(cot.short)} sub={`${sgn(cot.shortChg)} w/w`} subColor={col(cot.shortChg,true)}/>
                <DataRow label="net"            value={`${cot.net>=0?'+':''}${num(cot.net)}`} sub={`${sgn(cot.netChg)} w/w`} subColor={col(cot.netChg)}/>
                <DataRow label="open interest"  value={num(cot.oi)} sub={cot.specRatio!=null?`spec ${cot.specRatio}% of OI`:null} subColor="#252525"/>
                <div style={{height:6}}/>
                <PctBar p={cot.percentile}/>
              </>
            ):(
              <div style={{fontFamily:'monospace',fontSize:11,color:'#ef4444',marginBottom:8}}>{errors?.find(e=>e.startsWith('cot:'))??'unavailable'}</div>
            )}
          </div>

          <Ln/>

          <div className="s2">
            <SHead badge={fed?.qtStatus} right={fed?`FRED ${fed.date}`:'—'} info="fed" onInfo={(t,o)=>setModal({type:t,origin:o})}>
              Fed balance sheet — H.4.1
            </SHead>
            {fed?(
              <>
                <DataRow label="total assets"  value={bil(fed.totalAssets)}  sub={`${sgn(fed.weeklyChange)}B w/w`} subColor={col(fed.weeklyChange)}/>
                <DataRow label="reserves"      value={bil(fed.reserves)}/>
                <DataRow label="treasuries"    value={bil(fed.treasuries)}/>
                <DataRow label="mbs"           value={bil(fed.mbs)}/>
                <DataRow label="4-week change" value={`${sgn(fed.fourWeekChange)}B`} subColor={col(fed.fourWeekChange)} sub={fed.fourWeekChange<-20?'consistent drain':fed.fourWeekChange>20?'expanding':'flat'}/>
              </>
            ):(
              <div style={{fontFamily:'monospace',fontSize:11,color:'#2a2a2a',marginBottom:8}}>unavailable</div>
            )}
          </div>

          <Ln/>

          <div className="s3">
            <SHead>Brief</SHead>
            <div style={{fontFamily:'monospace',fontSize:12,color:'#363636',lineHeight:2,maxWidth:560}}>
              {loading&&!brief?<span>loading<span className="cursor">_</span></span>:brief||'—'}
            </div>
          </div>

          {errors?.length>0&&(
            <div className="s4" style={{marginTop:20,fontFamily:'monospace',fontSize:10,color:'#1e1e1e'}}>
              {errors.map((e,i)=><div key={i}>{e}</div>)}
            </div>
          )}
        </div>

        {/* right panel */}
        <div className="s0" style={{paddingTop:2}}>
          <RightPanel cot={cot} fed={fed} market={m} bias={bias}/>
        </div>

      </div>
    </div>
  );
}
