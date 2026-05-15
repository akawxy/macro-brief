'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

const num = (v,d=0) => v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const sgn = (v,d=0) => v==null?'—':`${v>0?'+':''}${num(v,d)}`;
const bil = (v) => v==null?'—':`$${num(v)}B`;
const pct = (v) => v==null?'—':`${v>0?'+':''}${Number(v).toFixed(2)}%`;
function fmtTs(iso){if(!iso)return'—';return new Date(iso).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'});}
const col=(v,inv=false)=>{if(v==null)return'#666';const up=inv?v<0:v>0;return up?'#4ade80':v===0?'#666':'#f87171';};

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
    {h:'What it is',t:'The CFTC Commitments of Traders report, published every Friday, shows how large speculative traders are positioned in NQ futures. This is the closest public proxy for CTA and systematic fund flow.'},
    {h:'Non-commercial long / short',t:'Contracts held by speculative participants on each side. When longs vastly exceed shorts, systematic funds are already deployed — less fuel for additional upside.'},
    {h:'Net position',t:'Long minus short. Positive = net long bias. Negative = net short. The key number — shows which direction the systematic community is leaning.'},
    {h:'52-week percentile',t:'Where current net stands vs the past year. Above 70th = crowded long, mean-reversion risk. Below 30th = crowded short, short-squeeze potential.'},
    {h:'Spec ratio',t:'Non-commercial contracts as % of total open interest. High = speculators dominate the book, moves get amplified.'},
    {h:'How to use it',t:'High percentile + net long: easy CTA bid already in, upside needs fresh catalysts. Low percentile + net short: selling may be exhausted, watch for squeeze. Week-on-week change shows if funds are adding or reducing now.'},
  ]},
  fed:{title:'Fed Balance Sheet — H.4.1',sections:[
    {h:'What it is',t:'The Federal Reserve H.4.1 report, released every Thursday ~4:30 PM ET, shows the full Fed balance sheet — what it owns and what banks hold there. A primary macro liquidity indicator.'},
    {h:'Total assets',t:'Aggregate size of the Fed balance sheet. Currently ~$6.7T, down from ~$9T peak in 2022. The direction of change matters more than the absolute level.'},
    {h:'QT — Quantitative Tightening',t:'Since June 2022 the Fed has been shrinking its balance sheet by letting bonds mature without reinvesting. This drains reserves from the banking system over time.'},
    {h:'Reserve balances',t:'Cash commercial banks park at the Fed. High reserves = ample liquidity = supportive for risk assets. Watch for sharp drops as a stress signal.'},
    {h:'Weekly change',t:'Week-over-week change in total assets. Positive = liquidity added. Negative = QT drain. Large swings can directly move risk assets.'},
    {h:'How to use it',t:'Expanding balance sheet = liquidity tailwind for NQ. Contracting = headwind. Stack with CTA: crowded longs + QT drain = double headwind. Crowded shorts + expansion = potential squeeze.'},
  ]}
};

