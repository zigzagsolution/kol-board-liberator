/* KOL Approval Board — หน้าเว็บ (GitHub Pages) · หลังบ้าน = Google Apps Script (server.js) */
(function(){
const TIERS=[
  {k:"mega", n:"Mega", d:"1M+", min:1e6, c:"var(--h5)"},
  {k:"macro",n:"Macro",d:"100K–999K", min:1e5, c:"var(--h4)"},
  {k:"mid",  n:"Mid", d:"50K–99K", min:5e4, c:"var(--h3)"},
  {k:"micro",n:"Micro",d:"10K–49K", min:1e4, c:"var(--h2)"},
  {k:"nano", n:"Nano", d:"<10K", min:0, c:"var(--h1)"},
];
const $=s=>document.querySelector(s);
/* ===== API: คุยกับ Apps Script (ตั้งค่า URL ใน config.js) ===== */
const APP_URL=(window.KOL_CONFIG&&window.KOL_CONFIG.APP_URL)||"";
const CFG=window.KOL_CONFIG||{};
const TARGET=Number(CFG.TARGET)||50;
const PHASES=CFG.PHASES||[{n:"1",title:"ระยะ 1",d:"",from:0,to:6,c:"#8a8fa8",goal:"",brief:""},{n:"2",title:"ระยะ 2",d:"",from:7,to:13,c:"#3fa3ff",goal:"",brief:""},{n:"3",title:"ระยะ 3",d:"",from:14,to:20,c:"#0A5BFF",goal:"",brief:""}];
const NP=PHASES.length;
const HASHTAGS=CFG.HASHTAGS||"";
const KOL_REACH_TARGET=Number(CFG.REACH_TARGET)||0, KOL_VISIT_TARGET=Number(CFG.VISIT_TARGET)||0;
const TOR_MICRO_MIN=Number(CFG.TOR_MICRO_MIN)||0, TOR_NANO_MIN=Number(CFG.TOR_NANO_MIN)||0;
const torTier=d=>(d.f||0)>=5000?"micro":(d.f||0)>=1000?"nano":"below";
function api(name,args){ if(!APP_URL) return Promise.reject(new Error("ยังไม่ได้ตั้งค่า APP_URL ใน config.js"));
  args=(args||[]).map((a,i)=>(i===0&&a&&typeof a==="object"&&!Array.isArray(a))?Object.assign({_vid:(typeof VID!=="undefined"?VID:"")},a):a); if(!args.length) args=[{_vid:(typeof VID!=="undefined"?VID:"")}];
  return fetch(APP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({name,args}),redirect:"follow"})
    .then(r=>r.json()).then(j=>{ if(j&&j.error) throw new Error(j.error); return j&&("result" in j)?j.result:j; }); }

function parseCSV(t){const rows=[];let row=[],f="",q=false;for(let i=0;i<t.length;i++){const c=t[i];
  if(q){ if(c==='"'){ if(t[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
  else if(c==='"') q=true; else if(c===','){row.push(f);f="";} else if(c==='\n'){row.push(f);rows.push(row);row=[];f="";} else if(c==='\r'){} else f+=c; }
  row.push(f); if(row.some(x=>x!=="")) rows.push(row); return rows;}
function num(s){ if(!s) return null; s=String(s).replace(/ผู้ติดตาม/g,"").trim(); const m=s.match(/([\d.,]+)\s*([KkMm]?)/); if(!m) return null;
  let v=parseFloat(m[1].replace(/,/g,"")); if(isNaN(v)) return null; if(/m/i.test(m[2])) v*=1e6; else if(/k/i.test(m[2])) v*=1e3; return Math.round(v); }
function tierOf(f){ if(f==null) return "nano"; for(const t of TIERS) if(f>=t.min) return t.k; return "nano"; }
function linkOf(s){ s=(s||"").trim(); if(/^https?:\/\//.test(s)) return s; const m=s.match(/@([\w.\-]+)/); return m?("https://www.tiktok.com/@"+m[1]):""; }
function hash(str){ let h=5381; for(let i=0;i<str.length;i++) h=((h<<5)+h+str.charCodeAt(i))|0; return (h>>>0).toString(36); }
function parseRows(csv){
  const rows=parseCSV(csv); const out=[]; let group="", col=null, codeCol=null;
  for(const r of rows){ const a=(r[0]||"").trim();
    if(codeCol==null){ r.forEach((h,i)=>{ if(/^\s*(code|รหัส)\s*$/i.test(h||"")) codeCol=i; }); }
    if(a==="ลำดับ"){ col={}; r.forEach((h,i)=>{h=(h||"").trim(); if(/ชื่อ/.test(h))col.name=i; else if(/หมวด/.test(h))col.cat=i; else if(/ติดตาม/.test(h))col.f=i; else if(/ลิ้?งก์|link/i.test(h)){col.link=i;} else if(/หมายเหตุ/.test(h))col.note=i; else if(/rate|เรท/i.test(h))col.rate=i; else if(/^code$|รหัส/i.test(h))col.code=i;}); if(col.code==null&&codeCol!=null) col.code=codeCol; continue; }
    if(!col) continue;
    if(a && !/^\d+$/.test(a) && !(r[1]||"").trim()){ group=a; continue; }
    if(!/^\d+$/.test(a)) continue;
    const g=i=>i==null?"":(r[i]||"");
    const name=g(col.name).replace(/\s+/g," ").trim(); if(!name) continue;
    /* ลิงก์: คอลัมน์ "ลิ้งก์ช่อง" + คอลัมน์ย่อยถัดไป (Facebook / TikTok / YouTube…) จนถึง "หมายเหตุ" — ใช้ TikTok ก่อน แล้ว FB แล้ว YouTube */
    const lend=col.note!=null&&col.note>col.link?col.note:r.length; const links=[]; for(let i=col.link;i<lend;i++){ const v=g(i).trim(); if(/^https?:/.test(v)) links.push(v); }
    const link=links.find(v=>/tiktok/i.test(v))||links.find(v=>/facebook|fb\.com/i.test(v))||links[0]||g(col.link).trim();
    const it={idx:+a, group, name, cat:g(col.cat).replace(/\s+/g," ").trim(), fRaw:g(col.f).trim(), link, links, note:g(col.note).trim(), code:g(col.code).replace(/[^A-Za-z0-9ก-๙_\-]/g,"").replace(/^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]+/,"").trim().toUpperCase()};
    it.f=num(it.fRaw); it.tier=tierOf(it.f); it.url=linkOf(it.link); it.artist=/ศิลปิน/.test(group); it.key=it.name.toLowerCase();
    it.h=hash([it.cat,it.fRaw,it.link,it.note,it.code].join("|")); out.push(it);
  } return out;
}
const fmtN=n=>n==null?"—":n>=1e6?(n/1e6).toFixed(n%1e6?1:0)+"M":n>=1e3?(n/1e3).toFixed(n%1e3&&n<1e4?1:0)+"K":String(n);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

let data=[], baseline=null, filterTier="", q="", scale="sqrt", filterRv="", filterCode="", reviews={}, canWrite=true, reviewer="";
/* รูปโปรไฟล์: avatars/map.json (ชื่อ→ไฟล์) โหลดครั้งเดียว */
let AV={}; fetch("avatars/map.json?v="+Date.now()).then(r=>r.json()).then(m=>{ AV=m||{}; render(); }).catch(()=>{});
const normName=s=>String(s||"").normalize("NFC").toLowerCase().replace(/[^a-z0-9ก-๙]/g,"");
function avatarEl(d){ const f=AV[normName(d.name)]; const ini=esc(String(d.name||"?").trim().replace(/^[^a-zA-Zก-๙0-9]+/,"").slice(0,1).toUpperCase()||"?");
  return f?`<div class="av"><img src="avatars/${f}" alt="" loading="lazy" width="40" height="40"></div>`:`<div class="av av-txt">${ini}</div>`; }
const avSrc=d=>{ const f=AV[normName(d.name)]; return f?"avatars/"+f:""; };
const iniOf=d=>esc(String(d.name||"?").trim().replace(/^[^a-zA-Zก-๙0-9]+/,"").slice(0,1).toUpperCase()||"?");
let POSTS={}; /* key = rid_day → {format,brief,status,link,by} */
const STATUS=[["plan","วางแผน"],["brief","บรีฟแล้ว"],["draft","ส่งดราฟต์"],["done","โพสต์แล้ว"]];
const FORMATS=["คลิปสั้น (TikTok/Reels)","Vlog","ไลฟ์","โพสต์ภาพ/แคโรเซล","สตอรี่"];
const datesOf=d=>{ const r=reviews[rid(d)]; return String(r&&r.dates||"").split(",").map(s=>s.trim()).filter(s=>s!=="").map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<DAYS); };
const phasesOf=d=>{ const r=reviews[rid(d)]; return String(r&&r.phase||"").split(",").map(s=>s.trim()).filter(Boolean); };
/* ป้าย Code ที่แสดงบนหน้า: ชื่อที่โชว์ (ค่าว่าง = ไม่โชว์) */
const CODE_LABEL={ PANU:"P'PANU Recommend", BEE:"MiDi", "":"MiDi" };
const codeLabel=c=>{ c=c||""; return c in CODE_LABEL?CODE_LABEL[c]:c; };
const codeSoft=c=>!c||c==="BEE";
let REASONS=["ไม่ตรงสาย / กลุ่มเป้าหมาย","ภาพลักษณ์ยังไม่เหมาะ","ยอดผู้ติดตามน้อยเกินไป","คอนเทนต์ไม่น่าสนใจ","เคยรับงานแล้วทิ้ง"];
let history={};
const rid=d=>"r_"+hash(d.key);
const rvOf=d=>(reviews[rid(d)]&&reviews[rid(d)].status)||"";
const inTeam=d=>rvOf(d)!=="fail";
function teamList(sorted){ const all=sorted.filter(inTeam); const ranked=[...all.filter(d=>rvOf(d)==="pass"),...all.filter(d=>rvOf(d)!=="pass")]; const pick=new Set(ranked.slice(0,TARGET)); const byReach=(a,b)=>(b.f||0)-(a.f||0); return {all,team:all.filter(d=>pick.has(d)).sort(byReach),spare:all.filter(d=>!pick.has(d)).sort(byReach)}; }
try{ const s=JSON.parse(localStorage.getItem("kol_ladder_seen")||"null"); if(s&&typeof s==="object") baseline=s; }catch(e){}
try{ reviewer=localStorage.getItem("kol_reviewer")||""; }catch(e){}
const statusOf=d=>!baseline?"":!(d.key in baseline)?"new":baseline[d.key]!==d.h?"changed":"";

/* heat ramp: 6 stops on a log scale 1K → 3M */
const STOPS=["--h0","--h1","--h2","--h3","--h4","--h5"];
function heat(f){ if(!f) return `var(--h0)`; const t=Math.max(0,Math.min(1,(Math.log10(f)-3)/(Math.log10(3e6)-3))); const p=t*(STOPS.length-1); const i=Math.floor(p), k=Math.round((p-i)*100);
  if(i>=STOPS.length-1) return `var(${STOPS[STOPS.length-1]})`; return `color-mix(in oklab, var(${STOPS[i+1]}) ${k}%, var(${STOPS[i]}))`; }
function widthOf(f,max){ if(!f) return 0; if(scale==="linear") return f/max; if(scale==="log") return Math.log10(Math.max(f,1))/Math.log10(max); return Math.sqrt(f/max); }

function render(){
  const sorted=[...data].sort((a,b)=>(b.f||0)-(a.f||0)||a.idx-b.idx);
  const max=Math.max(...sorted.map(d=>d.f||0),1), reach=sorted.reduce((s,d)=>s+(d.f||0),0), upd=data.filter(statusOf);
  $("#k-n").textContent=data.length; $("#k-reach").textContent=fmtN(reach);
  const np=data.filter(d=>rvOf(d)==="pass").length, nf=data.filter(d=>rvOf(d)==="fail").length, nw=data.length-np-nf;
  $("#k-pass").textContent=np; $("#k-fail").textContent=nf;
  $("#rev-l").textContent=`อยู่ในทีม ${data.length-nf} คน · ยืนยันแล้ว ${np} · ยังไม่ได้ดู ${nw} · ตัดออก ${nf}`+(upd.length?` · อัปเดตใหม่ ${upd.length}`:"");
  $("#rvchips").innerHTML=[["","ทั้งหมด",data.length],["pass","ยืนยันแล้ว",np],["fail","ตัดออก",nf],["wait","ยังไม่ได้ดู",nw]].map(([k,l,n])=>`<button type="button" class="chip${filterRv===k?" active":""}" data-k="${k}">${l} <b>${n}</b></button>`).join("");
  $("#rvchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{filterRv=b.dataset.k;logEv("filter","rv:"+(b.dataset.k||"all"));render();});
  const codeKey=d=>codeSoft(d.code)?"MIDI":d.code; const codes=[...new Set(data.map(codeKey))].sort((a,b)=>a==="MIDI"?1:b==="MIDI"?-1:a.localeCompare(b)); const cc=$("#codechips"); cc.hidden=codes.length<2;
  cc.innerHTML=[["*","ทั้งหมด",data.length]].concat(codes.map(c=>[c,c==="MIDI"?"MiDi แนะนำ":codeLabel(c),data.filter(d=>codeKey(d)===c).length])).map(([k,l,n])=>`<button type="button" class="chip code${(filterCode||"*")===k?" active":""}${k==="MIDI"?" soft":""}" data-k="${esc(k)}">${esc(l)} <b>${n}</b></button>`).join("");
  cc.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{filterCode=b.dataset.k==="*"?"":b.dataset.k;logEv("filter","code:"+(filterCode||"all"));render();});
  // share by tier
  const sh=$("#share"); sh.innerHTML=""; const lbl=[];
  TIERS.forEach(t=>{ const g=sorted.filter(d=>d.tier===t.k), r=g.reduce((s,d)=>s+(d.f||0),0); if(!r) return;
    const sp=document.createElement("span"); sp.style.width=(r/reach*100)+"%"; sp.style.background=t.c; sp.title=`${t.n} ${fmtN(r)}`; sh.appendChild(sp); lbl.push(`${t.n} ${Math.round(r/reach*100)}%`); });
  $("#share-l").textContent="สัดส่วน reach: "+lbl.join(" · ");
  // histogram
  const hist=$("#hist"); hist.innerHTML=""; const maxC=Math.max(...TIERS.map(t=>sorted.filter(d=>d.tier===t.k).length),1);
  TIERS.forEach(t=>{ const n=sorted.filter(d=>d.tier===t.k).length; const b=document.createElement("button"); b.type="button"; b.className="hb"+(filterTier===t.k?" active":"");
    b.innerHTML=`<span class="n">${n}</span><div class="bar" style="height:${Math.max(4,n/maxC*70)}px;background:${t.c}"></div><span class="t">${t.n} <span style="opacity:.7">${t.d}</span></span>`;
    b.onclick=()=>{filterTier=filterTier===t.k?"":t.k;logEv("filter","tier:"+(filterTier||"all"));render();}; hist.appendChild(b); });
  // feed
  $("#feed").hidden=!upd.length; $("#feed-n").textContent=`${upd.length} รายการ`;
  $("#feed-list").innerHTML=upd.map(d=>`<li><span class="t">${statusOf(d)==="new"?"NEW":"EDIT"}</span>${esc(d.name)} · ${fmtN(d.f)}</li>`).join("");
  // ticks
  const tk=$("#ticks"); tk.innerHTML=""; const tv=scale==="linear"?[0,0.5e6,1e6,1.5e6,2e6]:[1e4,1e5,1e6]; tv.filter(v=>v<=max).forEach(v=>{ const s=document.createElement("span"); s.style.left=(widthOf(v,max)*88)+"%"; s.textContent=v?fmtN(v):"0"; tk.appendChild(s); });
  // rows
  const vis=sorted.filter(d=>(!filterTier||d.tier===filterTier)&&(!filterRv||(filterRv==="wait"?!rvOf(d):rvOf(d)===filterRv))&&(!filterCode||(filterCode==="MIDI"?codeSoft(d.code):d.code===filterCode))&&(!q||(d.name+" "+d.cat+" "+d.group+" "+(d.code||"")).toLowerCase().includes(q)));
  const wrap=$("#rows"); wrap.innerHTML=""; let lastTier=null, rank=0; const rankOf=new Map(sorted.map((d,i)=>[d,i+1]));
  const pinned=vis.filter(d=>d.sug&&!rvOf(d)); const rest=vis.filter(d=>!(d.sug&&!rvOf(d)));
  if(pinned.length){ const ph=document.createElement("div"); ph.className="pinhead"; ph.innerHTML=`<b>KOL เพิ่มมาใหม่</b><span>${pinned.length} รายการ รอพิจารณา</span><span class="blink">● กดดูแล้วติ๊กผล</span>`; wrap.appendChild(ph); pinned.forEach(d=>wrap.appendChild(rowEl(d,rankOf,reach,max,true))); const sp=document.createElement("div"); sp.className="pin"; wrap.appendChild(sp); }
  rest.forEach(d=>{ if(d.tier!==lastTier){ lastTier=d.tier; const t=TIERS.find(x=>x.k===d.tier); const g=sorted.filter(x=>x.tier===d.tier), r=g.reduce((s,x)=>s+(x.f||0),0);
      const h=document.createElement("div"); h.className="tierhead"; h.innerHTML=`<i style="background:${t.c}"></i><b>${t.n}</b><span>${t.d} ผู้ติดตาม</span><span class="m">${g.length} คน · reach ${fmtN(r)} (${Math.round(r/reach*100)}%)</span>`; wrap.appendChild(h); }
    wrap.appendChild(rowEl(d,rankOf,reach,max,false)); });
  if(!vis.length) wrap.innerHTML=data.length?`<div class="empty">ไม่พบ KOL ที่ตรงกับตัวกรอง</div>`:`<div class="skel" id="skel"></div>`;
  const tl=teamList(sorted);
  $("#t-review").textContent=nw; $("#t-team").textContent=`${Math.min(tl.all.length,TARGET)}/${TARGET}`; $("#t-target").textContent=TARGET;
  $("#t-plan").textContent=tl.all.filter(d=>phasesOf(d).length).length+"/"+tl.all.length;
  renderTeam(sorted,reach); renderPlan(sorted); renderAI(tl.all); renderSched(tl.all);
  $("#t-sched").textContent=tl.all.filter(d=>datesOf(d).length).length+"/"+tl.all.length;
}
/* ===== tabs ===== */
let TAB="strategy"; try{ TAB=localStorage.getItem("kol_tab")||"strategy"; }catch(e){}
function setTab(t){ TAB=t; document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===t)); document.querySelectorAll(".page").forEach(p=>p.hidden=p.dataset.page!==t); try{localStorage.setItem("kol_tab",t);}catch(e){} try{ logEv("tab",t); }catch(e){} if(t==="sched"&&typeof renderSched==="function"&&data.length) renderSched(teamList([...data].sort((a,b)=>(b.f||0)-(a.f||0))).all); }
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>setTab(b.dataset.tab)); setTab(TAB);
$("#present").onclick=()=>{ const on=document.body.classList.toggle("present"); $("#present").textContent=on?"✕ ออกจากนำเสนอ":"▶ นำเสนอ"; if(on&&document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{}); if(!on&&document.fullscreenElement) document.exitFullscreen().catch(()=>{}); logEv("present",on?"on":"off"); };
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&document.body.classList.contains("present")) $("#present").click(); });
/* ===== team 50 ===== */
const RX={news:/ข่าว|news|อัปเดต|อัพเดท|update/i, edu:/ความรู้|เทคนิค|สอน|how|tip|trick|แนะนำ/i, review:/รีวิว|review|gadget|ชี้เป้า|แกะกล่อง|unbox/i, fin:/finance|invest|ลงทุน|หุ้น|business|ธุรกิจ|เศรษฐกิจ|การเงิน|money/i, life:/lifestyle|ไลฟ์สไตล์|travel|ท่องเที่ยว|photo|ถ่ายภาพ/i, host:/พิธีกร|คอลัมนิสต์|ผู้ดำเนินรายการ|mc|วิทยากร|speaker|creator/i, mobile:/มือถือ|smart ?phone|แอป|app/i};
const CATS=[["ข่าว/อัปเดตเทค",RX.news],["ความรู้/สอนใช้",RX.edu],["รีวิว Gadget/IT",RX.review],["การเงิน/ลงทุน",RX.fin],["ไลฟ์สไตล์",RX.life],["อื่น ๆ",/.*/]];
function catsOf(d){ const s=(d.cat||"")+" "+(d.group||""); const out=CATS.filter(([k,re],i)=>i<CATS.length-1&&re.test(s)).map(x=>x[0]); return out.length?out:[CATS[CATS.length-1][0]]; }
function renderTeam(sorted,reachAll){
  const {all,team,spare}=teamList(sorted); const fails=sorted.filter(d=>rvOf(d)==="fail"), np=all.length, confirmed=all.filter(d=>rvOf(d)==="pass").length;
  const pct=Math.min(100,Math.round(np/TARGET*100)); const ring=$("#tp-ring"); ring.style.setProperty("--p",pct); ring.classList.toggle("full",np>=TARGET);
  $("#tp-n").textContent=Math.min(np,TARGET); $("#tp-t").textContent=TARGET; $("#tp-t2").textContent=TARGET;
  const short=TARGET-np;
  $("#tp-line").textContent=np>=TARGET?`ทีมพร้อม ${TARGET} คน${spare.length?` · สำรอง ${spare.length} คน`:""} · ยืนยันแล้ว ${confirmed} · ตัดออก ${fails.length}`:`อยู่ในทีม ${np} คน · ตัดออก ${fails.length} · ขาดอีก ${short} ช่อง`;
  const w=$("#tp-warn"); if(short>0){ w.hidden=false; w.className="tp-warn"; w.textContent=`⚠ ตัดออกแล้ว ${fails.length} คน — ทีมเหลือ ${np} ยังขาด ${short} คน ทีมงานกำลังหา KOL มาเติม`; } else { w.hidden=false; w.className="tp-warn ok"; w.textContent=fails.length?`ตัดออก ${fails.length} คน ทีมยังครบ ${TARGET} · ตัดได้อีก ${np-TARGET} คนก่อนจะขาด`:`✓ ทีมครบ ${TARGET} · ตัดได้อีก ${np-TARGET} คนก่อนจะขาด — ไม่ชอบใครกด "ตัดออก" ได้เลย`; }
  const reach=team.reduce((s,d)=>s+(d.f||0),0);
  $("#tp-stats").innerHTML=`<div><div class="l">Reach ของทีม</div><div class="v">${fmtN(reach)}</div></div>`+(KOL_REACH_TARGET?`<div><div class="l">เป้า reach KOL</div><div class="v${reach>=KOL_REACH_TARGET?" ok":""}">${Math.round(reach/KOL_REACH_TARGET*100)}%<small> / ${fmtN(KOL_REACH_TARGET)}</small></div></div>`:`<div><div class="l">เฉลี่ยต่อคน</div><div class="v">${fmtN(team.length?Math.round(reach/team.length):0)}</div></div>`)+`<div><div class="l">หมวดที่ครอบคลุม</div><div class="v">${new Set(team.flatMap(catsOf)).size}/${CATS.length}</div></div>`;
  const mic=team.filter(d=>torTier(d)==="micro").length, nan=team.filter(d=>torTier(d)==="nano").length, below=team.filter(d=>torTier(d)==="below").length;
  const torEl=$("#tor"); torEl.hidden=!(TOR_MICRO_MIN||TOR_NANO_MIN); torEl.innerHTML=`<span class="lb">เงื่อนไข TOR 6.3.4(3)</span><span class="${mic>=TOR_MICRO_MIN?"ok":"bad"}">Micro (5,000+ ผู้ติดตาม) <b>${mic}</b> / ≥${TOR_MICRO_MIN}</span><span class="${nan>=TOR_NANO_MIN?"ok":"bad"}">Nano (1,000–4,999) <b>${nan}</b> / ≥${TOR_NANO_MIN}</span>${below?`<span class="bad">ต่ำกว่า 1,000: ${below} คน (ไม่นับ)</span>`:""}<span class="hint">${nan<TOR_NANO_MIN?`ต้องหา Nano เพิ่มอีก ${TOR_NANO_MIN-nan} คน ถึงจะครบเงื่อนไข`:"ครบตามเงื่อนไข ✓"}</span>`;
  const slots=$("#slots"); slots.innerHTML="";
  for(let i=0;i<TARGET;i++){ const d=team[i]; const el=document.createElement("div");
    if(!d){ el.className="slot empty"; el.textContent=i+1; }
    else { const src=avSrc(d); el.className="slot"+(i<10?" lead":"")+(d.sug?" new":"")+(src?"":" txt"); el.title=`${d.name} · ${fmtN(d.f)}`; el.innerHTML=(src?`<img src="${src}" alt="" loading="lazy">`:iniOf(d))+`<span class="n">${i+1}</span>`+(d.sug?`<span class="nw">ใหม่</span>`:""); el.onclick=()=>openCard(d); }
    slots.appendChild(el); }
  const sp=$("#spare"); sp.hidden=!spare.length; sp.innerHTML=spare.length?`<span class="lb">สำรอง +${spare.length}</span>`+spare.map(d=>{ const src=avSrc(d); return `<div class="slot${src?"":" txt"}" title="${esc(d.name)}">${src?`<img src="${src}" alt="">`:iniOf(d)}</div>`; }).join("")+`<span>เกินโควตา ${TARGET} — ขึ้นมาแทนอัตโนมัติเมื่อมีคนถูกตัดออก</span>`:"";
  sp.querySelectorAll(".slot").forEach((el,i)=>el.onclick=()=>openCard(spare[i]));
  // mixes
  const tierRows=TIERS.map(t=>[t.n+" "+t.d,team.filter(d=>d.tier===t.k).length,t.c]);
  $("#mix-tier").innerHTML=mixHtml(tierRows,team.length,"คน");
  const catRows=CATS.map(([k])=>[k,team.filter(d=>catsOf(d).includes(k)).length,"var(--ink2)"]);
  $("#mix-cat").innerHTML=mixHtml(catRows,team.length,"คน",true);
}
function mixHtml(rows,total,unit,warnZero){ const mx=Math.max(1,...rows.map(r=>r[1])); return rows.map(([k,n,c])=>`<div class="m"><span class="k${warnZero&&!n&&total?" warn-k":""}" title="${esc(k)}">${esc(k)}${warnZero&&!n&&total?" · ยังไม่มี":""}</span><span class="bar"><i style="width:${n/mx*100}%;background:${c}"></i></span><span class="v">${n} ${unit}</span></div>`).join(""); }
/* ===== plan (3 phases) ===== */
function renderPlan(sorted){
  const passed=teamList(sorted).all;
  $("#phases").innerHTML=PHASES.map(p=>{ const list=passed.filter(d=>phasesOf(d).includes(p.n)); const reach=list.reduce((s,d)=>s+(d.f||0),0);
    const faces=list.slice(0,14).map(d=>{ const s=avSrc(d); return s?`<img src="${s}" alt="" title="${esc(d.name)}" data-k="${esc(d.key)}">`:`<span class="f" title="${esc(d.name)}" data-k="${esc(d.key)}">${iniOf(d)}</span>`; }).join("")+(list.length>14?`<span class="f more">+${list.length-14}</span>`:"");
    return `<div class="ph" style="--ph:${p.c}"><div class="num">ระยะที่ ${p.n}</div><h3>${esc(p.title)}</h3><div class="d">${esc(rangeLabel(p))}</div><div class="g">${esc(p.goal)}</div><div class="brief">📝 ${esc(p.brief||"")}</div><div class="kpi"><div><b>${list.length}</b>KOL</div><div><b>${fmtN(reach)}</b>reach</div></div><div class="faces">${list.length?faces:`<div class="empty-p">ยังไม่มี KOL ในระยะนี้ — เลือกจากรายชื่อด้านล่าง</div>`}</div></div>`; }).join("");
  $("#phases").querySelectorAll("[data-k]").forEach(el=>el.onclick=()=>{ const d=data.find(x=>x.key===el.dataset.k); if(d) openCard(d); });
  const unset=passed.filter(d=>!phasesOf(d).length).length; const byz=[...new Set(passed.map(d=>(reviews[rid(d)]||{}).phaseBy).filter(Boolean))]; $("#plan-who").textContent=byz.length?"จัดโดย: "+byz.join(", "):"";
  const list=$("#plan-list"); if(!passed.length){ list.innerHTML=`<div class="empty">ยังไม่มี KOL ในทีม</div>`; return; }
  list.innerHTML=(unset?`<p class="plan-note">ยังไม่ได้จัดระยะ ${unset} คน (แถบเหลือง)</p>`:`<p class="plan-note">จัดครบทุกคนแล้ว ✓</p>`)+passed.map(d=>{ const ph=phasesOf(d); return `<div class="pl${ph.length?"":" unset"}" data-k="${esc(d.key)}">${avatarEl(d)}<div><div class="nm">${esc(d.name)}</div><div class="ct">${fmtN(d.f)} · ${esc(d.cat||"—")}</div></div><div class="pch">${PHASES.map(p=>`<button type="button" data-p="${p.n}" class="${ph.includes(p.n)?"on":""}" style="--ph:${p.c}" title="${esc(p.title)} ${esc(p.d)}">ระยะ ${p.n}</button>`).join("")}</div></div>`; }).join("");
  list.querySelectorAll(".pl").forEach(el=>{ const d=data.find(x=>x.key===el.dataset.k); el.querySelector(".nm").onclick=()=>openCard(d); el.querySelector(".av").onclick=()=>openCard(d);
    el.querySelectorAll(".pch button").forEach(b=>b.onclick=()=>togglePhase(d,b.dataset.p)); });
}
/* ===== AI plan: กติกาที่อธิบายได้ ===== */
/* กติกา MIDI จัดให้ — แคมเปญเปิดตัวฟีเจอร์ AI ของแอปลงทุน: 1 Tease · 2 Reveal · 3 Prove · 4 Convert */
function aiPlan(passed){
  const total=passed.reduce((s,d)=>s+(d.f||0),0); const out=new Map(); const Z=()=>PHASES.map(()=>0), ZZ=()=>PHASES.map(()=>[]);
  const P=(n)=>Math.min(NP-1,n); // ดัชนีระยะ (กัน config ที่มีน้อยกว่า 4 ระยะ)
  passed.forEach(d=>{ const sc=Z(), why=ZZ(); const txt=(d.name+" "+d.cat); const f=d.f||0;
    const add=(i,n,w)=>{ i=P(i); sc[i]+=n; why[i].push(w); };
    if(f>=1e6) add(1,4,"Mega "+fmtN(f)+" — เดโมวันเปิดตัวให้คนเห็นวงกว้าง"); else if(f>=3e5){ add(1,3,"Macro "+fmtN(f)+" — reach สูง เหมาะวันเปิดตัว"); add(0,1,"Teaser ก่อนเปิดตัว — ปูกระแส"); } else if(f>=1e5) add(2,2,"Macro ระดับกลาง — สอนใช้จริง/เปรียบเทียบ");
    if(RX.news.test(txt)){ add(0,3,"สายข่าวเทค — Teaser \"AI กำลังมา\" + นับถอยหลัง"); add(1,2,"รายงานวันเปิดตัวแบบข่าว"); }
    if(RX.edu.test(txt)){ add(2,4,"สายความรู้/เทคนิค — How-to ใช้ AI วิเคราะห์หุ้นทีละขั้น"); add(1,1,"อธิบายฟีเจอร์วันเปิดตัว"); }
    if(RX.review.test(txt)){ add(2,3,"สายรีวิว — รีวิวตรง ๆ ไม่เกินจริง ข้อดี/ข้อจำกัด"); add(3,2,"สรุปรีวิว + CTA ลองใช้"); }
    if(RX.fin.test(txt)){ add(1,3,"สายการเงิน/ลงทุน — เปิดตัวอย่างน่าเชื่อถือ อธิบายกรอบความเสี่ยง"); add(3,3,"ปิดการตัดสินใจ — เคสจริง + ขั้นตอนเปิดบัญชี"); }
    if(RX.life.test(txt)){ add(0,2,"ไลฟ์สไตล์ — ตั้งคำถามชีวิตนักลงทุนมือใหม่"); add(3,3,"use case ในชีวิตประจำวัน — CTA ดาวน์โหลด"); }
    if(RX.host.test(txt)) add(1,2,"พิธีกร/นักพูด — เล่าภาพใหญ่วันเปิดตัว");
    if(RX.mobile.test(txt)) add(2,2,"สายมือถือ/แอป — เดโมในแอปจริง");
    if(f<5e4) add(3,2,"Micro/Nano — ลิงก์/โค้ดรายคน วัดการเปิดบัญชี");
    if(!sc.some(Boolean)) add(2,1,"ทั่วไป — ใส่ช่วงสอนใช้เพื่อเสริมความถี่");
    out.set(d.key,{d,sc,why}); });
  const share=NP===4?[.22,.30,.28,.20]:PHASES.map(()=>1/NP); const target=share.map(x=>x*total); const sum=Z(); const pick={};
  const order=[...passed].sort((a,b)=>(b.f||0)-(a.f||0)); const idx=PHASES.map((_,i)=>i);
  order.forEach(d=>{ const o=out.get(d.key); const ranked=[...idx].sort((i,j)=>o.sc[j]-o.sc[i]||sum[i]-sum[j]); let i=ranked[0];
    if(sum[i]+(d.f||0)>target[i]*1.3 && o.sc[ranked[1]]>=o.sc[i]-2){ i=ranked[1]; o.why[i].push("ย้ายมาระยะนี้เพื่อบาลานซ์ reach ระหว่างระยะ"); }
    const ph=[String(i+1)]; const j=ranked.find(k=>k!==i&&o.sc[k]>=3&&o.sc[k]>=o.sc[i]-1); if(j!=null) ph.push(String(j+1));
    sum[i]+=(d.f||0); pick[d.key]={d,ph:ph.sort(),whyP:o.why,why:ph.map(p=>o.why[+p-1]).flat().filter((v,k,a)=>a.indexOf(v)===k)}; });
  // วันเปิดตัว (ระยะ 2) ต้องมีคนอย่างน้อย 40% ของทีม — surround effect
  if(NP>=2){ const want=Math.round(passed.length*0.4); const have=()=>Object.values(pick).filter(x=>x.ph.includes("2")).length;
    const c=Object.values(pick).filter(x=>!x.ph.includes("2")).sort((a,b)=>out.get(b.d.key).sc[1]-out.get(a.d.key).sc[1]);
    for(const x of c){ if(have()>=want) break; x.ph.push("2"); x.ph.sort(); const w="ร่วมวันเปิดตัว — หลายช่องโพสต์ไล่กันใน 48 ชม. ให้คนเห็นซ้ำ ≥3 ครั้ง"; x.whyP[1].push(w); x.why.push(w); } }
  // ทุกระยะมีอย่างน้อย 3 คน
  idx.forEach(i=>{ const have=Object.values(pick).filter(x=>x.ph.includes(String(i+1))).length; if(have<3&&passed.length>=3*NP){ Object.values(pick).sort((a,b)=>out.get(b.d.key).sc[i]-out.get(a.d.key).sc[i]).filter(x=>!x.ph.includes(String(i+1))).slice(0,3-have).forEach(x=>{ x.ph.push(String(i+1)); x.ph.sort(); const w="เพิ่มให้ระยะที่ "+(i+1)+" มีคนครบขั้นต่ำ"; x.whyP[i].push(w); x.why.push(w); }); } });
  return {pick,sum,total};
}
/* ===== ปฏิทินแคมเปญ: วัน = ดัชนี 0..DAYS-1 นับจาก START ===== */
const START=(()=>{ const m=String(CFG.START||"2026-11-01").split("-"); return new Date(+m[0],+m[1]-1,+m[2]); })();
const DAYS=Math.max(7,Math.min(60,Number(CFG.DAYS)||28));
const TL_DAYS=Array.from({length:DAYS},(_,i)=>i);
const DAY=i=>new Date(START.getFullYear(),START.getMonth(),START.getDate()+i);
const TH_M=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const dLabel=i=>{ const d=DAY(i); return d.getDate()+" "+TH_M[d.getMonth()]; };
const dDow=i=>["อา","จ","อ","พ","พฤ","ศ","ส"][DAY(i).getDay()];
const isWE=i=>{ const w=DAY(i).getDay(); return w===0||w===6; };
const tlPhase=i=>{ const p=PHASES.find(p=>i>=p.from&&i<=p.to); return p?+p.n:NP; };
const phaseDays=n=>TL_DAYS.filter(i=>tlPhase(i)===+n);
const TL_W={}; TL_DAYS.forEach(i=>{ const v=Array.isArray(CFG.INTENSITY)&&CFG.INTENSITY[i]; TL_W[i]=v?Math.max(1,Math.min(5,+v)):(isWE(i)?4:3); });
const TL_EV=(CFG.EVENTS||[]).filter(e=>e.d>=0&&e.d<DAYS);
const rangeLabel=p=>p.d||(dLabel(p.from)+" – "+dLabel(p.to));
function renderTimeline(){ const el=$("#timeline"); if(!el||el.dataset.done) return; el.dataset.done=1; const t0=new Date(); const td=TL_DAYS.find(i=>DAY(i).toDateString()===t0.toDateString());
  const cells=[];
  PHASES.forEach(p=>cells.push(`<div class="tl-phase" data-n="${p.n}" style="--ph:${p.c};grid-column:${p.from+1}/${p.to+2}">ระยะ ${p.n} · ${esc(rangeLabel(p))}</div>`));
  TL_DAYS.forEach(i=>{ const w=TL_W[i], p=PHASES[tlPhase(i)-1]; cells.push(`<div class="tl-bar${w>=4?" hot":""}" style="--ph:${p.c};grid-column:${i+1}" title="${dLabel(i)} · ความเข้ม ${w}/5"><i style="height:${w*20}%"></i></div>`); cells.push(`<div class="tl-day${isWE(i)?" we":""}${i===td?" today":""}" style="grid-column:${i+1}">${DAY(i).getDate()}${i===0||DAY(i).getDate()===1?`<small>${TH_M[DAY(i).getMonth()]}</small>`:""}</div>`); });
  TL_EV.forEach((e,i)=>{ const p=PHASES[tlPhase(e.d)-1]; const nxt=TL_EV[i+2]?TL_EV[i+2].d:DAYS; const span=Math.max(2,Math.min(6,nxt-e.d,DAYS-e.d)); cells.push(`<div class="tl-ev" style="--ph:${p.c};grid-column:${e.d+1}/span ${span};grid-row:${4+(i%2)}"><div class="pin"><b>${esc(e.t)}</b>${esc(e.s||"")}</div></div>`); });
  el.innerHTML=`<h2>ไทม์ไลน์ ${esc(dLabel(0))} – ${esc(dLabel(DAYS-1))} <span class="h-sub">แถบสูง = ช่วงที่ควรเน้นโพสต์ · หมุด = จังหวะสำคัญของแคมเปญ</span></h2><div class="tl-grid" style="grid-template-columns:repeat(${DAYS},minmax(0,1fr))">${cells.join("")}</div><div class="tl-legend"><span><i></i>เน้นมาก: วันเปิดตัว + สัปดาห์สอนใช้ + โค้งสุดท้าย</span><span><i class="lo"></i>เบา: ช่วง Teaser</span><span>ตัวหนา = เสาร์–อาทิตย์</span></div>`; }
renderTimeline();
(()=>{ const el=$("#hero-phases"); if(el){ const t0=new Date(); const td=TL_DAYS.find(i=>DAY(i).toDateString()===t0.toDateString()); const cur=td!=null?tlPhase(td):0;
    el.innerHTML=PHASES.map(p=>`<div class="hp${+p.n===cur?" now":""}" style="--ph:${p.c}"><i></i><b>${esc(p.title.split("—")[0].trim())}</b><small>${esc(rangeLabel(p))}</small></div>`).join("");
    const cd=$("#hero-cd"); const launch=TL_EV.find(e=>e.launch); const days=(a,b)=>Math.round((b-a)/864e5); const t=new Date(t0.getFullYear(),t0.getMonth(),t0.getDate());
    const parts=[]; const s=days(t,DAY(0)); if(s>0) parts.push(`<span>เริ่มแคมเปญใน <b>${s}</b> วัน</span>`); else parts.push(`<span>แคมเปญเริ่มแล้ว · วันที่ <b>${Math.min(DAYS,-s+1)}</b>/${DAYS}</span>`);
    if(launch){ const l=days(t,DAY(launch.d)); parts.push(l>0?`<span>${esc(launch.t)} อีก <b>${l}</b> วัน (${dLabel(launch.d)})</span>`:`<span>${esc(launch.t)} · ${dLabel(launch.d)}${l===0?" · <b>วันนี้</b>":""}</span>`); }
    const e=days(t,DAY(DAYS-1)); if(e>=0) parts.push(`<span>สิ้นสุด ${dLabel(DAYS-1)} · เหลือ <b>${e}</b> วัน</span>`);
    cd.innerHTML=parts.join(""); if(CFG.CAMPAIGN) $("#hero-name").textContent=CFG.CAMPAIGN; }
  const a=$("#hash-txt"); if(a) a.textContent=HASHTAGS; const b=$("#sc-range"); if(b) b.textContent=dLabel(0)+" – "+dLabel(DAYS-1); const c=$("#hd-sub"); if(c&&CFG.HEAD) c.textContent=CFG.HEAD; const hs=$("#hero-sub"); if(hs&&CFG.HERO_SUB) hs.textContent=CFG.HERO_SUB; })();