// ── draggable popup ───────────────────────────────────────────────────────────
function InfoPopup({type,origin,onClose}){
  const info=INFO[type];
  const [pos,setPos]=useState(()=>{
    const w=380;
    let x=(origin?.x??400)-w/2;
    let y=(origin?.y??200)+20;
    if(typeof window!=='undefined'){
      x=Math.max(16,Math.min(window.innerWidth-w-16,x));
      y=Math.max(60,Math.min(window.innerHeight-480,y));
    }
    return{x,y};
  });
  const [dragging,setDragging]=useState(false);
  const [offset,setOffset]=useState({x:0,y:0});
  const [visible,setVisible]=useState(false);
  const popRef=useRef(null);

  useEffect(()=>{ setTimeout(()=>setVisible(true),20); },[]);

  useEffect(()=>{
    if(!dragging)return;
    const move=(e)=>{
      const cx=e.touches?e.touches[0].clientX:e.clientX;
      const cy=e.touches?e.touches[0].clientY:e.clientY;
      setPos({x:cx-offset.x,y:cy-offset.y});
    };
    const up=()=>setDragging(false);
    window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
    window.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',up);
    return()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);window.removeEventListener('touchmove',move);window.removeEventListener('touchend',up);};
  },[dragging,offset]);

  if(!info)return null;

  const onDragStart=(e)=>{
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    setDragging(true);
    setOffset({x:cx-pos.x,y:cy-pos.y});
    e.preventDefault();
  };

  return(
    <div ref={popRef} style={{
      position:'fixed',left:pos.x,top:pos.y,width:380,zIndex:300,
      background:'#141414',border:'1px solid #2a2a2a',
      boxShadow:'0 24px 60px rgba(0,0,0,0.8)',
      transform:visible?'scale(1)':'scale(0.85)',
      opacity:visible?1:0,
      transformOrigin:`${origin?.x-pos.x}px ${origin?.y-pos.y}px`,
      transition:'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
    }}>
      {/* drag handle */}
      <div
        onMouseDown={onDragStart} onTouchStart={onDragStart}
        style={{padding:'10px 14px',borderBottom:'1px solid #222',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:dragging?'grabbing':'grab',userSelect:'none'}}
      >
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{display:'flex',gap:3}}>
            <div style={{width:3,height:3,background:'#333',borderRadius:1}}/>
            <div style={{width:3,height:3,background:'#333',borderRadius:1}}/>
            <div style={{width:3,height:3,background:'#333',borderRadius:1}}/>
          </div>
          <span style={{fontFamily:'monospace',fontSize:10,color:'#555',textTransform:'uppercase',letterSpacing:'0.1em'}}>{info.title}</span>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#444',fontSize:16,cursor:'pointer',lineHeight:1,padding:'0 2px',fontFamily:'monospace'}}>×</button>
      </div>
      {/* content */}
      <div style={{padding:'16px',maxHeight:'70vh',overflowY:'auto'}}>
        {info.sections.map(({h,t})=>(
          <div key={h} style={{marginBottom:18}}>
            <div style={{fontFamily:'monospace',fontSize:9,color:'#444',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6}}>{h}</div>
            <div style={{fontSize:12,color:'#666',lineHeight:1.85,fontFamily:"-apple-system,'Inter',sans-serif"}}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ln(){return <div style={{height:'1px',background:'#1c1c1c',margin:'20px 0'}}/>;}

function DataRow({label,value,sub,subColor}){
  return(
    <div style={{display:'flex',alignItems:'baseline',marginBottom:8}}>
      <span style={{fontFamily:'monospace',fontSize:11,color:'#555',minWidth:140,letterSpacing:'0.02em'}}>{label}</span>
      <span style={{fontFamily:'monospace',fontSize:15,color:'#d8d8d8',fontWeight:500,minWidth:110,textAlign:'right'}}>{value}</span>
      {sub!=null&&<span style={{fontFamily:'monospace',fontSize:11,color:subColor??'#555',marginLeft:14}}>{sub}</span>}
    </div>
  );
}

function SHead({children,badge,right,info,onInfo,sourceUrl}){
  const bc=badge==='LONG'||badge==='EXPANDING'?'#4ade80':badge==='SHORT'||badge==='CONTRACTING'?'#f87171':'#666';
  return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:6}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontFamily:'monospace',fontSize:10,color:'#555',textTransform:'uppercase',letterSpacing:'0.14em',fontWeight:600}}>{children}</span>
        {badge&&<span style={{fontFamily:'monospace',fontSize:10,color:bc,letterSpacing:'0.06em',fontWeight:700}}>{badge}</span>}
        {info&&(
          <button
            onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();onInfo(info,{x:r.left+r.width/2,y:r.top+r.height/2});}}
            style={{background:'none',border:'none',color:'#383838',fontSize:10,fontFamily:'monospace',cursor:'pointer',padding:0,letterSpacing:'0.04em',textDecoration:'underline',textUnderlineOffset:3,transition:'color 0.15s'}}
            onMouseEnter={e=>e.target.style.color='#777'}
            onMouseLeave={e=>e.target.style.color='#383838'}
          >what is this</button>
        )}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        {right&&<span style={{fontFamily:'monospace',fontSize:10,color:'#333'}}>{right}</span>}
        {sourceUrl&&(
          <a href={sourceUrl} target="_blank" rel="noreferrer"
            style={{fontFamily:'monospace',fontSize:10,color:'#383838',textDecoration:'none',letterSpacing:'0.04em',transition:'color 0.15s',display:'flex',alignItems:'center',gap:3}}
            onMouseEnter={e=>e.currentTarget.style.color='#888'}
            onMouseLeave={e=>e.currentTarget.style.color='#383838'}
          >source ↗</a>
        )}
      </div>
    </div>
  );
}