const splitWhy=w=>{ const i=w.indexOf(" — "); return i>0?[w.slice(0,i),w.slice(i+3)]:[w,""]; };
const chipsHtml=(arr,max)=>`<div class="why-chips">${arr.slice(0,max||99).map(w=>{ const [t,d]=splitWhy(w); const cls=/^ช่วงที่แนะนำ/.test(w)?"when":/^ย้าย|^เพิ่มให้/.test(w)?"mv":""; return `<span class="${cls}" title="${esc(w)}">${esc(cls==="when"?w.replace("ช่วงที่แนะนำ: ","📍 "):t)}</span>`; }).join("")}</div>`;
let PLAN_MODE="manual";
$("#plan-seg").querySelectorAll("button").forEach(b=>b.onclick=()=>{ PLAN_MODE=b.dataset.m; $("#plan-seg").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b)); $("#plan-manual").hidden=PLAN_MODE!=="manual"; $("#plan-ai").hidden=PLAN_MODE!=="ai"; logEv("planmode",PLAN_MODE); render(); });
function renderAI(passed){
  if(PLAN_MODE!=="ai") return; if(!passed.length){ $("#ai-sum").textContent="ยังไม่มี KOL ในทีม"; $("#ai-kpi").innerHTML=""; $("#ai-phases").innerHTML=""; $("#ai-list").innerHTML=""; return; }
  const {pick,total}=aiPlan(passed); const rows=Object.values(pick);
  const cnt=PHASES.map(p=>rows.filter(x=>x.ph.includes(p.n)).length), sum=PHASES.map(p=>rows.filter(x=>x.ph.includes(p.n)).reduce((s,x)=>s+(x.d.f||0),0));
  const diff=rows.filter(x=>{ const cur=phasesOf(x.d).join(","); return cur&&cur!==x.ph.join(","); }).length, unset=rows.filter(x=>!phasesOf(x.d).length).length;
  $("#ai-kpi").innerHTML=PHASES.map((p,i)=>`<div style="--ph:${p.c}"><span class="n">${cnt[i]}</span><span class="l">KOL</span><span class="r">${fmtN(sum[i])}</span><span class="l">reach · ${Math.round(sum[i]/total*100)}%</span></div>`).join("");
  const launchN=rows.filter(x=>x.ph.includes("2")).length;
  $("#ai-sum").textContent=`จัด ${rows.length} คน · reach รวม ${fmtN(total)} · ร่วมวันเปิดตัว ${launchN} คน (${Math.round(launchN/rows.length*100)}%)${unset?` · ยังไม่จัดเอง ${unset} คน`:""}${diff?` · ต่างจากที่จัดเองอยู่ ${diff} คน`:""}`;
  $("#ai-phases").innerHTML=PHASES.map(p=>{ const list=rows.filter(x=>x.ph.includes(p.n)).sort((a,b)=>(b.d.f||0)-(a.d.f||0)); const reach=list.reduce((s,x)=>s+(x.d.f||0),0);
    return `<div class="ph" style="--ph:${p.c}"><div class="num">ระยะที่ ${p.n}</div><h3>${esc(p.title)}</h3><div class="d">${esc(rangeLabel(p))}</div><div class="brief">📝 ${esc(p.brief||"")}</div><div class="kpi"><div><b>${list.length}</b>KOL</div><div><b>${fmtN(reach)}</b>reach</div></div><div class="who-l">${list.map(x=>{ const s=avSrc(x.d); return `<div class="wl" data-k="${esc(x.d.key)}">${s?`<img src="${s}" alt="">`:`<span class="f">${iniOf(x.d)}</span>`}<div><b>${esc(x.d.name)} <span class="sub">${fmtN(x.d.f)}</span></b>${chipsHtml([...new Set(x.whyP[+p.n-1]||[])],3)}</div></div>`; }).join("")}</div></div>`; }).join("");
  $("#ai-phases").querySelectorAll("[data-k]").forEach(el=>el.onclick=()=>{ const d=data.find(x=>x.key===el.dataset.k); if(d) openCard(d); });
  $("#ai-list").innerHTML=rows.sort((a,b)=>(b.d.f||0)-(a.d.f||0)).map(x=>{ const cur=phasesOf(x.d).join(","); return `<div class="ai-row" data-k="${esc(x.d.key)}">${avatarEl(x.d)}<div><div class="nm">${esc(x.d.name)} <i style="font-style:normal;color:var(--mute);font-weight:500;font-size:12px">${fmtN(x.d.f)}</i>${cur&&cur!==x.ph.join(",")?` <span class="diff">จัดเองไว้: ระยะ ${esc(cur)}</span>`:""}</div>${chipsHtml(x.why)}</div><div class="tags">${x.ph.map(p=>`<span style="--ph:${PHASES[+p-1].c}">ระยะ ${p}</span>`).join("")}</div></div>`; }).join("");
  $("#ai-list").querySelectorAll(".ai-row .av,.ai-row .nm").forEach(el=>el.onclick=()=>{ const d=data.find(x=>x.key===el.closest(".ai-row").dataset.k); if(d) openCard(d); });
  $("#ai-apply-all").onclick=()=>applyAI(rows,false); $("#ai-apply-unset").onclick=()=>applyAI(rows,true);
}
function applyAI(rows,onlyUnset){ if(!reviewer){ askName(()=>applyAI(rows,onlyUnset)); return; } const list=rows.filter(x=>!onlyUnset||!phasesOf(x.d).length).map(x=>({key:rid(x.d),name:x.d.name,phase:x.ph.join(","),by:reviewer}));
  if(!list.length){ toast("ไม่มีรายการให้จัด"); return; } const prev={}; list.forEach(r=>{ prev[r.key]=reviews[r.key]; reviews[r.key]=Object.assign({},reviews[r.key],{phase:r.phase}); }); render(); logEv("ai-apply",(onlyUnset?"unset ":"all ")+list.length);
  api("setPhases",[list]).then(()=>{ toast(`บันทึกแผน AI ให้ ${list.length} คนแล้ว`); PLAN_MODE="manual"; $("#plan-seg").querySelector('[data-m="manual"]').click(); }).catch(err=>{ Object.assign(reviews,prev); render(); toast("บันทึกไม่สำเร็จ: "+(err&&err.message||err)); }); }