function PctBar({p}){
  if(p==null)return null;
  const c=p>70?'#4ade80':p<30?'#f87171':'#666';
  const label=p>70?'crowded long':p<30?'crowded short':'neutral';
  return(
    <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
      <span style={{fontFamily:'monospace',fontSize:11,color:'#555',minWidth:140,letterSpacing:'0.02em'}}>52w percentile</span>
      <div style={{width:90,height:2,background:'#222',flexShrink:0}}>
        <div style={{width:`${p}%`,height:'100%',background:c,transition:'width 0.6s ease'}}/>
      </div>
      <span style={{fontFamily:'monospace',fontSize:11,color:c,marginLeft:12,minWidth:34}}>{p}th</span>
      <span style={{fontFamily:'monospace',fontSize:10,color:'#444',marginLeft:10}}>{label}</span>
    </div>
  );
}

function RightPanel({cot,fed,market,bias}){
  const bc=bias==='LONG'?'#4ade80':bias==='SHORT'?'#f87171':'#777';
  const dot=(ok)=><span style={{color:ok?'#4ade80':'#2a2a2a',marginRight:6,fontSize:9}}>●</span>;
  const row=(label,val,vc='#555')=>(
    <div style={{marginBottom:10}}>
      <div style={{fontFamily:'monospace',fontSize:9,color:'#383838',marginBottom:2,letterSpacing:'0.06em'}}>{label}</div>
      <div style={{fontFamily:'monospace',fontSize:11,color:vc}}>{val}</div>
    </div>
  );
  return(
    <div style={{width:156,flexShrink:0,paddingTop:2}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'monospace',fontSize:9,color:'#383838',textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:12}}>Next releases</div>
        {row('COT report',nextWeekday(5),'#666')}
        {row('Fed H.4.1',nextWeekday(4),'#666')}
      </div>
      <div style={{height:1,background:'#1c1c1c',marginBottom:20}}/>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'monospace',fontSize:9,color:'#383838',textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:12}}>Data status</div>
        <div style={{fontFamily:'monospace',fontSize:10,color:'#4a4a4a',lineHeight:2.2}}>
          <div>{dot(market?.nq)}market</div>
          <div>{dot(cot)}cot {cot?cot.date:''}</div>
          <div>{dot(fed)}fed {fed?fed.date:''}</div>
        </div>
      </div>
      <div style={{height:1,background:'#1c1c1c',marginBottom:20}}/>
      <div>
        <div style={{fontFamily:'monospace',fontSize:9,color:'#383838',textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:12}}>Summary</div>
        <div style={{marginBottom:10}}>
          <div style={{fontFamily:'monospace',fontSize:9,color:'#383838',marginBottom:3}}>bias</div>
          <div style={{fontFamily:'monospace',fontSize:14,fontWeight:700,color:bc}}>{bias??'—'}</div>
        </div>
        {cot&&row('cta',`${cot.direction} · ${cot.percentile}th`,cot.direction==='LONG'?'#4ade80':'#f87171')}
        {fed&&row('fed',`${sgn(fed.weeklyChange)}B w/w`,col(fed.weeklyChange))}
        {market?.vix&&row('vix',num(market.vix.price,2),market.vix.price>25?'#f87171':market.vix.price<14?'#4ade80':'#777')}
      </div>
    </div>
  );
}