function togglePhase(d,p){ if(!reviewer){ askName(()=>togglePhase(d,p)); return; } const id=rid(d); const cur=phasesOf(d); const next=cur.includes(p)?cur.filter(x=>x!==p):cur.concat([p]).sort(); const prev=reviews[id];
  reviews[id]=Object.assign({},prev,{phase:next.join(",")}); render(); logEv("phase",d.name+" → "+(next.join(",")||"-"));
  api("setPhase",[{key:id,name:d.name,phase:next.join(","),by:reviewer}]).then(()=>toast(`${d.name}: ระยะ ${next.join(", ")||"—"}`)).catch(err=>{ reviews[id]=prev; render(); toast("บันทึกไม่สำเร็จ: "+(err&&err.message||err)); }); }
/* ===== KOL card ===== */
/* ===== schedule board: drag KOL → day ===== */
let SC_SEL=null;
function renderSched(all){ const el=$("#sc"); if(!el||$("#tabs .tab.active").dataset.tab!=="sched") return;
  const ev={}; TL_EV.forEach(e=>ev[e.d]=e.t);
  const SUG={}; try{ autoDates(all).forEach(r=>{ SUG[r.key]=r.dates.split(",").filter(s=>s!=="").map(Number); }); }catch(e){}
  const tot={}; all.forEach(d=>datesOf(d).forEach(x=>{ tot[x]=tot[x]||{n:0,r:0}; tot[x].n++; tot[x].r+=(d.f||0); }));
  let h=`<div class="corner">KOL · ${all.length} คน</div>`+TL_DAYS.map(x=>{ const p=PHASES[tlPhase(x)-1]; return `<div class="hd${isWE(x)?" we":""}" style="box-shadow:inset 0 3px 0 ${p.c}">${DAY(x).getDate()}<small>${dDow(x)}${x===0||DAY(x).getDate()===1?" "+TH_M[DAY(x).getMonth()]:""}</small>${ev[x]?`<span class="ev" title="${esc(ev[x])}">${esc(ev[x])}</span>`:""}</div>`; }).join("");
  const maxN=Math.max(1,...Object.values(tot).map(t=>t.n));
  h+=`<div class="totl">โพสต์/วัน<br>reach/วัน<br><span style="font-size:9px">แถบ = แนะนำ</span></div>`+TL_DAYS.map(x=>{ const t=tot[x]||{n:0,r:0}; const w=TL_W[x]||1; return `<div class="tot${t.n?(w>=4&&t.n<2?" lo":t.n>=4?" hi":""):" lo"}" title="แนะนำความเข้ม ${w}/5">${t.n||"–"}<small>${t.r?fmtN(t.r):""}</small><span class="rec"><i style="width:${w*20}%"></i></span></div>`; }).join("");
  const groups=PHASES.map(p=>[+p.n,"ระยะ "+p.n+" · "+p.title,p.c]).concat([[0,"ยังไม่ได้จัดระยะ","#c9c9ce"]]);
  const used=new Set();
  groups.forEach(([p,label,c])=>{ const list=all.filter(d=>{ if(used.has(d.key)) return false; const ph=phasesOf(d); const ok=p?ph[0]===String(p):!ph.length; if(ok) used.add(d.key); return ok; }).sort((a,b)=>(b.f||0)-(a.f||0)); if(!list.length) return;
    h+=`<div class="grp" style="--ph:${c}">${label} · ${list.length} คน</div>`;
    list.forEach(d=>{ const ds=datesOf(d), ph=phasesOf(d); const src=avSrc(d); const ini=iniOf(d);
      h+=`<div class="who${SC_SEL===d.key?" sel":""}" draggable="true" data-k="${esc(d.key)}" title="ลากไปวางในช่องวัน หรือแตะเพื่อเลือก">${src?`<div class="av"><img src="${src}" alt=""></div>`:`<div class="av av-txt">${ini}</div>`}<div style="min-width:0"><div class="nm">${esc(d.name)}</div><div class="f">${fmtN(d.f)}${ph.length?` · ระยะ ${ph.join(",")}`:""}</div></div><span class="n">${ds.length?ds.length+" โพสต์":""}</span></div>`;
      TL_DAYS.forEach(x=>{ const dow=DAY(x).getDay(); const inPh=ph.length?ph.includes(String(tlPhase(x))):false; const has=ds.includes(x);
        const sug=!ds.length&&(SUG[rid(d)]||[]).includes(x);
        h+=`<div class="cell${dow===0||dow===6?" we":""}${inPh&&!has?" rec":""}" data-k="${esc(d.key)}" data-d="${x}" style="--ph:${c}">${has?`<div class="post" draggable="true" data-k="${esc(d.key)}" data-d="${x}" title="${esc(d.name)} · ${dLabel(x)} — กดเพื่อดู/แก้แนวคอนเทนต์" style="--ph:${c}">${src?`<img src="${src}" alt="">`:""}<span class="st st-${postOf(d,x).status}"></span></div>`:sug?`<div class="post sug" data-sug="1" title="MIDI แนะนำ ${dLabel(x)} — กดเพื่อยืนยัน หรือลากรูปไปวันอื่น" style="--ph:${c}">${src?`<img src="${src}" alt="">`:""}</div>`:""}</div>`; }); }); });
  el.style.gridTemplateColumns=`176px repeat(${DAYS},minmax(0,1fr))`; el.innerHTML=h;
  const withDates=all.filter(d=>datesOf(d).length).length, posts=Object.values(tot).reduce((s,t)=>s+t.n,0);
  $("#sc-sum").textContent=`กำหนดวันแล้ว ${withDates}/${all.length} คน · รวม ${posts} โพสต์ · รูปจาง ๆ เส้นประ = วันที่ MIDI แนะนำ (กดเพื่อยืนยัน หรือลากไปวันอื่น) · ขีดสีใต้ช่อง = วันในระยะของคนนั้น`;
  // drag & drop
  let drag=null;
  el.querySelectorAll(".who,.post").forEach(n=>{ n.addEventListener("dragstart",e=>{ drag={k:n.dataset.k,from:n.dataset.d?+n.dataset.d:null}; e.dataTransfer.effectAllowed="move"; try{ e.dataTransfer.setData("text/plain",n.dataset.k); }catch(_){} n.classList.add("ghost"); }); n.addEventListener("dragend",()=>n.classList.remove("ghost")); });
  el.querySelectorAll(".cell").forEach(c=>{ c.addEventListener("dragover",e=>{ if(drag&&drag.k===c.dataset.k){ e.preventDefault(); c.classList.add("over"); } }); c.addEventListener("dragleave",()=>c.classList.remove("over"));
    c.addEventListener("drop",e=>{ e.preventDefault(); c.classList.remove("over"); if(!drag||drag.k!==c.dataset.k) return; const d=data.find(x=>x.key===c.dataset.k); const day=+c.dataset.d; let ds=datesOf(d); if(drag.from!=null) ds=ds.filter(x=>x!==drag.from); if(!ds.includes(day)) ds.push(day); setDates(d,ds); drag=null; });
    c.addEventListener("click",e=>{ const pst=e.target.closest(".post"); if(pst&&pst.dataset.sug){ const d=data.find(x=>x.key===c.dataset.k); setDates(d,datesOf(d).concat([+c.dataset.d])); return; } if(pst){ const d=data.find(x=>x.key===c.dataset.k); openPost(d,+c.dataset.d); return; } if(SC_SEL===c.dataset.k){ const d=data.find(x=>x.key===c.dataset.k); const ds=datesOf(d); if(!ds.includes(+c.dataset.d)){ ds.push(+c.dataset.d); setDates(d,ds); } } }); });
  renderPostList(all);
  el.querySelectorAll(".who").forEach(w=>w.addEventListener("click",()=>{ SC_SEL=SC_SEL===w.dataset.k?null:w.dataset.k; el.querySelectorAll(".who").forEach(x=>x.classList.toggle("sel",x.dataset.k===SC_SEL)); if(SC_SEL) toast("แตะช่องวันเพื่อวาง "+(data.find(x=>x.key===SC_SEL)||{}).name); }));
}
/* ===== แนวคอนเทนต์ที่ MIDI ร่างให้ต่อโพสต์ ===== */
function briefFor(d,day){ const p=tlPhase(day), txt=d.name+" "+d.cat, f=d.f||0; const news=RX.news.test(txt), edu=RX.edu.test(txt), review=RX.review.test(txt), fin=RX.fin.test(txt), life=RX.life.test(txt), host=RX.host.test(txt); const launch=TL_EV.find(e=>e.launch); const L=launch?launch.d:(PHASES[1]?PHASES[1].from:0); const left=Math.max(0,L-day);
  const cta="ปิดท้าย: \"ลองเองได้ในแอป Liberator\" + ลิงก์/โค้ดของตัวเอง (วัดผลรายคน) · ย้ำว่า AI ช่วยคิด คนตัดสินใจ ความเสี่ยงอยู่ที่ผู้ลงทุน";
  let fmt=p===1?FORMATS[0]:p===2?FORMATS[0]:p===3?FORMATS[1]:FORMATS[0], b="";
  if(p===1){ if(news) b=`Teaser ข่าว "Liberator กำลังปล่อยฟีเจอร์ AI" — เล่าสิ่งที่รู้ + ตั้งคำถามให้คนเดา นับถอยหลัง ${left} วัน`;
    else if(fin) b=`ตั้งคำถามกับคนดู: "ถ้า AI ช่วยลงทุน คุณกล้าให้มันทำอะไรบ้าง?" เล่าจุดเจ็บของนักลงทุน (ข้อมูลเยอะ ตัดสินใจไม่ทัน ไม่มีวินัย) + บอกว่า ${left} วันจะมีคำตอบ`;
    else if(life) b=`สถานการณ์จริง: อยากเริ่มลงทุนแต่ไม่รู้จะดูอะไร — ทิ้งท้าย "อีก ${left} วันมีตัวช่วย" ไม่ต้องบอกชื่อฟีเจอร์`;
    else b=`Teaser สั้น 15–30 วิ: โชว์ปัญหาการลงทุนที่ AI น่าจะช่วยได้ + นับถอยหลัง ${left} วัน + #AIคิดให้คุณตัดสินใจ`; }
  else if(p===2){ if(f>=3e5||host) b=`คลิปเปิดตัว 60 วิ: เดโมหน้าจอจริง 1 เคส (ถามคำถามเกี่ยวกับหุ้น → AI สรุป/วิเคราะห์ → คนตัดสินใจ) + พูดชัดว่า AI ไม่ได้ลงทุนแทน`;
    else if(edu) b=`อธิบายฟีเจอร์ AI แบบเข้าใจง่าย: ทำอะไรได้ 3 อย่าง ไม่ทำอะไร 1 อย่าง + ลองใช้ให้ดู 1 ขั้นตอน`;
    else if(fin) b=`เปิดตัวในมุมนักลงทุน: ใช้ AI ช่วยคัดกรอง/อ่านงบ/สรุปข่าว แล้วเทียบกับที่เคยทำเอง ใช้เวลาต่างกันแค่ไหน`;
    else b=`แกะกล่องฟีเจอร์ AI ใหม่ในแอป Liberator — เดโม 1 ฟีเจอร์ที่ว้าวที่สุด จบด้วย "ลองเองได้แล้ววันนี้"`; }
  else if(p===3){ if(edu) b=`How-to ทีละขั้น: ใช้ AI ใน Liberator วิเคราะห์หุ้น 1 ตัวตั้งแต่ต้นจนจบ (ถาม → อ่านผล → ตั้งเงื่อนไขความเสี่ยง) พร้อมทริค 3 ข้อ`;
    else if(review) b=`รีวิวตรง ๆ หลังใช้ 1 สัปดาห์: ชอบ 3 ข้อ ข้อจำกัด 2 ข้อ ใครเหมาะ/ไม่เหมาะ — ความน่าเชื่อถือสำคัญกว่าขาย`;
    else if(fin) b=`เคสจริง: เปรียบเทียบการตัดสินใจก่อน-หลังมี AI (เวลา/ข้อมูล/ความมั่นใจ) + ย้ำกรอบความเสี่ยงที่ตัวเองตั้ง`;
    else b=`ตอบข้อกังวลที่คนถามบ่อย (AI ผิดได้ไหม / ข้อมูลมาจากไหน / ต้องมีพอร์ตใหญ่ไหม) ด้วยการลองให้ดูในแอป`; }
  else { if(life) b=`use case ในชีวิตประจำวัน: เช็กพอร์ตกับ AI 5 นาทีก่อนนอน/ระหว่างเดินทาง + ขั้นตอนเปิดบัญชีสั้น ๆ + สิทธิพิเศษ`;
    else if(f<5e4) b=`CTA ชัด: เปิดบัญชี/ดาวน์โหลด 3 ขั้นตอน + โค้ด/สิทธิพิเศษของช่อง + ตอบคอมเมนต์ที่ถาม`;
    else b=`รีแคปฟีเจอร์ AI ที่ชอบที่สุด 1 อย่าง + "ถ้ายังไม่ได้ลอง เหลืออีก ${Math.max(0,DAYS-1-day)} วันสำหรับสิทธิพิเศษ" + ขั้นตอนเปิดบัญชี`; fmt=FORMATS[0]; }
  return {format:fmt,brief:b+"\n"+cta+"\n"+HASHTAGS}; }
const postKey=(d,day)=>rid(d)+"_"+day;
const postOf=(d,day)=>{ const p=POSTS[postKey(d,day)]; if(p&&(p.brief||p.format)) return Object.assign({sug:false},p); const b=briefFor(d,day); return {format:b.format,brief:b.brief,status:"plan",link:"",sug:true}; };
function openPost(d,day){ const p=postOf(d,day), ph=tlPhase(day), c=PHASES[ph-1].c, dow=dDow(day);
  $("#pcard").innerHTML=`<button class="kc-x" type="button" id="pc-x" aria-label="ปิด">×</button><div class="pc-top" style="--ph:${c}">${avatarEl(d)}<div><h3>${esc(d.name)}</h3><div class="d">${fmtN(d.f)} · ${esc(d.cat||"—")}<br>ระยะ ${ph} · ${esc(PHASES[ph-1].title)}</div></div><div class="day"><b>${DAY(day).getDate()}</b><small>${TH_M[DAY(day).getMonth()]} · ${dow}</small></div></div>
  <div class="pc-bd"><div class="pc-row"><label>รูปแบบ</label><select id="pc-fmt">${FORMATS.map(f=>`<option${f===p.format?" selected":""}>${esc(f)}</option>`).join("")}</select></div>
  <div class="pc-row"><label>แนวคอนเทนต์</label><div><textarea id="pc-brief">${esc(p.brief)}</textarea><div class="pc-hint">${p.sug?`<b>MIDI ร่างให้</b> ตามระยะ/สายของช่อง — แก้ได้เลย`:`แก้ล่าสุดโดย ${esc(p.by||"-")}`} · กด "ใช้ร่างของ MIDI" เพื่อคืนค่าเริ่มต้น</div></div></div>
  <div class="pc-row"><label>สถานะ</label><select id="pc-st">${STATUS.map(([k,l])=>`<option value="${k}"${k===p.status?" selected":""}>${l}</option>`).join("")}</select></div>
  <div class="pc-row"><label>ลิงก์โพสต์</label><input id="pc-link" type="url" placeholder="วางลิงก์เมื่อโพสต์แล้ว" value="${esc(p.link||"")}"></div>
  <div class="pc-acts"><div class="r"><button class="btn danger" type="button" id="pc-del">เอาออกจากวันนี้</button><button class="btn" type="button" id="pc-reset">ใช้ร่างของ MIDI</button></div><div class="r"><button class="btn" type="button" id="pc-cancel">ยกเลิก</button><button class="btn primary" type="button" id="pc-save">บันทึก</button></div></div></div>`;
  $("#pmodal").hidden=false; const close=()=>{ $("#pmodal").hidden=true; }; $("#pc-x").onclick=close; $("#pc-cancel").onclick=close;
  $("#pc-reset").onclick=()=>{ const b=briefFor(d,day); $("#pc-brief").value=b.brief; $("#pc-fmt").value=b.format; };
  $("#pc-del").onclick=()=>{ close(); setDates(d,datesOf(d).filter(x=>x!==day)); };
  $("#pc-save").onclick=()=>{ if(!reviewer){ askName(()=>$("#pc-save").click()); return; } const rec={key:postKey(d,day),kol:rid(d),name:d.name,day,format:$("#pc-fmt").value,brief:$("#pc-brief").value.trim(),status:$("#pc-st").value,link:$("#pc-link").value.trim(),by:reviewer}; const prev=POSTS[rec.key]; POSTS[rec.key]=rec; close(); render(); logEv("post",d.name+" "+day);
    api("setPost",[rec]).then(()=>toast(`บันทึกแนวคอนเทนต์ ${d.name} · ${dLabel(day)}`)).catch(err=>{ if(prev) POSTS[rec.key]=prev; else delete POSTS[rec.key]; render(); toast("บันทึกไม่สำเร็จ: "+(err&&err.message||err)); }); }; logEv("post-open",d.name+" "+day); }
$("#pmodal").addEventListener("click",e=>{ if(e.target.id==="pmodal") $("#pmodal").hidden=true; });
function renderPostList(all){ const el=$("#plist"); if(!el) return; const items=[]; all.forEach(d=>datesOf(d).forEach(day=>items.push({d,day,p:postOf(d,day)}))); items.sort((a,b)=>a.day-b.day||(b.d.f||0)-(a.d.f||0));
  if(!items.length){ el.innerHTML=`<div class="empty">ยังไม่มีโพสต์ในตาราง — กดรูปจาง ๆ ที่ MIDI แนะนำ หรือ "ใช้วันที่ MIDI วางไว้"</div>`; return; }
  let last=0; el.innerHTML=items.map(({d,day,p})=>{ const ph=tlPhase(day), c=PHASES[ph-1].c; const head=last!==ph?`<div class="gh">ระยะ ${ph} · ${esc(PHASES[ph-1].title)} · ${esc(rangeLabel(PHASES[ph-1]))}</div>`:""; last=ph; const st=STATUS.find(x=>x[0]===p.status)||STATUS[0];
    return head+`<div class="pl2" data-k="${esc(d.key)}" data-d="${day}" style="--ph:${c}"><div class="dy">${DAY(day).getDate()}<small>${TH_M[DAY(day).getMonth()]}</small></div>${avatarEl(d)}<div style="min-width:0"><div class="nm">${esc(d.name)}</div><div class="fm">${esc(p.format)}</div></div><div class="br${p.sug?" sug":""}">${esc(p.brief.split("\n")[0])}</div><div class="stt st-${p.status}">${st[1]}</div></div>`; }).join("");
  el.querySelectorAll(".pl2").forEach(r=>r.onclick=()=>{ const d=data.find(x=>x.key===r.dataset.k); if(d) openPost(d,+r.dataset.d); }); }
function setDates(d,ds){ if(!reviewer){ askName(()=>setDates(d,ds)); return; } ds=[...new Set(ds)].sort((a,b)=>a-b); const id=rid(d); const prev=reviews[id]; reviews[id]=Object.assign({},prev,{dates:ds.join(",")}); render(); logEv("dates",d.name+" → "+(ds.join(",")||"-"));
  api("setDates",[{key:id,name:d.name,dates:ds.join(","),by:reviewer}]).then(()=>toast(`${d.name}: ${ds.length?ds.map(dLabel).join(", "):"ไม่มีวัน"}`)).catch(err=>{ reviews[id]=prev; render(); toast("บันทึกไม่สำเร็จ: "+(err&&err.message||err)); }); }
/* MIDI วางวันให้: ใส่วันตามระยะ + ช่วงที่แนะนำ กระจายไม่ให้วันเดียวแน่น */
function autoDates(all){ const load={}; all.forEach(d=>datesOf(d).forEach(x=>load[x]=(load[x]||0)+1)); const out=[]; const AIP=aiPlan(all).pick;
  const pickDay=(days)=>{ let best=days[0], bl=Infinity; days.forEach(x=>{ const l=(load[x]||0)-(TL_W[x]||1)*0.5; if(l<bl){ bl=l; best=x; } }); load[best]=(load[best]||0)+1; return best; };
  const launch=TL_EV.find(e=>e.launch); const L=launch?launch.d:(PHASES[1]?PHASES[1].from:0);
  all.filter(d=>!datesOf(d).length).sort((a,b)=>(b.f||0)-(a.f||0)).forEach(d=>{ let ph=phasesOf(d); if(!ph.length&&AIP[d.key]) ph=AIP[d.key].ph; const ds=[]; const f=d.f||0;
    ph.forEach(n=>{ const days=phaseDays(n); if(!days.length) return; if(+n===2&&f>=3e5) ds.push(days.includes(L)?L:days[0]); else if(+n===2) ds.push(pickDay(days.filter(x=>x>=L).concat(days))); else ds.push(pickDay(days)); });
    if(!ph.length) ds.push(pickDay(phaseDays(Math.min(3,NP))));
    out.push({key:rid(d),name:d.name,dates:[...new Set(ds)].sort((a,b)=>a-b).join(","),by:reviewer}); });
  return out; }
function snapshot(label){ const snap={}; data.forEach(d=>{ const ds=datesOf(d); if(ds.length) snap[rid(d)]={name:d.name,dates:ds.join(",")}; }); if(!Object.keys(snap).length) return Promise.resolve(); return api("snapshotDates",[{by:reviewer,label,snap}]).catch(()=>{}); }
$("#sc-undo").onclick=()=>{ $("#umodal").hidden=false; $("#ulist").textContent="กำลังโหลด…"; api("listSnapshots",[]).then(list=>{ if(!list||!list.length){ $("#ulist").textContent="ยังไม่มีสำเนา — ระบบจะเก็บให้เองเมื่อกดล้างหรือใช้วันที่ MIDI วางไว้"; return; }
    $("#ulist").innerHTML=list.map(x=>`<button type="button" data-id="${esc(x.id)}"><span>${esc(x.label||"สำเนา")} · ${x.n} คน</span><small>${new Date(x.at).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"})} · ${esc(x.by||"")}</small></button>`).join("");
    $("#ulist").querySelectorAll("button").forEach(b=>b.onclick=()=>{ if(!reviewer){ askName(()=>b.click()); return; } $("#umodal").hidden=true; prog.manual=true; progStart(); api("restoreSnapshot",[{id:b.dataset.id,by:reviewer}]).then(()=>{ toast("กู้คืนแล้ว"); load(); }).catch(err=>{ progDone(); toast("กู้คืนไม่สำเร็จ: "+(err&&err.message||err)); }); }); }).catch(err=>{ $("#ulist").textContent="โหลดไม่สำเร็จ: "+(err&&err.message||err); }); };