export default function Page(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [ts,setTs]=useState(null);
  const [popup,setPopup]=useState(null);
  const [ready,setReady]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{const res=await fetch('/api/data');setData(await res.json());setTs(new Date().toISOString());}catch{}
    setLoading(false);
  },[]);

  useEffect(()=>{
    setTimeout(()=>setReady(true),250);
    load();
    const id=setInterval(load,60000);
    return()=>clearInterval(id);
  },[load]);

  const {market:m,cot,fed,brief,errors}=data??{};
  const bias=data?computeBias(cot,fed,m):null;
  const biasC=bias==='LONG'?'#4ade80':bias==='SHORT'?'#f87171':'#888';

  return(
    <div style={{minHeight:'100vh',background:'#0c0c0c',color:'#d0d0d0',fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif",paddingBottom:80}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .s0{animation:fadeUp 0.4s ease 0.05s both}.s1{animation:fadeUp 0.4s ease 0.15s both}
        .s2{animation:fadeUp 0.4s ease 0.25s both}.s3{animation:fadeUp 0.4s ease 0.35s both}
        .s4{animation:fadeUp 0.4s ease 0.45s both}
        .cursor{animation:blink 1s step-end infinite}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
      `}</style>

      {popup&&<InfoPopup type={popup.type} origin={popup.origin} onClose={()=>setPopup(null)}/>}

      {/* topbar */}
      <div style={{borderBottom:'1px solid #181818',padding:'0 32px',height:42,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#0c0c0c',zIndex:10}}>
        <span style={{fontFamily:'monospace',fontSize:14,fontWeight:700,color:'#e0e0e0',letterSpacing:'-0.01em'}}>
          y<sup style={{fontSize:9,verticalAlign:'super'}}>3</sup>
        </span>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {ts&&<span style={{fontFamily:'monospace',fontSize:10,color:'#333'}}>{fmtTs(ts)}</span>}
          <button onClick={load} disabled={loading}
            style={{background:'none',border:'none',color:'#444',fontFamily:'monospace',fontSize:10,cursor:'pointer',letterSpacing:'0.06em',padding:0,transition:'color 0.15s'}}
            onMouseEnter={e=>!loading&&(e.target.style.color='#888')}
            onMouseLeave={e=>e.target.style.color='#444'}
          >{loading?<>loading<span className="cursor">_</span></>:'↻ refresh'}</button>
        </div>
      </div>

      <div style={{maxWidth:920,margin:'0 auto',padding:'32px 32px 0',opacity:ready?1:0,transition:'opacity 0.35s',display:'flex',gap:52,alignItems:'flex-start'}}>

        {/* left */}
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
            <SHead badge={cot?.direction} right={cot?`COT ${cot.date} · ${cot.weeksOfData}w`:errors?.find(e=>e.startsWith('cot:'))??'—'} info="cta" onInfo={(t,o)=>setPopup({type:t,origin:o})} sourceUrl="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm">
              CTA proxy — CFTC COT
            </SHead>
            {cot?(
              <>
                <DataRow label="non-comm long"  value={num(cot.long)}  sub={`${sgn(cot.longChg)} w/w`}  subColor={col(cot.longChg)}/>
                <DataRow label="non-comm short" value={num(cot.short)} sub={`${sgn(cot.shortChg)} w/w`} subColor={col(cot.shortChg,true)}/>
                <DataRow label="net"            value={`${cot.net>=0?'+':''}${num(cot.net)}`} sub={`${sgn(cot.netChg)} w/w`} subColor={col(cot.netChg)}/>
                <DataRow label="open interest"  value={num(cot.oi)} sub={cot.specRatio!=null?`spec ${cot.specRatio}% of OI`:null} subColor="#555"/>
                <div style={{height:6}}/>
                <PctBar p={cot.percentile}/>
              </>
            ):(
              <div style={{fontFamily:'monospace',fontSize:11,color:'#f87171',marginBottom:8}}>{errors?.find(e=>e.startsWith('cot:'))??'unavailable'}</div>
            )}
          </div>

          <Ln/>

          <div className="s2">
            <SHead badge={fed?.qtStatus} right={fed?`FRED ${fed.date}`:'—'} info="fed" onInfo={(t,o)=>setPopup({type:t,origin:o})} sourceUrl="https://www.federalreserve.gov/releases/h41/current/">
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
              <div style={{fontFamily:'monospace',fontSize:11,color:'#444',marginBottom:8}}>unavailable</div>
            )}
          </div>

          <Ln/>

          <div className="s3">
            <SHead>Brief</SHead>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <span style={{fontFamily:'monospace',fontSize:9,color:'#383838',textTransform:'uppercase',letterSpacing:'0.1em'}}>bias</span>
              <span style={{fontFamily:'monospace',fontSize:12,color:biasC,fontWeight:700,letterSpacing:'0.08em'}}>{bias??'—'}</span>
            </div>
            <div style={{fontFamily:'monospace',fontSize:12,color:'#555',lineHeight:2,maxWidth:540}}>
              {loading&&!brief?<span>loading<span className="cursor">_</span></span>:brief||'—'}
            </div>
          </div>

          {errors?.length>0&&(
            <div className="s4" style={{marginTop:16,fontFamily:'monospace',fontSize:10,color:'#2a2a2a'}}>
              {errors.map((e,i)=><div key={i}>{e}</div>)}
            </div>
          )}
        </div>

        {/* right */}
        <div className="s0">
          <RightPanel cot={cot} fed={fed} market={m} bias={bias}/>
        </div>

      </div>
    </div>
  );
}