$("#u-cancel").onclick=()=>{ $("#umodal").hidden=true; }; $("#umodal").addEventListener("click",e=>{ if(e.target.id==="umodal") $("#umodal").hidden=true; });
$("#sc-auto").onclick=async()=>{ if(!reviewer){ askName(()=>$("#sc-auto").onclick()); return; } const list=autoDates(teamList([...data].sort((a,b)=>(b.f||0)-(a.f||0))).all); if(!list.length){ toast("ทุกคนมีวันแล้ว"); return; } await snapshot("ก่อนใช้วันที่ MIDI วางไว้"); const prev={}; list.forEach(r=>{ prev[r.key]=reviews[r.key]; reviews[r.key]=Object.assign({},reviews[r.key],{dates:r.dates}); }); render(); logEv("auto-dates",list.length);
  api("setDatesMany",[list]).then(()=>toast(`วางวันให้ ${list.length} คนแล้ว — ลากขยับได้เลย`)).catch(err=>{ Object.assign(reviews,prev); render(); toast("บันทึกไม่สำเร็จ: "+(err&&err.message||err)); }); };
$("#sc-clear").onclick=async()=>{ if(!reviewer){ askName(()=>$("#sc-clear").onclick()); return; } if(!confirm("ล้างวันโพสต์ของทุกคน? (กู้คืนได้จากปุ่ม ↶ ย้อนกลับ)")) return; await snapshot("ก่อนล้างทั้งหมด"); const list=data.filter(d=>datesOf(d).length).map(d=>({key:rid(d),name:d.name,dates:"",by:reviewer})); list.forEach(r=>{ reviews[r.key]=Object.assign({},reviews[r.key],{dates:""}); }); render(); api("setDatesMany",[list]).then(()=>toast("ล้างแล้ว")).catch(()=>{ load(); }); };
function openCard(d){ const R=reviews[rid(d)]||{}, rv=rvOf(d), ph=phasesOf(d), t=TIERS.find(x=>x.k===d.tier); const rank=[...data].sort((a,b)=>(b.f||0)-(a.f||0)).indexOf(d)+1; const hs=histLine(d);
  $("#kcard").innerHTML=`<button class="kc-x" type="button" id="kc-x" aria-label="ปิด">×</button><div class="kc-top">${avatarEl(d)}<div><h3>${esc(d.name)}</h3><div class="ct">${esc(d.cat||"—")}</div>${codeLabel(d.code)?`<span class="badge code${codeSoft(d.code)?" soft":""}">${esc(codeLabel(d.code))}</span>`:""}${false?` <span class="badge art">ARTIST</span>`:""}</div></div>
  <div class="kc-bd"><div class="kc-k"><div><div class="l">ผู้ติดตาม</div><div class="v">${fmtN(d.f)}</div></div><div><div class="l">ระดับ</div><div class="v">${t?t.n:"—"}</div></div><div><div class="l">อันดับ reach</div><div class="v">#${rank}</div></div></div>
  <div class="kc-row">สถานะ: <b>${rv==="pass"?"✓ ยืนยันแล้ว":rv==="fail"?"✗ ตัดออกจากทีม":"อยู่ในทีม (ยังไม่ได้ยืนยัน)"}</b>${R.by?` · โดย ${esc(R.by)}`:""}${R.reason?`<br>เหตุผล: ${esc(R.reason)}`:""}</div>${hs?`<div class="kc-row">ประวัติ: ${esc(hs)}</div>`:""}${d.note?`<div class="kc-row">หมายเหตุ: ${esc(d.note).slice(0,300)}</div>`:""}
  ${inTeam(d)?`<div class="kc-row">ระยะในแผน:<div class="kc-ph">${PHASES.map(p=>`<button type="button" data-p="${p.n}" class="${ph.includes(p.n)?"on":""}" style="--ph:${p.c}">ระยะ ${p.n}</button>`).join("")}</div></div>`:""}
  <div class="kc-acts">${d.url?`<a class="btn" href="${esc(d.url)}" target="_blank" rel="noopener">เปิดโปรไฟล์ ↗</a>`:""}<button class="btn${rv==="pass"?" primary":""}" type="button" id="kc-pass">✓ ยืนยัน</button><button class="btn" type="button" id="kc-fail">✗ ตัดออก</button></div></div>`;
  $("#kmodal").hidden=false; $("#kc-x").onclick=closeCard; $("#kc-pass").onclick=()=>{ closeCard(); setReview(d,rv==="pass"?"":"pass",""); }; $("#kc-fail").onclick=()=>{ closeCard(); if(rv==="fail") setReview(d,"",""); else askReason(d); };
  $("#kcard").querySelectorAll(".kc-ph button").forEach(b=>b.onclick=()=>{ togglePhase(d,b.dataset.p); setTimeout(()=>openCard(d),50); }); logEv("card",d.name); }
function closeCard(){ $("#kmodal").hidden=true; }
$("#kmodal").addEventListener("click",e=>{ if(e.target.id==="kmodal") closeCard(); });
function histLine(d){ const hs=history[rid(d)]||[]; const fails=[...new Set(hs.filter(x=>x.status==="fail").map(x=>x.by).filter(Boolean))], passes=[...new Set(hs.filter(x=>x.status==="pass").map(x=>x.by).filter(Boolean))];
  const parts=[]; if(fails.length) parts.push("ไม่ผ่าน: "+fails.join(", ")); if(passes.length) parts.push("ผ่าน: "+passes.join(", ")); return parts.join(" · "); }
function rowEl(d,rankOf,reach,max,isNew){
    const st=statusOf(d), rk=rankOf.get(d), rv=rvOf(d), R=reviews[rid(d)]||{}; const row=document.createElement("div"); row.className="row"+(st?" "+st:"")+(rv?" "+rv:"")+(isNew?" sugnew":"");
    const nm=`<a href="#" class="open-card">${esc(d.name)}</a>`;
    row.innerHTML=`<div class="rk${rk<=10?" lead":""}">${d.sug?"★":rk}</div>
      <div class="who">${avatarEl(d)}<div class="who-t"><div class="nm">${nm}${codeLabel(d.code)?`<span class="badge code${codeSoft(d.code)?" soft":""}" title="${codeSoft(d.code)?"MiDi แนะนำ":"Code: "+esc(d.code)}">${esc(codeLabel(d.code))}</span>`:""}${false?`<span class="badge art">ARTIST</span>`:""}${d.sug?`<span class="badge sug" title="เพิ่มโดย ${esc(d.by)}">เพิ่มใหม่ · ${esc(d.by||"ลูกค้า")}</span>`:""}${st?`<span class="badge ${st}">${st==="new"?"NEW":"EDIT"}</span>`:""}</div><div class="ct" title="${esc(d.cat)}">${esc(d.cat||"—")}</div></div></div>
      <div class="trk" title="${fmtN(d.f)} ผู้ติดตาม"><div class="fill" style="width:${(widthOf(d.f,max)*100).toFixed(2)}%;background:${heat(d.f)}"></div></div>
      <div class="val">${fmtN(d.f)}<small>${d.f?Math.round(d.f/reach*1000)/10+"% ของ reach":"ไม่ระบุ"}</small></div>
      <div class="rvw"><span class="rv-lbl ${rv||"wait"}">${rv==="pass"?"✓ ยืนยัน":rv==="fail"?"✗ ตัดออก":"ในทีม"}</span><div class="rv" title="ติ๊กผลพิจารณา"><button type="button" class="pass${rv==="pass"?" on":""}" data-s="pass">✓ ผ่าน</button><button type="button" class="fail${rv==="fail"?" on":""}" data-s="fail">✗ ตัดออก</button></div>${rv&&R.by?`<div class="meta" title="${esc((R.by||"")+(R.reason?" · "+R.reason:""))}"><b>${rv==="fail"?"✗":"✓"} ${esc(R.by)}</b>${R.reason?` · ${esc(R.reason)}`:""}</div>`:""}${histLine(d)?`<div class="meta" title="${esc(histLine(d))}">${esc(histLine(d))}</div>`:""}</div>`;
    row.querySelectorAll(".rv button").forEach(b=>b.onclick=()=>{ const s=rv===b.dataset.s?"":b.dataset.s; if(s==="fail") askReason(d); else setReview(d,s,""); });
    row.querySelector(".open-card").onclick=e=>{ e.preventDefault(); openCard(d); }; row.querySelector(".av").onclick=()=>openCard(d); row.querySelector(".av").style.cursor="pointer";
    return row;
}
$("#q").addEventListener("input",e=>{q=e.target.value.trim().toLowerCase();render();}); $("#q").addEventListener("change",e=>{ if(e.target.value.trim()) logEv("search",e.target.value.trim()); });
$("#ack").onclick=()=>{ baseline={}; data.forEach(d=>baseline[d.key]=d.h); try{localStorage.setItem("kol_ladder_seen",JSON.stringify(baseline));}catch(e){} render(); };
$("#who").onclick=askName;
render();

function parseGrid(grid){ return parseRows(grid.map(r=>r.map(c=>{ c=c==null?"":String(c); return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c; }).join(",")).join("\n")); }
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>el.hidden=true,2600); }
function setStatus(cls,txt){ const d=$("#dot"); d.className="dot"+(cls?" "+cls:""); $("#status").textContent=txt; }
function setStamp(ms){ $("#stamp").textContent="อัปเดตล่าสุด "+new Date(ms).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"}); }
function showMsg(html){ const m=$("#msg"); m.hidden=!html; m.innerHTML=html||""; }
function showName(){ $("#who-n").textContent=reviewer||"ยังไม่ระบุชื่อ"; }
let pendingAction=null;
function askName(next){ pendingAction=typeof next==="function"?next:null; $("#name-in").value=reviewer; $("#modal").hidden=false; setTimeout(()=>$("#name-in").focus(),50); }
$("#name-cancel").onclick=()=>{ $("#modal").hidden=true; pendingAction=null; };
$("#name-ok").onclick=()=>{ const v=$("#name-in").value.trim(); if(!v){ $("#name-in").focus(); return; } reviewer=v; try{localStorage.setItem("kol_reviewer",v);}catch(e){} showName(); logEv("name",v); $("#modal").hidden=true; const a=pendingAction; pendingAction=null; if(a) a(); };
$("#name-in").addEventListener("keydown",e=>{ if(e.key==="Enter") $("#name-ok").click(); });
let rTarget=null, rSel=new Set();
function askReason(d){ if(!reviewer){ askName(()=>askReason(d)); return; } rTarget=d; rSel=new Set(); $("#r-title").textContent=`ตัด ${d.name} ออกเพราะอะไร?`; $("#r-note").value="";
  $("#r-chips").innerHTML=REASONS.map((r,i)=>`<button type="button" data-i="${i}">${esc(r)}</button>`).join("");
  $("#r-chips").querySelectorAll("button").forEach(b=>b.onclick=()=>{ const r=REASONS[+b.dataset.i]; rSel.has(r)?rSel.delete(r):rSel.add(r); b.classList.toggle("on",rSel.has(r)); });
  $("#rmodal").hidden=false; }
$("#r-cancel").onclick=()=>{ $("#rmodal").hidden=true; rTarget=null; };
$("#r-ok").onclick=()=>{ if(!rTarget) return; const note=$("#r-note").value.trim(); const reason=[...rSel].concat(note?[note]:[]).join(", "); if(!reason){ $("#r-note").placeholder="เลือกหรือพิมพ์เหตุผลอย่างน้อย 1 ข้อ"; $("#r-note").focus(); return; } const d=rTarget; $("#rmodal").hidden=true; rTarget=null; setReview(d,"fail",reason); };
function setReview(d,status,reason){ if(!reviewer){ askName(()=>setReview(d,status,reason)); return; }
  const id=rid(d); const prev=reviews[id]; reviews[id]=Object.assign({},prev,{status,by:reviewer,reason:reason||"",at:Date.now()}); if(!history[id]) history[id]=[]; if(status) history[id].push({status,by:reviewer}); render();
  logEv("review",(status||"clear")+" | "+d.name);
  const fails=data.filter(x=>rvOf(x)==="fail").length, short=TARGET-(data.length-fails);
  api("setReview",[{key:id,name:d.name,status,by:reviewer,reason:reason||"",code:d.code||"",extra:status==="fail"?`ไม่ผ่านแล้ว ${fails} คน · ${short>0?`ต้องหา KOL เพิ่มอีก ${short} คน`:`ยังพอครบ ${TARGET} (เผื่อ ${-short} คน)`}`:""}])
    .then(()=>{ toast(status?`บันทึกแล้ว: ${d.name} — ${status==="pass"?"ยืนยัน":"ตัดออกจากทีม"}`:`คืน ${d.name} กลับเข้าทีม`); })
    .catch(err=>{ reviews[id]=prev; render(); toast("บันทึกไม่สำเร็จ: "+(err&&err.message||err)); }); }
function sugRows(list){ return (list||[]).map((s,i)=>{ const it={idx:1000+i,group:"เพิ่มใหม่",name:String(s.name||"").trim(),cat:String(s.cat||"").trim(),fRaw:String(s.f||""),link:String(s.link||""),note:String(s.note||""),sug:true,by:String(s.by||"")}; it.f=num(it.fRaw); it.tier=tierOf(it.f); it.url=linkOf(it.link); it.artist=false; it.key="s:"+it.name.toLowerCase(); it.h=hash([it.cat,it.fRaw,it.link,it.note].join("|")); return it; }).filter(x=>x.name); }
function applyPayload(p){ const rows=parseGrid(p.grid||[]).concat(sugRows(p.suggestions)); if(!rows.length) throw new Error("empty");
  if(!baseline){ baseline={}; rows.forEach(d=>baseline[d.key]=d.h); try{ const s=JSON.parse(localStorage.getItem("kol_ladder_seen")||"null"); if(s&&typeof s==="object") baseline=s; }catch(e){} }
  data=rows; const m={}; (p.reviews||[]).forEach(r=>{ m[r.key]=r; }); reviews=m; POSTS={}; (p.posts||[]).forEach(x=>{ POSTS[x.key]=x; }); history=p.history||{}; if(Array.isArray(p.reasons)&&p.reasons.length) REASONS=p.reasons; render(); progDone(); setStamp(p.at||Date.now()); setStatus("on","LIVE · อัปเดตทุก 30 วิ"); showMsg(""); }
/* ---- suggestions ---- */
$("#suggest").onclick=()=>{ if(!reviewer){ askName(()=>$("#suggest").onclick()); return; } $("#smodal").hidden=false; setTimeout(()=>$("#s-name").focus(),50); };
$("#s-cancel").onclick=()=>{ $("#smodal").hidden=true; };
$("#s-ok").onclick=()=>{ const s={name:$("#s-name").value.trim(),link:$("#s-link").value.trim(),f:$("#s-f").value.trim(),cat:$("#s-cat").value.trim(),note:$("#s-note").value.trim(),by:reviewer,vid:VID};
  if(!s.name){ $("#s-name").focus(); return; } $("#s-ok").disabled=true;
  api("addSuggestion",[s]).then(()=>{ $("#s-ok").disabled=false; $("#smodal").hidden=true; ["s-name","s-link","s-f","s-cat","s-note"].forEach(i=>$("#"+i).value=""); toast("เพิ่มแล้ว: "+s.name); logEv("suggest",s.name); load(); })
    .catch(err=>{ $("#s-ok").disabled=false; toast("บันทึกไม่สำเร็จ: "+(err&&err.message||err)); }); };
/* ---- activity log (anonymous visitor id + events, batched) ---- */
let VID=""; try{ VID=localStorage.getItem("kol_vid")||""; if(!VID){ VID="v_"+Math.random().toString(36).slice(2,10)+Date.now().toString(36); localStorage.setItem("kol_vid",VID); } }catch(e){ VID="v_tmp"+Math.random().toString(36).slice(2,8); }
const META={ua:navigator.userAgent,screen:screen.width+"x"+screen.height,lang:navigator.language,tz:(Intl.DateTimeFormat().resolvedOptions().timeZone||""),ref:document.referrer||""};
const logQ=[]; const t0=Date.now();
function logEv(ev,detail){ logQ.push({t:Date.now(),vid:VID,who:reviewer||"",ev,detail:String(detail||"").slice(0,200),dur:Math.round((Date.now()-t0)/1000)}); if(logQ.length>=12) flushLog(); }
function flushLog(){ if(!logQ.length) return; const batch=logQ.splice(0,logQ.length); try{ api("logEvents",[batch,META]).catch(()=>{}); }catch(e){} }
setInterval(flushLog,20000); document.addEventListener("visibilitychange",()=>{ if(document.hidden){ logEv("hide"); flushLog(); } }); window.addEventListener("pagehide",()=>{ logEv("leave"); flushLog(); });
logEv("open",location.href.slice(0,120));
document.addEventListener("click",e=>{ const a=e.target.closest("a[href]"); if(a) logEv("link",a.href); });
let prog={t:null,v:0};
function ovSet(v,on){ const o=$("#ov"); o.hidden=!on; if(on){ o.firstElementChild.style.setProperty("--p",v); $("#ov-p").textContent=v+"%"; } }
function progStart(){ const el=$("#prog"); el.classList.remove("done"); prog.v=0; el.firstElementChild.style.width="0%"; clearInterval(prog.t); const t0=Date.now(); if(!data.length||prog.manual) ovSet(0,true);
  prog.t=setInterval(()=>{ const s=(Date.now()-t0)/1000; prog.v=Math.min(92,Math.round(100*(1-Math.exp(-s/4)))); el.firstElementChild.style.width=prog.v+"%"; setStatus("warn",`กำลังโหลดข้อมูล… ${prog.v}%`); if(!$("#ov").hidden) ovSet(prog.v,true); if(s>40){ clearInterval(prog.t); setStatus("warn","โหลดช้าผิดปกติ"); showMsg("โหลดนานเกิน 40 วินาที — ลองกดรีเฟรช หรือตรวจว่าสคริปต์ได้รับสิทธิ์เข้าถึงชีตแล้ว (เปิด Apps Script → รัน setup)"); } },200); }
function progDone(){ clearInterval(prog.t); prog.manual=false; const el=$("#prog"); el.firstElementChild.style.width="100%"; el.classList.add("done"); if(!$("#ov").hidden){ ovSet(100,true); setTimeout(()=>ovSet(100,false),350); } }
function skeleton(n){ const s=$("#skel"); if(!s) return; s.innerHTML=Array.from({length:n},(_,i)=>`<div><span style="width:28px"></span><span style="width:${120+((i*37)%90)}px"></span><span style="flex:1;max-width:${30+((i*53)%50)}%"></span><span style="width:50px"></span></div>`).join(""); }
function load(){ progStart(); setStatus("warn","กำลังโหลดข้อมูล… 0%"); api("getData",[]).then(p=>{ try{ applyPayload(p); }catch(e){ setStatus("warn","อ่านข้อมูลไม่ได้"); showMsg("อ่านข้อมูลจากชีตไม่ได้ — ตรวจรูปแบบตารางต้นทาง"); } })
  .catch(err=>{ clearInterval(prog.t); ovSet(0,false); const m=String(err&&err.message||err); if(/ยังไม่ได้รับอนุญาต|ถูกปฏิเสธ/.test(m)){ try{ localStorage.removeItem("kol_access"); }catch(e){} ACCESS=null; gateShow(/ปฏิเสธ/.test(m)?"gate-denied":"gate-form"); return; } setStatus("warn","โหลดไม่สำเร็จ"); showMsg("โหลดข้อมูลไม่สำเร็จ: "+m); }); }
$("#refresh").onclick=()=>{ prog.manual=true; load(); }; showName(); skeleton(8);
/* ===== ประตูหน้าแรก: ขอสิทธิ์ → ทีม MIDI อนุมัติ ===== */
let ACCESS=null; try{ ACCESS=JSON.parse(localStorage.getItem("kol_access")||"null"); }catch(e){}
const isAdmin=()=>!!(ACCESS&&ACCESS.admin);
function gateShow(id){ ["gate-form","gate-staff","gate-wait","gate-denied"].forEach(x=>$("#"+x).hidden=x!==id); $("#gate").hidden=false; }
function gateOpen(){ ovSet(0,false); clearInterval(prog.t); setStatus("",""); $("#gate").hidden=true; if(ACCESS&&ACCESS.name&&!reviewer){ reviewer=ACCESS.name; try{localStorage.setItem("kol_reviewer",reviewer);}catch(e){} showName(); } $("#adm-btn").hidden=!isAdmin(); load(); setInterval(()=>{ if(!document.hidden) load(); },30000); document.addEventListener("visibilitychange",()=>{ if(!document.hidden) load(); }); if(isAdmin()) { admCount(); setInterval(admCount,30000); } }
function gateSave(a){ ACCESS=a; try{ localStorage.setItem("kol_access",JSON.stringify(a)); }catch(e){} }
let gatePoll=null;
function gateWait(name,phone){ gateShow("gate-wait"); $("#g-who").textContent=`👤 ${name} · ${phone}`; clearInterval(gatePoll); let n=0;
  const check=()=>api("accessStatus",[{vid:VID}]).then(r=>{ n++; $("#g-st").textContent=`ตรวจสถานะอัตโนมัติทุก 10 วินาที · ตรวจแล้ว ${n} ครั้ง`; if(r&&r.status==="approved"){ clearInterval(gatePoll); gateSave({vid:VID,name:r.name||name,phone,admin:!!r.admin,at:Date.now()}); gateOpen(); } else if(r&&r.status==="denied"){ clearInterval(gatePoll); gateShow("gate-denied"); } }).catch(()=>{});
  gatePoll=setInterval(check,10000); }
$("#g-send").onclick=()=>{ const name=$("#g-name").value.trim(), phone=$("#g-phone").value.trim(); const err=t=>{ $("#g-err").textContent=t; $("#g-err").hidden=false; };
  if(name.length<2){ err("กรุณาใส่ชื่อ"); $("#g-name").focus(); return; } if(phone.replace(/\D/g,"").length<9){ err("กรุณาใส่เบอร์โทรให้ครบ"); $("#g-phone").focus(); return; }
  $("#g-err").hidden=true; $("#g-send").disabled=true; $("#g-send").textContent="กำลังส่ง…";
  api("requestAccess",[{vid:VID,name,phone,ua:navigator.userAgent.slice(0,120)}]).then(r=>{ $("#g-send").disabled=false; $("#g-send").textContent="ขอเข้าดูบอร์ด"; try{ localStorage.setItem("kol_gate_req",JSON.stringify({name,phone})); }catch(e){}
    if(r&&r.status==="approved"){ gateSave({vid:VID,name,phone,admin:!!r.admin,at:Date.now()}); gateOpen(); } else if(r&&r.status==="denied"){ gateShow("gate-denied"); } else gateWait(name,phone); })
  .catch(e=>{ $("#g-send").disabled=false; $("#g-send").textContent="ขอเข้าดูบอร์ด"; err("ส่งคำขอไม่สำเร็จ: "+(e&&e.message||e)); }); };
["#g-name","#g-phone"].forEach(sel=>$(sel).addEventListener("keydown",e=>{ if(e.key==="Enter") $("#g-send").click(); }));
$("#g-staff-link").onclick=e=>{ e.preventDefault(); gateShow("gate-staff"); $("#g-sname").value=reviewer||""; setTimeout(()=>$("#g-code").focus(),50); };
$("#g-back").onclick=e=>{ e.preventDefault(); gateShow("gate-form"); };
$("#g-staff-ok").onclick=()=>{ const code=$("#g-code").value.trim(), name=$("#g-sname").value.trim(); const err=t=>{ $("#g-serr").textContent=t; $("#g-serr").hidden=false; }; if(!/^\d{4}$/.test(code)){ err("ใส่รหัส 4 หลัก"); return; } if(!name){ err("กรุณาใส่ชื่อ"); return; }
  $("#g-staff-ok").disabled=true; api("staffLogin",[{vid:VID,code,name}]).then(r=>{ $("#g-staff-ok").disabled=false; if(!r||!r.ok){ err((r&&r.msg)||"รหัสไม่ถูกต้อง"); return; } gateSave({vid:VID,name,phone:"",admin:true,at:Date.now()}); reviewer=name; try{localStorage.setItem("kol_reviewer",name);}catch(e){} showName(); gateOpen(); }).catch(e=>{ $("#g-staff-ok").disabled=false; err("ตรวจรหัสไม่สำเร็จ: "+(e&&e.message||e)); }); };
["#g-code","#g-sname"].forEach(sel=>$(sel).addEventListener("keydown",e=>{ if(e.key==="Enter") $("#g-staff-ok").click(); }));
$("#g-retry").onclick=()=>gateShow("gate-form");
/* admin: คำขอเข้าดู */
function admCount(){ api("listAccess",[{vid:VID}]).then(list=>{ const n=(list||[]).filter(x=>x.status==="pending").length; $("#adm-n").textContent=n; $("#adm-btn").classList.toggle("hot",n>0); }).catch(()=>{}); }
$("#adm-btn").onclick=()=>{ $("#amodal").hidden=false; $("#alist").textContent="กำลังโหลด…"; api("listAccess",[{vid:VID}]).then(list=>{ list=list||[]; const pend=list.filter(x=>x.status==="pending"), rest=list.filter(x=>x.status!=="pending").slice(0,20);
    const row=x=>`<div class="req${x.status!=="pending"?" done":""}"><div class="avc">${esc(String(x.name||"?").trim().slice(0,1))}</div><div><div class="nm">${esc(x.name)}${x.role==="admin"?" · ทีมงาน":""}</div><div class="ph">${esc(x.phone||"")}${x.phone?" · ":""}ขอเมื่อ ${new Date(x.at).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"})}${x.ua?" · "+esc(x.ua):""}</div></div>${x.status==="pending"?`<div class="acts"><button class="btn primary" data-v="${esc(x.vid)}" data-s="approved">อนุมัติ</button><button class="btn" data-v="${esc(x.vid)}" data-s="denied">ปฏิเสธ</button></div>`:`<div class="tag${x.status==="approved"?"":" no"}">${x.status==="approved"?"✓ อนุมัติ":"✗ ปฏิเสธ"}${x.by?" โดย "+esc(x.by):""}${x.decidedAt?" "+new Date(x.decidedAt).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"}):""}</div>`}</div>`;
    $("#alist").innerHTML=(pend.length?`<div class="gh">รออนุมัติ ${pend.length}</div>`+pend.map(row).join(""):`<div class="empty">ไม่มีคำขอค้าง</div>`)+(rest.length?`<div class="gh">ล่าสุด</div>`+rest.map(row).join(""):"");
    $("#alist").querySelectorAll("button[data-v]").forEach(b=>b.onclick=()=>{ b.disabled=true; api("setAccess",[{vid:VID,target:b.dataset.v,status:b.dataset.s,by:reviewer||ACCESS.name}]).then(()=>{ toast(b.dataset.s==="approved"?"อนุมัติแล้ว — หน้าของเขาจะเปิดเอง":"ปฏิเสธแล้ว"); logEv("access",b.dataset.s+" "+b.dataset.v); $("#adm-btn").click(); admCount(); }).catch(err=>{ b.disabled=false; toast("ไม่สำเร็จ: "+(err&&err.message||err)); }); }); }).catch(err=>{ $("#alist").textContent="โหลดไม่สำเร็จ: "+(err&&err.message||err); }); };
$("#a-close").onclick=()=>{ $("#amodal").hidden=true; }; $("#amodal").addEventListener("click",e=>{ if(e.target.id==="amodal") $("#amodal").hidden=true; });
/* เริ่มต้น */
if(ACCESS&&ACCESS.vid===VID){ gateOpen(); } else { gateShow("gate-form"); try{ const q=JSON.parse(localStorage.getItem("kol_gate_req")||"null"); if(q){ $("#g-name").value=q.name||""; $("#g-phone").value=q.phone||""; api("accessStatus",[{vid:VID}]).then(r=>{ if(r&&r.status==="approved"){ gateSave({vid:VID,name:r.name||q.name,phone:q.phone,admin:!!r.admin,at:Date.now()}); gateOpen(); } else if(r&&r.status==="pending") gateWait(q.name,q.phone); }).catch(()=>{}); } }catch(e){} }


/* ===== ร่ม + แรงเหวี่ยงข่าว — 2 ดีไซน์: ripple (วงคลื่น) / flow (เส้นทางข่าว) ===== */
function renderUmbrella(design){ const U=window.KOL_UMBRELLA, el=$("#umbrella"); if(!U||!el) return; design=design||CFG.UMBRELLA_DESIGN||"ripple"; el.dataset.design=design;
  const W=U.waves; let cur=0;
  const panel=i=>{ const w=W[i]; return `<div class="um-panel" style="--c:${w.c}"><div class="um-when">${esc(w.when)}</div><h4>${esc(w.t)}</h4><div class="um-who">${esc(w.who)}</div><p>${esc(w.say)}</p><div class="um-hook">${esc(w.hook)}</div></div>`; };
  const head=`<div class="um-head"><div class="um-k">ร่มของวันที่ 29 — คำเดียว ทุกคนพูดเหมือนกัน</div><div class="um-word">${esc(U.word)}</div><div class="um-sub">${esc(U.sub)}</div><div class="um-line">“${esc(U.line)}”</div></div>`;
  let viz="";
  if(design==="ripple"){
    const cx=300, cy=300, R=[92,134,172,208,241,272], ang=i=>(-92+i*33)*Math.PI/180;
    const rings=W.map((w,i)=>{ const a=ang(i), lx=cx+R[i]*Math.cos(a), ly=cy+R[i]*Math.sin(a); const inner=i?R[i-1]:62; const mid=(R[i]+inner)/2;
      return `<g class="um-ring" data-i="${i}" style="--c:${w.c}"><circle cx="${cx}" cy="${cy}" r="${mid}" class="um-band" stroke-width="${R[i]-inner-2}"/><circle cx="${cx}" cy="${cy}" r="${R[i]}" class="um-c"/><g class="um-lbl" transform="translate(${lx},${ly})"><rect x="-44" y="-13" width="88" height="27" rx="13"/><text class="um-t" y="-1"><tspan>${esc(w.t)}</tspan></text><text class="um-t s" y="10">${esc(w.when)}</text></g></g>`; }).reverse().join("");
    viz=`<div class="um-viz"><svg viewBox="0 0 600 600" class="um-svg" aria-label="แรงเหวี่ยงข่าว">
      <defs><radialGradient id="umg" cx="50%" cy="50%"><stop offset="0" stop-color="#e8194c"/><stop offset="1" stop-color="#b3103a"/></radialGradient></defs>
      ${rings}
      <circle class="um-pulse" cx="${cx}" cy="${cy}" r="60"/>
      <g class="um-core" data-i="0"><circle cx="${cx}" cy="${cy}" r="60" fill="url(#umg)"/><text x="${cx}" y="${cy-6}" class="um-core-t">29 ต.ค.</text><text x="${cx}" y="${cy+14}" class="um-core-s">เวทีแถลง</text></g>
    </svg><div class="um-side" id="um-side">${panel(0)}</div></div>
    <div class="um-legend">กดวงไหน = ดูว่าช่วงนั้นใครพูดอะไร · วงใกล้กลาง = เร็วและเข้มกว่า · ข่าวเหวี่ยงจากเวทีออกไปถึงวันที่ 20 พ.ย.</div>`;
  } else {
    const cols=["29 ต.ค.","30–31","1–8 พ.ย.","9–10 พ.ย.","11–15","16–20"];
    const POS=[[3,4,5],[3,4,5,6,7],[3,4,5,7]]; // คอลัมน์ของโหนดแต่ละสาย (2 = 29 ต.ค. คือเวที)
    const lanes=U.lanes.map((l,li)=>`<div class="um-lane-k" style="--c:${l.c};grid-row:${li+2}">${esc(l.k)}</div>`+l.nodes.map((n,ni)=>{ const col=POS[li][ni]||ni+3; return `<div class="um-node" data-i="${col-2}" style="--c:${l.c};grid-column:${col};grid-row:${li+2}">${esc(n)}</div>`; }).join("")).join("");
    viz=`<div class="um-flow">
      <div class="um-col-k"></div>${cols.map((c,i)=>`<div class="um-col${i===3?" launch":""}" data-i="${i}" style="grid-column:${i+2};grid-row:1">${c}${i===3?"<small>เปิดใช้จริง</small>":""}${i===0?"<small>เวทีแถลง</small>":""}</div>`).join("")}
      <div class="um-stage" data-i="0" style="grid-column:2;grid-row:2/5"><b>เวที 29</b><span>ทุกสายเริ่มจากประโยคเดียวกัน</span><i></i></div>
      ${lanes}
      <div class="um-merge" style="grid-column:5;grid-row:5"><i></i><b>จุดบรรจบ 9 พ.ย.</b><span>สื่อ + KOL + ช่องแบรนด์ ออกพร้อมกัน = เห็นทุกที่ใน 48 ชม.</span></div>
      <div class="um-end" style="grid-column:6/8;grid-row:5"><b>ปลายทางเดียว</b><span>ทุกเส้นจบที่หน้าเปิดบัญชี/จองคิว — ไม่มีหน้ารับ = คนหายระหว่างทาง</span></div>
    </div><div class="um-side" id="um-side">${panel(0)}</div>
    <div class="um-legend">3 สาย (สื่อ · KOL · ช่องของแบรนด์) แตกจากเวทีเดียวกัน แล้วมาบรรจบวันที่ 9 — กดจุดไหนดูได้ว่าช่วงนั้นใครพูดอะไร</div>`;
  }
  el.innerHTML=`<section class="box um" data-design="${design}">${head}${viz}</section>`;
  const sel=i=>{ cur=i; $("#um-side").innerHTML=panel(i); el.querySelectorAll("[data-i]").forEach(n=>n.classList.toggle("on",+n.dataset.i===i)); };
  el.querySelectorAll("[data-i]").forEach(n=>{ n.addEventListener("click",()=>sel(+n.dataset.i)); n.addEventListener("mouseenter",()=>{ el.querySelectorAll("[data-i]").forEach(x=>x.classList.toggle("hov",+x.dataset.i===+n.dataset.i)); }); n.addEventListener("mouseleave",()=>el.querySelectorAll(".hov").forEach(x=>x.classList.remove("hov"))); });
  sel(0);
  // เล่นเองช้า ๆ จนกว่าจะมีคนกด
  let auto=setInterval(()=>sel((cur+1)%W.length),design==="flow"?2600:4000); el.addEventListener("click",()=>{ clearInterval(auto); auto=null; },{once:true});
}
/* ===== หน้ากลยุทธ์ (ข้อมูลจาก strategy.js) ===== */
function renderStrategy(){ const S=window.KOL_STRATEGY, el=$("#strategy"); if(!S||!el||el.dataset.done) return; el.dataset.done=1; let plan=0; try{ plan=+localStorage.getItem("kol_plan")||0; }catch(e){}
  const li=a=>a.map(x=>`<li>${esc(x)}</li>`).join("");
  const planHtml=P=>`
    <section class="box st-plan" style="--ph:${P.id==="A"?"#0A5BFF":"#0B1052"}">
      <div class="st-plan-h"><div><div class="st-k">${esc(P.name)}</div><h3>${esc(P.big)}</h3><div class="st-tag">${esc(P.tag)}</div></div></div>
      <p class="st-why">${esc(P.why)}</p>
      <div class="st-grid3">${P.offer.map(o=>`<div class="st-card"><b>${esc(o[0])}</b><span>${esc(o[1])}</span>${o[2]?`<small>${esc(o[2])}</small>`:""}</div>`).join("")}</div>
      <div class="st-head">พาดหัวที่อยากให้สื่อใช้</div><div class="st-headline">“${esc(P.headline)}”</div>
      <div class="st-head">CEO พูดอะไรบนเวที 29 ต.ค. (ลำดับ ~13 นาที)</div>
      <ol class="st-ceo">${P.ceo.map(c=>`<li><b>${esc(c[0])}</b><span>${esc(c[1])}</span></li>`).join("")}</ol>
      <div class="st-head">ใครพูดอะไร เมื่อไร</div>
      <div class="st-voices">${P.voices.map(v=>`<div class="st-v"><b>${esc(v[0])}</b><span>${esc(v[1])}</span><small>${esc(v[2])}</small></div>`).join("")}</div>
      <div class="st-head">สัดส่วนน้ำหนัก 4 ระยะ</div>
      <div class="pw-split st-split">${P.share.map((s,i)=>`<div style="width:${s}%;background:${PHASES[i]?PHASES[i].c:"#999"}">ระยะ ${i+1} · ${s}%</div>`).join("")}</div>
      <div class="st-grid2">
        <div><div class="st-head">KPI</div><div class="st-list">${P.kpi.map(k=>`<div class="st-kpi"><b>${esc(k[0])}</b><span>${esc(k[1])}</span>${k[2]?`<em>${esc(k[2])}</em>`:""}</div>`).join("")}</div></div>
        <div><div class="st-head">ความเสี่ยง → วิธีรับมือ</div><div class="st-list">${P.risks.map(r=>`<div class="st-risk"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join("")}</div></div>
      </div>
    </section>`;
  el.innerHTML=`
    <div id="umbrella"></div>
    <section class="box st-top"><div class="st-k">กลยุทธ์สื่อสาร · PESO × RACE</div><h2 class="st-title">${esc(S.title)}</h2><div class="st-sub">${esc(S.sub)}</div>
      <div class="st-phases">${S.phases.map((p,i)=>`<div style="--ph:${PHASES[i]?PHASES[i].c:"#999"}"><b>${esc(p[0])}</b><small>${esc(p[1])}</small><span>${esc(p[2])}</span></div>`).join("")}</div>
    </section>
    <section class="box st-gap"><h3>${esc(S.gap.h)}</h3><p>${esc(S.gap.p)}</p><div class="st-grid4">${S.gap.rules.map((r,i)=>`<div class="st-rule"><i>${i+1}</i><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join("")}</div></section>
    <section class="box"><h2>${esc(S.insight.h)}</h2><div class="st-grid4">${S.insight.cards.map(c=>`<div class="st-card"><b>${esc(c[0])}</b><span>${esc(c[1])}</span>${c[2]?`<small>${esc(c[2])}</small>`:""}</div>`).join("")}</div></section>
    <div class="band st-band">
      <section class="box"><h2>${esc(S.product.h)}</h2><div class="st-say"><div><div class="st-head ok">✓ พูดแบบนี้</div><ul>${li(S.product.say)}</ul></div><div><div class="st-head no">✗ ห้ามพูด</div><ul>${li(S.product.dont)}</ul></div></div></section>
      <section class="box"><h2>กลุ่มเป้าหมาย 3 กลุ่ม — แต่ละกลุ่มต้องได้ยินอะไร</h2><div class="st-aud">${S.audiences.map(a=>`<div><b>${esc(a[0])}</b><small>${esc(a[1])}</small><q>${esc(a[2])}</q><em>${esc(a[3])}</em></div>`).join("")}</div></section>
    </div>
    <section class="box st-choose"><h2>เลือกทิศทางการเปิดตัว <span class="h-sub">กดเพื่อดูรายละเอียดแต่ละแผน — เลือกทำทั้งคู่ได้</span></h2>
      <div class="seg st-seg">${S.plans.map((p,i)=>`<button type="button" data-i="${i}" class="${i===plan?"active":""}">${esc(p.name)}</button>`).join("")}</div>
      <div class="st-decide">${S.decide.map(d=>`<div><b>${esc(d[0])}</b><span>${esc(d[1])}</span></div>`).join("")}</div>
    </section>
    <div id="st-plan-body">${planHtml(S.plans[plan])}</div>
    <section class="box"><h2>PESO — KOL อยู่ตรงไหนของภาพใหญ่</h2><div class="st-grid4">${S.peso.map(p=>`<div class="st-card${p[0]==="Shared"?" hi":""}"><b>${esc(p[0])}</b><span>${esc(p[1])}</span><small>${esc(p[2])}</small></div>`).join("")}</div></section>
    <div class="band st-band">
      <section class="box"><h2>Run-of-show งานแถลงข่าว 29 ต.ค.</h2><div class="st-ros">${S.pressday.map(r=>`<div><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join("")}</div></section>
      <section class="box"><h2>FAQ — คำตอบเดียวกันทุกคน</h2><div class="st-faq">${S.faq.map(f=>`<div><b>${esc(f[0])}</b><span>${esc(f[1])}</span></div>`).join("")}</div></section>
    </div>
    <section class="box st-cta"><div><b>พร้อมดูรายชื่อ KOL ที่ MIDI คัดให้แล้ว</b><span>ทุกคนอยู่ในทีมตั้งแต่แรก — ตัดออกเฉพาะคนที่ไม่ต้องการ</span></div><button class="btn primary" type="button" id="st-go">ดูรายชื่อ KOL →</button></section>
    <p class="st-src">อ้างอิง: ${S.sources.map(s=>`<a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(" · ")} · ตัวเลขที่ติดป้าย “ประมาณการ” ยังไม่ยืนยันกับลูกค้า</p>`;
  renderUmbrella();
  el.querySelectorAll(".st-seg button").forEach(b=>b.onclick=()=>{ plan=+b.dataset.i; el.querySelectorAll(".st-seg button").forEach(x=>x.classList.toggle("active",x===b)); $("#st-plan-body").innerHTML=planHtml(S.plans[plan]); try{localStorage.setItem("kol_plan",plan);}catch(e){} try{ logEv("plan",S.plans[plan].id); }catch(e){} });
  $("#st-go").onclick=()=>setTab("review");
}
try{ renderStrategy(); }catch(e){ console.error(e); }
window.KOL={$,esc,setTab,renderUmbrella,logEv,flushLog,api,toast,render,posts:()=>POSTS,reviewer:()=>reviewer,tab:()=>TAB,_dbg:()=>({data,inTeam,autoDates,aiPlan,phaseDays,TL_DAYS,tlPhase})}; // ให้ planmedia.js ใช้
})();
