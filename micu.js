/* ======================= MICU MODE =======================
   Per-patient mode (p.mode==="micu"). Longitudinal ICU data lives on the patient (p.icu, p.dev, p.abx, p.sys);
   daily measurements live in p.today.icu and move to p.prior.icu on New day. Nothing is carried into "today"
   silently: "Copy yesterday's" copies a section but grays it until it's checked or edited. */
const isM=p=>!!p&&p.mode==="micu";
const ic0=p=>(p.today&&p.today.icu)||{};
const pi0=p=>(p.prior&&p.prior.icu)||{};
const hday=d=>(d&&/^\d{4}-\d\d-\d\d$/.test(d))?dayDiff(d,today())+1:null;
const fio2f=v=>{const n=num(v);if(isNaN(n))return NaN;const f=n>1?n/100:n;return f>=0.21&&f<=1?f:NaN};

const WHY=["Mechanical ventilation","Vasopressors","HFNC / NIV","Frequent neuro checks","CRRT","High-risk instability","Post-procedure monitoring"];
const TRAJ=["Improving","Stable","Worsening","Mixed/uncertain"];
const EVT=["Hemodynamic instability","Hypoxemia / vent change","New arrhythmia","Fever / hypothermia","Altered mental status","Seizure","Agitation / delirium","Procedure","New admission","Significant bleeding","UOP change","New lab abnormality","Rapid response / code","Other"];
const PRESS={"Norepinephrine":"mcg/kg/min","Vasopressin":"units/min","Epinephrine":"mcg/kg/min","Phenylephrine":"mcg/min","Dopamine":"mcg/kg/min","Dobutamine":"mcg/kg/min","Milrinone":"mcg/kg/min","Angiotensin II":"ng/kg/min","Other":""};
const SED={"Propofol":"mcg/kg/min","Dexmedetomidine":"mcg/kg/hr","Fentanyl":"mcg/hr","Hydromorphone":"mg/hr","Midazolam":"mg/hr","Ketamine":"mg/kg/hr","Other":""};
const DRIP_UNITS=["mcg/kg/min","mcg/min","mcg/kg/hr","mcg/hr","mg/hr","mg/kg/hr","units/min","units/hr","ng/kg/min"];
const RSUP=["RA","NC","Face mask","NRB","HFNC","CPAP","BiPAP","Vent (ETT)","Trach vent","Trach collar"];
const VMODES=["AC/VC","AC/PC","PRVC","PSV","SIMV","APRV","Other"];
const RASS=["+4","+3","+2","+1","0","-1","-2","-3","-4","-5","UTA"];
const DEV=["ETT","Trach","CVC","PICC","Art line","HD catheter","PIV","Foley","Suprapubic catheter","NG tube","OG tube","Feeding tube (post-pyloric)","PEG / G-tube","Chest tube","Surgical drain","Temporary pacing wire","MCS (IABP / Impella / ECMO)","Other","NG/OG","Feeding tube"];
const DEV_DET={"ETT":"size, depth (7.5 @ 23 cm at lip)","Trach":"size / type, cuff","CVC":"lumens (triple-lumen)","PICC":"lumens","Art line":"waveform OK?","HD catheter":"last used","PIV":"gauge","Foley":"output, hematuria","Chest tube":"suction vs water seal, output, air leak","Surgical drain":"output / character","Temporary pacing wire":"rate, output, capture","MCS (IABP / Impella / ECMO)":"device, settings","NG tube":"to suction / feeds","OG tube":"to suction / feeds","PEG / G-tube":"feeds / venting"};
const SYS=[["neuro","Neuro / pain / sedation"],["pulm","Pulmonary / airway / ventilation"],["cv","Cardiovascular / hemodynamics"],["renal","Renal / fluids / lytes / acid–base"],["id","Infectious disease"],["gi","GI / nutrition"],["heme","Hematology"],["endo","Endocrine"],["lines","Lines / tubes / prophylaxis"],["dispo","Disposition / goals of care"]];
const ICHK=[["Neuro",[["pain","Pain assessed"],["sedT","Sedation target reviewed"],["delir","Delirium assessed"],["sat","SAT considered"]]],
 ["Respiratory",[["vent","Vent settings reviewed"],["sbt","SBT considered"],["extub","Extubation readiness considered"],["o2wean","O₂ weaning considered"]]],
 ["Cardiovascular",[["perf","Perfusion assessed"],["press","Pressor needs reviewed"],["fluid","Fluid status & goal reviewed"]]],
 ["Infection",[["src","Source identified / controlled"],["cover","Coverage adequate"],["cxrev","Cultures reviewed"],["narrow","Can antibiotics narrow / stop?"]]],
 ["Prevention",[["vte","VTE prophylaxis"],["sup","Stress-ulcer prophylaxis (if indicated)"],["nutr","Nutrition"],["gluc","Glucose management"],["bowel","Bowel regimen"],["skin","Skin / pressure injury"],["mob","Mobility / PT / OT"]]],
 ["Devices",[["foley","Foley still needed"],["cvc","Central line still needed"],["aline","Art line still needed"],["odev","Other devices reviewed"]]],
 ["Communication",[["code","Code status reviewed"],["family","Family update needed"],["goc","Goals-of-care discussion needed"],["cons","Consult recs addressed"]]],
 ["Disposition",[["still","Still needs ICU-level care"],["barr","Transfer barriers identified"],["down","Potential downgrade today"]]]];
const CHKV=[["Y","Yes"],["N","No"],["NA","N/A"],["D","Deferred"]];
const GOALS=[["top","Top 3 priorities today"],["wean","Organ support to reduce"],["targets","Physiologic targets (MAP, SpO₂, net, RASS…)"],["unc","Diagnostic uncertainty to resolve"],["risk","Biggest anticipated risk"],["esc","What would trigger escalation"],["barrier","What's preventing transfer out"]];
const TRACK_DEF=["cr","lac","hgb","wbc","plt"];
const HELP={
 rass:"RASS (Richmond Agitation-Sedation Scale): +4 combative … 0 alert and calm … −3 movement to voice but no eye contact … −5 unarousable. Targets are usually set by the team (often 0 to −2).",
 cam:"CAM-ICU screens for delirium: acute change or fluctuating course + inattention, plus either disorganized thinking or altered level of consciousness. Not assessable at RASS −4/−5.",
 pf:"P/F ratio = PaO₂ (arterial only) ÷ FiO₂ as a fraction, at the time of the gas. Never calculated from a venous PO₂.",
 dp:"Driving pressure = plateau pressure − total PEEP. Needs a real plateau (inspiratory hold) in a passive patient. Static compliance = tidal volume ÷ driving pressure.",
 pbw:"Predicted body weight (ARDSNet): male equation 50 + 0.91 × (height cm − 152.4); female equation 45.5 + 0.91 × (height cm − 152.4). These are sex-based reference equations — pick the one your team uses; leave it unset and nothing is calculated. Lung-protective Vt is usually 6–8 mL/kg PBW.",
 satsbt:"SAT = spontaneous awakening trial (sedation paused). SBT = spontaneous breathing trial (low support, e.g. PS 5–8 / PEEP 5 or T-piece). Eligibility is the team's call.",
 uop:"Urine output in mL/kg/h = urine volume ÷ weight ÷ hours. Uses today's weight (or yesterday's, labeled) and the interval you enter (else the 24 h I/O box)."};
const help=t=>`<button class="help" data-act="icuHelp" data-t="${t}" aria-label="What is this?">?</button>`;

/* ---------- small building blocks ---------- */
function ichips(p,path,opts,multi){
  const v=getPath(p,path);
  return `<div class="chips">${opts.map(o=>{const on=multi?(v||[]).includes(o):v===o;
    return `<button class="chip ${on?"on":""}" data-act="${multi?"icuPickM":"pick"}" data-k="${path}" data-v="${esc(o)}">${esc(o)}</button>`}).join("")}</div>`;
}
function trendSimple(v,pv){const np=num(pv);if(isNaN(np))return"";const nt=num(v);if(isNaN(nt))return "prev "+esc(pv);const d=nt-np;return (Math.abs(d)<1e-9?"→ ":d>0?"↑ ":"↓ ")+esc(pv)}
function nb(p,path,label,unit=""){
  const v=getPath(p,path)??"",pv=path.startsWith("today.")?getPath(p,path.replace(/^today\./,"prior.")):undefined;
  return `<label class="nb"><span>${label}${unit?` <i>${unit}</i>`:""}</span><input type="text" inputmode="decimal" autocomplete="off" data-k="${path}" value="${esc(v)}"><em class="trw">${pv!==undefined?trendSimple(v,pv):""}</em></label>`;
}
const tin=(p,path,label,ph="",cls="")=>`<label class="nb wide ${cls}"><span>${label}</span><input type="text" data-k="${path}" value="${esc(getPath(p,path)??"")}" placeholder="${esc(ph)}"></label>`;
const din=(p,path,label)=>`<label class="nb"><span>${label}</span><input type="date" data-k="${path}" value="${esc(getPath(p,path)??"")}"></label>`;
const lbl=t=>`<div class="fbh">${t}</div>`;
const sel=(path,opts,v,ph,rr)=>`<select data-k="${path}" ${rr?'data-rr="1"':""}><option value="">${ph}</option>${opts.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
function sectionFilled(o){return !!o&&Object.entries(o).some(([k,v])=>Array.isArray(v)?v.length:v&&typeof v==="object"?sectionFilled(v):filled(v))}
function isec(p,sec,id,title,inner,{copy=true,open=true,cnt=""}={}){
  const old=(p.icuOld||{})[sec],pr=pi0(p)[sec],canCopy=copy&&sectionFilled(pr)&&!old;
  return `<details ${open?"open":""} id="${id}" class="icusec ${old?"oldsec":""}" data-sec="${sec}"><summary>${title}${cnt?` <span class="cnt">${cnt}</span>`:""}</summary><div class="body">
    ${old?`<div class="oldbar">Copied from ${esc(mmdd(old)||"yesterday")} — gray until you check it. Editing anything makes it current. <button data-act="icuKeep" data-sec="${sec}">✓ Checked today</button></div>`:""}
    ${canCopy?`<div class="toolbar" style="margin:0 0 6px"><button class="btn" data-act="icuCopy" data-sec="${sec}">⟲ Copy ${esc(mmdd(p.prior.icuDate)||"yesterday")}'s ${esc(title.replace(/<[^>]+>/g,"").split(/ [&—/]/)[0].toLowerCase())}</button></div>`:""}
    ${inner}</div></details>`;
}

/* ---------- calculations (informational; formulas always shown; never fill or guess inputs) ---------- */
function gnum(v,lo,hi,name){if(!filled(v))return null;const n=num(v);if(isNaN(n)||n<lo||n>hi)return {bad:`${name} "${v}" looks implausible (expected ${lo}–${hi}) — not used`};return {v:n}}
const ok=x=>x&&x.v!==undefined;
function mapCalc(p){
  const h=ic0(p).h||{},v=p.today.vit||{};
  if(filled(h.map)){const m=gnum(h.map,20,200,"MAP");return ok(m)?{v:m.v,src:"entered"}:{v:"—",src:m.bad,bad:1}}
  const s=gnum(v.sbp,40,300,"SBP"),d=gnum(v.dbp,15,200,"DBP");if(!s&&!d)return null;
  if(!ok(s)||!ok(d))return {v:"—",src:(s&&s.bad)||(d&&d.bad)||"needs both SBP and DBP",bad:1};
  if(d.v>=s.v)return {v:"—",src:`DBP ${d.v} ≥ SBP ${s.v} — check BP`,bad:1};
  return {v:Math.round((s.v+2*d.v)/3),src:`calculated from cuff BP (SBP ${s.v} + 2×DBP ${d.v}) ÷ 3 — not a measured MAP`,calc:1};
}
function pbw(p){
  const ic=p.icu||{},h=gnum(ic.ht,120,230,"height (cm)");if(!h||!ic.sex)return null;
  if(!ok(h))return {err:h.bad};
  return {v:Math.round(((ic.sex==="M"?50:45.5)+0.91*(h.v-152.4))*10)/10,eq:ic.sex==="M"?"male":"female"};
}
const isVent=r=>/Vent/.test((r||{}).sup||"");
function respCalc(p){
  const r=ic0(p).r||{},out=[];if(!isVent(r))return out;
  const w=pbw(p),vt=gnum(r.vvt,100,1500,"set Vt"),vte=gnum(r.mvt,100,1500,"exhaled Vt");
  [vt,vte].forEach(x=>{if(x&&x.bad)out.push({l:"Check",v:"",f:x.bad})});
  const vtU=ok(vt)?{v:vt.v,l:"set Vt"}:ok(vte)?{v:vte.v,l:"exhaled Vt"}:null;
  if(w&&w.v)out.push({l:"PBW",v:w.v+" kg",f:`${w.eq} reference equation: ${w.eq==="male"?"50":"45.5"} + 0.91 × (${p.icu.ht} − 152.4)`});
  if(vtU)out.push(w&&w.v?{l:"Vt / PBW",v:(vtU.v/w.v).toFixed(1)+" mL/kg",f:`${vtU.l} ${vtU.v} mL ÷ ${w.v} kg`}:{l:"Vt / PBW",v:"—",f:w&&w.err?w.err:"needs height and a PBW reference equation (Patient info)"});
  if(!["AC/VC","PRVC","AC/PC","SIMV"].includes(r.vmode||"")){out.push({l:"Driving P",v:"—",f:r.vmode?`not calculated in ${r.vmode} — a plateau isn't reliable with spontaneous breathing`:"set the vent mode first"});return out}
  const pl=gnum(r.pplat,5,80,"Pplat"),tp=gnum(r.tpeep,0,40,"total PEEP"),sp=gnum(r.vpeep,0,40,"PEEP");
  [pl,tp,sp].forEach(x=>{if(x&&x.bad)out.push({l:"Check",v:"",f:x.bad})});
  const pe=ok(tp)?{v:tp.v,l:"total PEEP (measured)"}:ok(sp)?{v:sp.v,l:"set PEEP (total PEEP not measured)"}:null;
  if(ok(pl)&&pe){const dp=pl.v-pe.v;
    if(dp<=0)out.push({l:"Driving P",v:"—",f:"plateau ≤ PEEP — check values"});
    else{out.push({l:"Driving P",v:dp+" cmH₂O",f:`Pplat ${pl.v} − ${pe.l} ${pe.v}`});
      if(vtU)out.push({l:"Static compliance",v:Math.round(vtU.v/dp)+" mL/cmH₂O",f:`${vtU.l} ${vtU.v} ÷ driving P ${dp}`})}}
  else out.push({l:"Driving P",v:"—",f:"needs a plateau pressure (inspiratory hold) and PEEP"});
  return out;
}
function agCalc(p){
  const L=p.today.lab||{},na=num(L.na),cl=num(L.cl),hc=num(L.co2);if([na,cl,hc].some(isNaN))return null;
  const ag=Math.round((na-cl-hc)*10)/10,alb=num(L.alb);let t=`AG ${ag} (Na ${na} − Cl ${cl} − HCO₃ ${hc}, from BMP)`,cag=ag;
  if(!isNaN(alb)){cag=Math.round((ag+2.5*(4-alb))*10)/10;t+=`; albumin-corrected ${cag} (+2.5 × (4 − ${alb}))`}
  if(cag>12&&hc<24)t+=`; delta ratio ${((cag-12)/(24-hc)).toFixed(1)} ((AG−12)÷(24−HCO₃); <1 extra non-gap acidosis, >2 extra metabolic alkalosis)`;
  return {ag,cag,txt:t+". Assumes a normal AG ≈ 12 — your lab's may differ."};
}
function abgInterp(g){
  const out=[],P=gnum(g.ph,6.5,8.0,"pH"),C=gnum(g.co2,5,200,g.type==="VBG"?"PvCO₂":"PaCO₂"),H=gnum(g.hco3,1,80,"HCO₃"),ven=g.type==="VBG";
  [P,C,H].forEach(x=>{if(x&&x.bad)out.push(x.bad)});
  if(!ok(P))return out;const ph=P.v;
  out.push(ph<7.35?"Acidemia":ph>7.45?"Alkalemia":"pH in range — a mixed disorder is still possible");
  if(ok(C)&&ok(H)){const co2=C.v,hc=H.v;
    if(ven){
      // Venous CO₂ isn't a substitute for PaCO₂: show the expected arterial values, but don't classify compensation.
      if(ph<7.35&&hc<22){const e=1.5*hc+8;out.push(`Low HCO₃ with acidemia — metabolic acidosis likely. Winter's predicts PaCO₂ ${Math.round(e-2)}–${Math.round(e+2)}; this is a venous sample (PvCO₂ ${co2}), so compensation can't be judged — get an ABG if it matters`)}
      else if(ph<7.35&&co2>45)out.push(`High PvCO₂ ${co2} with acidemia — possible respiratory acidosis, but venous CO₂ runs higher than arterial and depends on perfusion; confirm with an ABG`);
      else if(ph>7.45&&hc>26)out.push(`High HCO₃ with alkalemia — metabolic alkalosis likely; compensation needs an arterial PaCO₂`);
      else if(ph>7.45&&co2<35)out.push(`Low PvCO₂ ${co2} with alkalemia — possible respiratory alkalosis; confirm with an ABG`);
      out.push("Venous sample: acid–base direction only; compensation and P/F need an arterial gas");
    }else{
      if(ph<7.35&&hc<22){const e=1.5*hc+8;out.push(`Metabolic acidosis — Winter's expected PaCO₂ ${Math.round(e-2)}–${Math.round(e+2)} (1.5×HCO₃ + 8 ± 2); PaCO₂ ${co2} → ${co2>e+2?"also respiratory acidosis":co2<e-2?"also respiratory alkalosis":"appropriate compensation"}`)}
      if(ph<7.35&&co2>45){const d=(co2-40)/10,ea=24+d,ec=24+3.5*d;out.push(`Respiratory acidosis — expected HCO₃ ≈ ${Math.round(ea)} if acute (+1/10), ≈ ${Math.round(ec)} if chronic (+3.5/10); measured ${hc}${hc<ea-2?" → lower than expected: also metabolic acidosis":hc>ec+2?" → higher than expected: also metabolic alkalosis":""}`)}
      if(ph>7.45&&hc>26){const e=0.7*(hc-24)+40;out.push(`Metabolic alkalosis — expected PaCO₂ ≈ ${Math.round(e-2)}–${Math.round(e+2)} (40 + 0.7×ΔHCO₃); PaCO₂ ${co2}`)}
      if(ph>7.45&&co2<35){const d=(40-co2)/10,ea=24-2*d,ec=24-5*d;out.push(`Respiratory alkalosis — expected HCO₃ ≈ ${Math.round(ea)} if acute (−2/10), ≈ ${Math.round(ec)}–${Math.round(24-4*d)} if chronic (−4–5/10); measured ${hc}${hc>ea+2?" → higher than expected: also metabolic alkalosis":hc<ec-2?" → lower than expected: also metabolic acidosis":""}`)}
    }
  }
  if(!ven){const po=gnum(g.po2,10,700,"PaO₂"),fi=fio2f(g.fio2);
    if(po&&po.bad)out.push(po.bad);
    else if(ok(po)&&!isNaN(fi))out.push(`P/F ${Math.round(po.v/fi)} (PaO₂ ${po.v} ÷ FiO₂ ${fi.toFixed(2)})`);
    else if(ok(po))out.push(filled(g.fio2)?"FiO₂ at draw looks implausible (0.21–1.0 or 21–100%) — P/F not calculated":"P/F needs the FiO₂ at the time of this gas");}
  return out;
}
function uopCalc(p){
  const U=gnum((p.today.ios||{}).uop,0,20000,"urine");if(!U)return null;if(!ok(U))return {txt:U.bad};
  const Hh=gnum((ic0(p).rn||{}).uopHrs,0.5,48,"UOP interval (h)");if(Hh&&!ok(Hh))return {txt:Hh.bad};
  const H=ok(Hh)?Hh.v:24,hl=ok(Hh)?`${Hh.v} h (entered)`:"24 h — assumes the urine in the I/O box is a full 24 h total; enter the interval if not";
  const pv=p.prior||{},pd=(pv.vitDates||{}).wt;
  let W=gnum((p.today.vit||{}).wt,20,400,"weight"),wl="today's weight";
  if(!ok(W)){const W2=gnum((pv.vit||{}).wt,20,400,"weight");if(ok(W2)){W=W2;wl=`weight from ${pd?mmdd(pd):"a prior day"} — verify`}}
  if(!ok(W))return {txt:`UOP ${U.v} mL over ${hl} — mL/kg/h needs a weight${W&&W.bad?" ("+W.bad+")":""}`};
  const v=(U.v/W.v/H).toFixed(2);return {v,txt:`UOP ${v} mL/kg/h (${U.v} mL ÷ ${W.v} kg [${wl}] ÷ ${hl})`};
}
function crRatio(p){const b=gnum((p.icu||{}).baseCr,0.1,20,"baseline Cr"),c=gnum((p.today.lab||{}).cr,0.1,30,"Cr");if(!ok(b)||!ok(c))return (b&&b.bad)||(c&&c.bad)||"";return `Cr ${c.v} vs baseline ${b.v} → ${(c.v/b.v).toFixed(1)}× (staging is your call)`}
const calcBox=items=>items.length?`<div class="calcs">${items.map(x=>`<div><b>${x.l}</b> ${esc(x.v)} <span>${esc(x.f)}</span></div>`).join("")}</div>`:"";
function refreshCalcs(){
  const p=P();if(!isM(p))return;const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
  set("calc-resp",calcBox(respCalc(p)));
  const m=mapCalc(p);set("calc-map",m?`MAP ${m.v} <span>${esc(m.src)}</span>`:"");
  const u=uopCalc(p);set("calc-uop",u?esc(u.txt):"");
  set("calc-cr",esc(crRatio(p)));const ag=agCalc(p);set("calc-ag",ag?esc(ag.txt):"");
  (ic0(p).abg||[]).forEach((g,i)=>set("calc-abg-"+i,abgInterp(g).map(x=>`<div>${esc(x)}</div>`).join("")));
}

/* ---------- lists: drips, events, ABGs, devices, antimicrobials ---------- */
const dripName=r=>r.drug==="Other"?(r.oth||"Other"):(r.drug||"");
function drips(p,kind){
  const path=`today.icu.${kind}`,list=getPath(p,path)||[],cat=kind==="h.press"?PRESS:SED,prior=getPath(p,`prior.icu.${kind}`)||[];
  const rows=list.map((r,i)=>{const pre=`${path}.${i}.`,pr=prior.find(x=>x.drug&&dripName(x)===dripName(r));
    const tr=pr?trendSimple(r.cur,pr.cur):(r.drug?"new":"");
    return `<div class="drip">${sel(pre+"drug",Object.keys(cat),r.drug,"Drug",1)}
      ${r.drug==="Other"?`<input type="text" class="oth" data-k="${pre}oth" value="${esc(r.oth||"")}" placeholder="name">`:""}
      <input type="text" inputmode="decimal" class="dr" data-k="${pre}cur" value="${esc(r.cur||"")}" placeholder="now">
      ${sel(pre+"unit",DRIP_UNITS,r.unit,"unit")}
      ${kind==="h.press"?`<input type="text" inputmode="decimal" class="dr" data-k="${pre}max" value="${esc(r.max||"")}" placeholder="max O/N">`:`<input type="text" class="prn" data-k="${pre}prn" value="${esc(r.prn||"")}" placeholder="PRNs / boluses O/N">`}
      <span class="trw">${tr}</span><button class="x" data-act="icuDelRow" data-path="${path}" data-i="${i}" aria-label="Remove">×</button></div>`}).join("");
  const notToday=prior.filter(x=>x.drug&&!list.some(r=>dripName(r)===dripName(x)))
    .map(x=>`<div class="meta">${esc(mmdd(p.prior.icuDate)||"Yesterday")}: ${esc(dripName(x))} ${esc(x.cur||"?")} ${esc(x.unit||"")} — not entered today</div>`).join("");
  const noneK=kind==="h.press"?"today.icu.h.pressNone":"today.icu.n.sedNone",none=getPath(p,noneK);
  return rows+notToday+`<div class="rwh"><button class="add" style="flex:1;margin:0" data-act="icuAddRow" data-path="${path}" data-tpl="drip">＋ ${kind==="h.press"?"Pressor / inotrope":"Sedative / analgesic infusion"}</button>${list.some(r=>r.drug)?"":`<button class="chip ${none?"on":""}" data-act="icuNone" data-k="${noneK}">None today</button>`}</div>`;
}
const dripTxt=(r,pr)=>`${dripName(r)} ${r.cur||"?"}${r.unit?" "+r.unit:""}${r.max?` (max ${r.max})`:""}${pr&&filled(pr.cur)&&filled(r.cur)?` ${trendSimple(r.cur,pr.cur).split(" ")[0]} from ${pr.cur}`:""}`;
function dripsLine(p,kind,which="today"){
  const l=(getPath(p,`${which}.icu.${kind}`)||[]).filter(r=>r.drug),pr=getPath(p,`prior.icu.${kind}`)||[];
  return l.map(r=>dripTxt(r,which==="today"?pr.find(x=>dripName(x)===dripName(r)):null)).join("; ");
}
function events(p){
  const path="today.icu.ev",l=getPath(p,path)||[];
  return l.map((r,i)=>{const pre=`${path}.${i}.`;return `<div class="rw"><div class="rwh">${sel(pre+"type",EVT,r.type,"Event type")}<input type="text" class="site" style="max-width:110px" data-k="${pre}time" value="${esc(r.time||"")}" placeholder="time"><button class="x" data-act="icuDelRow" data-path="${path}" data-i="${i}" aria-label="Remove">×</button></div>
    <div class="grid three"><input type="text" data-k="${pre}what" value="${esc(r.what||"")}" placeholder="What happened (MAP 55)"><input type="text" data-k="${pre}intv" value="${esc(r.intv||"")}" placeholder="Intervention (NE 0.06 → 0.12)"><input type="text" data-k="${pre}resp" value="${esc(r.resp||"")}" placeholder="Response / now (MAP 68)"></div></div>`}).join("")
   +`<button class="add" data-act="icuAddRow" data-path="${path}" data-tpl="ev">＋ Overnight event</button>`;
}
const evTxt=r=>[r.time,r.type,r.what].filter(filled).join(" · ")+(filled(r.intv)?` → ${r.intv}`:"")+(filled(r.resp)?` → ${r.resp}`:"");
function abgs(p){
  const path="today.icu.abg",l=getPath(p,path)||[];
  return l.map((g,i)=>{const pre=`${path}.${i}.`,ven=g.type==="VBG";
    return `<div class="rw"><div class="rwh">${sel(pre+"type",["ABG","VBG"],g.type,"Type",1)}<input type="text" class="site" style="max-width:110px" data-k="${pre}time" value="${esc(g.time||"")}" placeholder="time"><input type="text" class="site" data-k="${pre}sup" value="${esc(g.sup||"")}" placeholder="support at draw (e.g. AC/VC PEEP 10)"><button class="x" data-act="icuDelRow" data-path="${path}" data-i="${i}" aria-label="Remove">×</button></div>
      <div class="nbg">${nb(p,pre+"ph","pH")}${nb(p,pre+"co2",ven?"PvCO₂":"PaCO₂")}${ven?"":nb(p,pre+"po2","PaO₂")}${nb(p,pre+"hco3","HCO₃")}${nb(p,pre+"be","BE")}${nb(p,pre+"lac","Lactate")}${nb(p,pre+"fio2","FiO₂ at draw")}</div>
      <div class="calcs" id="calc-abg-${i}">${abgInterp(g).map(x=>`<div>${esc(x)}</div>`).join("")}</div></div>`}).join("")
   +`<button class="add" data-act="icuAddRow" data-path="${path}" data-tpl="abg">＋ Blood gas</button> ${help("pf")}`;
}
const abgTxt=g=>`${g.type||"Gas"}${g.time?" "+g.time:""}: ${[g.ph,g.co2,g.type==="VBG"?null:g.po2,g.hco3].map(x=>filled(x)?x:"–").join("/")}${filled(g.lac)?`, lac ${g.lac}`:""}${filled(g.sup)?` on ${g.sup}`:""}`;
function devices(p){
  const l=p.dev||[];
  return l.map((d,i)=>{const pre=`dev.${i}.`,days=hday(d.date),rev=d.needD===today();
    return `<div class="rw ${d.need==="No"&&rev?"pos":""}"><div class="rwh">${sel(pre+"type",DEV,d.type,"Device",1)}<input type="text" class="site" data-k="${pre}site" value="${esc(d.site||"")}" placeholder="site (R IJ…)"><input type="date" data-k="${pre}date" value="${esc(d.date||"")}"><span class="dd">${days?"day "+days:""}</span><button class="x" data-act="icuDelRow" data-path="dev" data-i="${i}" aria-label="Remove">×</button></div>
      <div class="rwh">${d.type==="PIV"?`<input type="text" inputmode="numeric" class="site" style="max-width:90px" data-k="${pre}count" value="${esc(d.count||"")}" placeholder="how many">`:""}<input type="text" class="site" data-k="${pre}det" value="${esc(d.det||"")}" placeholder="${esc(DEV_DET[d.type]||"details")}"><input type="text" class="site" data-k="${pre}ind" value="${esc(d.ind||"")}" placeholder="indication"><input type="text" class="site" data-k="${pre}issue" value="${esc(d.issue||"")}" placeholder="issues / findings"></div>
      <div class="rwh"><span class="dd">Still needed today?</span>${["Yes","No"].map(v=>`<button class="chip ${rev&&d.need===v?"on":""}" data-act="icuNeed" data-i="${i}" data-v="${v}">${v}</button>`).join("")}${!rev?`<span class="bdg">not reviewed today</span>`:""}<input type="text" class="site" data-k="${pre}plan" value="${esc(d.plan||"")}" placeholder="removal / replacement plan"></div></div>`}).join("")
   +`<button class="add" data-act="icuAddRow" data-path="dev" data-tpl="dev">＋ Line / tube / drain</button>`;
}
function abxRows(p){
  const l=p.abx||[];
  return l.map((a,i)=>{const pre=`abx.${i}.`,d=hday(a.start);
    return `<div class="rw"><div class="rwh"><input type="text" class="site" data-k="${pre}name" value="${esc(a.name||"")}" placeholder="Antimicrobial"><input type="date" data-k="${pre}start" value="${esc(a.start||"")}"><span class="dd">${d?"day "+d:""}</span><button class="x" data-act="icuDelRow" data-path="abx" data-i="${i}" aria-label="Remove">×</button></div>
      <div class="rwh"><input type="text" class="site" data-k="${pre}ind" value="${esc(a.ind||"")}" placeholder="indication"><input type="text" class="site" data-k="${pre}plan" value="${esc(a.plan||"")}" placeholder="planned duration / reassess date"></div>
      <div class="rwh"><input type="text" class="site" data-k="${pre}cx" value="${esc(a.cx||"")}" placeholder="culture / susceptibility"><input type="text" class="site" data-k="${pre}renal" value="${esc(a.renal||"")}" placeholder="renal dose adj"><input type="text" class="site" data-k="${pre}deesc" value="${esc(a.deesc||"")}" placeholder="de-escalation?"></div></div>`}).join("")
   +`<button class="add" data-act="icuAddRow" data-path="abx" data-tpl="abx">＋ Antimicrobial</button>`;
}
const abxTxt=a=>`${a.name||"?"}${hday(a.start)?" d"+hday(a.start):""}${filled(a.plan)?` (plan ${a.plan})`:""}`;

/* ---------- snapshot (derived only; no data entry here) ---------- */
function supTxt(r){
  if(!r||!r.sup)return"";
  if(isVent(r))return [r.sup,r.vmode,filled(r.vvt)&&"Vt "+r.vvt,filled(r.vrr)&&"RR "+r.vrr,filled(r.vpi)&&"Pi "+r.vpi,filled(r.vps)&&"PS "+r.vps,filled(r.vpeep)&&"PEEP "+r.vpeep,filled(r.fio2)&&"FiO₂ "+r.fio2].filter(Boolean).join(" ");
  if(r.sup==="HFNC")return ["HFNC",filled(r.flow)&&r.flow+" L",filled(r.fio2)&&"FiO₂ "+r.fio2].filter(Boolean).join(" ");
  if(r.sup==="BiPAP")return ["BiPAP",filled(r.ipap)&&r.ipap+"/"+(r.epap||"?"),filled(r.fio2)&&"FiO₂ "+r.fio2].filter(Boolean).join(" ");
  if(r.sup==="CPAP")return ["CPAP",r.epap,filled(r.fio2)&&"FiO₂ "+r.fio2].filter(Boolean).join(" ");
  return [r.sup,filled(r.flow)&&r.flow+" L"].filter(Boolean).join(" ");
}
function snapshot(p){
  const T=p.today,ic=ic0(p),r=ic.r||{},h=ic.h||{},n=ic.n||{},rn=ic.rn||{},pr=pi0(p),v=T.vit||{};
  const yd=(t)=>t?`<span class="yday">${esc(mmdd(p.prior.icuDate)||"yday")}: ${esc(t)}</span>`:"—";
  const cell=(l,val,alt)=>`<div class="sc"><b>${l}</b><div>${val||yd(alt)}</div></div>`;
  const m=mapCalc(p),u=uopCalc(p),net=ioNet(T.ios);
  const press=dripsLine(p,"h.press"),sed=dripsLine(p,"n.sed");
  const pend=(p.cx||[]).filter(c=>c.st==="Pending"||c.st==="NGTD").length;
  const devs=(p.dev||[]).filter(d=>d.type).map(d=>`${d.type}${hday(d.date)?" d"+hday(d.date):""}${d.needD!==today()?"*":""}`);
  return `<div class="snap" id="icuSnap">
    ${cell("Airway / O₂",esc(supTxt(r)),supTxt(pr.r))}
    ${cell("Oxygenation",[filled(v.spo2)&&"SpO₂ "+esc(v.spo2)+"%",filled(r.fio2)&&"FiO₂ "+esc(r.fio2),filled(r.vpeep)&&"PEEP "+esc(r.vpeep)].filter(Boolean).join(" · "),"")}
    ${cell("Circulation",[m&&!m.bad&&`MAP ${m.v}${m.calc?" (calc from cuff)":""}${filled(h.mapGoal)?" · goal "+esc(h.mapGoal):""}`,press&&esc(press)].filter(Boolean).join(" · "),dripsLine(p,"h.press","prior"))}
    ${cell("Neuro",[filled(n.rass)&&"RASS "+esc(n.rass)+(filled(n.rassT)?" (target "+esc(n.rassT)+")":""),filled(n.cam)&&"CAM "+esc(n.cam),sed&&esc(sed)].filter(Boolean).join(" · "),dripsLine(p,"n.sed","prior"))}
    ${cell("Renal",[u&&u.v&&`UOP ${u.v} mL/kg/h`,net&&net.net!==null&&`net ${net.net>0?"+":""}${net.net}`,filled(rn.rrt)&&rn.rrt!=="None"&&esc(rn.rrt)].filter(Boolean).join(" · "),"")}
    ${cell("Infection",[(p.abx||[]).filter(a=>a.name).map(abxTxt).map(esc).join(", "),pend&&`${pend} cx pending`,filled(v.tmax)&&"Tmax "+esc(v.tmax)].filter(Boolean).join(" · "),"")}
    ${cell("Devices",devs.length?esc(devs.join(", "))+(devs.some(d=>d.endsWith("*"))?` <span class="yday">* need not reviewed today</span>`:""):"","")}
  </div>`;
}

/* ---------- edit view pieces ---------- */
function micuInfo(p){
  const hd=hday((p.icu||{}).hAdm),id=hday((p.icu||{}).iAdm);
  return `<div class="subh"><span>ICU background${hd||id?` — ${hd?"HD "+hd:""}${hd&&id?" · ":""}${id?"ICU day "+id:""}`:""}</span></div>
  <div class="nbg">${din(p,"icu.hAdm","Hospital admit")}${din(p,"icu.iAdm","ICU admit")}</div>
  <div class="grid two">${tin(p,"icu.dx","Primary ICU diagnosis","septic shock from pyelonephritis")}${tin(p,"icu.comorb","Key comorbidities","HFrEF 30%, CKD3, COPD")}
  ${tin(p,"icu.baseFx","Baseline function","independent ADLs")}${tin(p,"icu.baseO2","Baseline O₂","RA / 2 L home O₂")}
  ${tin(p,"icu.baseCr","Baseline Cr","1.1")}${tin(p,"icu.goc","Goals-of-care limits","no CPR, OK to intubate")}</div>
  <div class="nbg">${nb(p,"icu.ht","Height","cm")}<div class="nb"><span>PBW reference equation ${help("pbw")}</span>${ichips(p,"icu.sex",["M","F"])}<em class="trw">${(p.icu||{}).sex?((p.icu.sex==="M"?"male: 50":"female: 45.5")+" + 0.91 × (ht − 152.4)"):"not set — Vt/PBW won't be calculated"}</em></div></div>`;
}
function micuStatus(p){
  const st=ic0(p).st||{};
  return isec(p,"st","icu-status","ICU status — why here today?",`
    ${lbl("Why does this patient still need ICU care today?")}${ichips(p,"today.icu.st.why",WHY,true)}
    ${tin(p,"today.icu.st.whyT","Details","")}
    ${lbl("Trajectory (your call — not calculated)")}${ichips(p,"today.icu.st.traj",TRAJ)}
    ${tin(p,"today.icu.st.trajT","Because…","off pressors 12 h, FiO₂ 0.6 → 0.4")}
    ${lbl("Overnight events")}${events(p)}`,{cnt:st.traj||""});
}
function micuHemo(p){
  return isec(p,"h","icu-h","Hemodynamics & pressors",`
    <div class="nbg">${nb(p,"today.icu.h.map","MAP now")}${nb(p,"today.icu.h.mapGoal","MAP goal")}${nb(p,"today.icu.h.mapLow","Lowest MAP O/N")}
      ${tin(p,"today.icu.h.hrR","HR range 24 h","88–124")}${tin(p,"today.icu.h.bpR","BP range","84/50–132/70")}${nb(p,"today.icu.h.tCur","Temp now")}${tin(p,"today.icu.h.tR","Temp range","36.8–38.9")}</div>
    <div class="calcs" id="calc-map">${(()=>{const m=mapCalc(p);return m?`MAP ${m.v} <span>${esc(m.src)}</span>`:""})()}</div>
    ${lbl("Pressors / inotropes")}${drips(p,"h.press")}
    ${lbl("Perfusion")}<div class="nbg">
      <div class="nb"><span>Cap refill</span>${ichips(p,"today.icu.h.cr",["<3 s","Delayed"])}</div>
      <div class="nb"><span>Extremities</span>${ichips(p,"today.icu.h.ext",["Warm","Cool"])}</div>
      <div class="nb"><span>Pulses</span>${ichips(p,"today.icu.h.pul",["Normal","Weak"])}</div>
      <div class="nb"><span>Mottling</span>${ichips(p,"today.icu.h.mot",["None","Knees","Beyond knees"])}</div></div>
    <div class="meta">Lactate and mental status come from the Labs and Neuro sections.</div>
    <details class="adv"><summary>Advanced hemodynamics</summary><div class="nbg">${nb(p,"today.icu.h.ci","CI")}${nb(p,"today.icu.h.cvp","CVP")}${nb(p,"today.icu.h.scvo2","ScvO₂ %")}${tin(p,"today.icu.h.advT","Other (echo, PAC…)","")}</div></details>
    ${ta("today.icu.h.plan","Hemodynamic plan","shock type? perfusion adequate? MAP goal, pressor titration, fluids, when to reassess")}`);
}
function micuResp(p){
  const r=ic0(p).r||{},s=r.sup||"",B="today.icu.r.";
  const o2=["NC","Face mask","NRB","Trach collar"].includes(s),wob=`<div class="nb"><span>Work of breathing</span>${ichips(p,B+"wob",["Comfortable","Mild","Moderate","Severe"])}</div>`;
  let h=`${lbl("Support")}${ichips(p,B+"sup",RSUP)}`;
  if(o2)h+=`<div class="nbg">${nb(p,B+"flow","Flow","L/min")}${nb(p,B+"spo2t","SpO₂ target","%")}${wob}</div>`;
  if(s==="HFNC")h+=`<div class="nbg">${nb(p,B+"flow","Flow","L/min")}${nb(p,B+"fio2","FiO₂")}${nb(p,B+"spo2t","SpO₂ target","%")}${wob}</div>`;
  if(s==="CPAP"||s==="BiPAP")h+=`<div class="nbg">${s==="BiPAP"?nb(p,B+"ipap","IPAP"):""}${nb(p,B+"epap",s==="BiPAP"?"EPAP":"CPAP")}${nb(p,B+"fio2","FiO₂")}<div class="nb"><span>Tolerance</span>${ichips(p,B+"tol",["Good","Intermittent","Poor"])}</div></div>`;
  if(isVent(r)){
    const m=r.vmode||"",vc=["AC/VC","PRVC","SIMV"].includes(m),pc=m==="AC/PC",ps=m==="PSV"||m==="SIMV",ap=m==="APRV";
    h+=`${lbl("Mode")}${ichips(p,B+"vmode",VMODES)}
    ${lbl("Settings")}<div class="nbg">${!ps||m==="SIMV"?(ap?"":nb(p,B+"vrr","Set RR")):""}${vc?nb(p,B+"vvt",m==="PRVC"?"Target Vt":"Set Vt","mL"):""}${pc?nb(p,B+"vpi","Insp P","cmH₂O")+`<div class="nb"><span>Insp P is</span>${ichips(p,B+"pconv",["above","abs"]).replace(">above<",">above PEEP<").replace(">abs<",">absolute<")}</div>`:""}${ps?nb(p,B+"vps","PS","cmH₂O"):""}
      ${ap?nb(p,B+"phi","P high")+nb(p,B+"plo","P low")+nb(p,B+"thi","T high")+nb(p,B+"tlo","T low"):nb(p,B+"vpeep","PEEP")}${nb(p,B+"fio2","FiO₂")}${m==="Other"?tin(p,B+"vother","Settings",""):""}</div>
    ${lbl("Measured")}<div class="nbg">${nb(p,B+"mrr","Actual RR")}${nb(p,B+"mvt","Exhaled Vt","mL")}${nb(p,B+"mve","Ve","L/min")}${nb(p,B+"pip","PIP")}${nb(p,B+"pplat","Pplat")}${nb(p,B+"tpeep","Total PEEP")}</div>
    <div class="fbh">Calculations ${help("dp")} ${help("pbw")}</div><div id="calc-resp">${calcBox(respCalc(p))}</div>
    <div class="nbg"><div class="nb"><span>SBT ${help("satsbt")}</span>${ichips(p,B+"sbt",["Not eligible","Eligible","Passed","Failed","Deferred"])}</div><div class="nb"><span>Extubation</span>${ichips(p,B+"extub",["Not ready","Possible today","Planned","Extubated"])}</div></div>`;
  }
  {const vr=ventReport(p,"std");if(s&&vr.line)h+=`<div class="calcs"><div><b>As presented:</b> ${esc(vr.line)}${vr.meas?"<br>"+esc(vr.meas):""}</div>${vr.miss.length?`<div class="miss">Missing: ${esc(vr.miss.join(", "))}</div>`:""}</div>`}
  h+=`${lbl("Blood gases")}${abgs(p)}
    ${ta(B+"plan","Respiratory plan","oxygenation/ventilation adequate? lung-protective? synchrony? secretions? SAT / SBT / extubation readiness? barriers to liberation")}`;
  return isec(p,"r","icu-r","Respiratory & ventilator",h,{cnt:esc(supTxt(r))});
}
function micuNeuro(p){
  const n=ic0(p).n||{},B="today.icu.n.",e=num(n.gcsE),v=num(n.gcsV),m=num(n.gcsM);
  const gcs=!isNaN(e)&&!isNaN(m)?(isNaN(v)?(filled(n.gcsV)?`GCS E${e} V${n.gcsV} M${m} (E+M = ${e+m})`:""):`GCS ${e+v+m} (E${e} V${v} M${m})`):"";
  return isec(p,"n","icu-n","Neuro, sedation & analgesia",`
    <div class="nbg"><div class="nb"><span>Mental status</span>${ichips(p,B+"ms",["Alert","Drowsy","Obtunded","Comatose","Sedated","Agitated"])}</div>
      <div class="nb"><span>Follows commands</span>${ichips(p,B+"cmd",["Yes","No","Unable to assess"])}</div>
      <div class="nb"><span>Oriented</span>${ichips(p,B+"or",["×3","×2","×1","×0","Unable to assess"])}</div></div>
    <div class="nbg">${tin(p,B+"pupils","Pupils","3 mm, reactive")}${tin(p,B+"focal","Focal deficits","none")}${nb(p,B+"gcsE","GCS E")}${tin(p,B+"gcsV","GCS V","1–5 or T")}${nb(p,B+"gcsM","GCS M")}</div>
    ${gcs?`<div class="calcs"><div>${esc(gcs)}</div></div>`:""}
    <div class="nb"><span>RASS now ${help("rass")}</span>${ichips(p,B+"rass",RASS)}</div>
    <div class="nb"><span>RASS target</span>${ichips(p,B+"rassT",["0","0 to −1","−1 to −2","−2 to −3","−4 to −5","n/a"])}</div>
    <div class="nbg"><div class="nb"><span>CAM-ICU ${help("cam")}</span>${ichips(p,B+"cam",["Negative","Positive","Unable to assess"])}</div>${tin(p,B+"pain","Pain / CPOT","CPOT 1")}</div>
    ${lbl("Sedative / analgesic infusions")}${drips(p,"n.sed")}
    ${ta(B+"plan","Sedation / analgesia plan","sedation indication, target RASS, SAT today?, analgesia first, delirium measures, sleep, mobility")}`);
}
function micuRenal(p){
  const rn=ic0(p).rn||{},B="today.icu.rn.",u=uopCalc(p),ag=agCalc(p);
  let rrt="";
  if(rn.rrt==="CRRT")rrt=`<div class="nbg"><div class="nb"><span>Modality</span>${ichips(p,B+"crm",["CVVH","CVVHD","CVVHDF"])}</div>${nb(p,B+"uf","Net UF goal","mL/h")}${tin(p,B+"ufAct","Actual removal","−1.8 L")}<div class="nb"><span>Anticoag</span>${ichips(p,B+"crac",["Citrate","Heparin","None"])}</div>${tin(p,B+"filt","Filter / circuit issues","")}</div>`;
  else if(rn.rrt&&rn.rrt!=="None")rrt=tin(p,B+"rrtT","RRT details","last / next session, UF")+"";
  return isec(p,"rn","icu-rn","Renal, fluids & electrolytes",`
    <div class="calcs"><div id="calc-uop">${u?esc(u.txt):"Enter urine in the I/O box (Today's values)."}</div><div id="calc-cr">${esc(crRatio(p))}</div><div id="calc-ag">${ag?esc(ag.txt):""}</div></div> ${help("uop")}
    <div class="nbg">${nb(p,B+"uopHrs","UOP interval","h, if not 24")}${tin(p,B+"cum","Cumulative balance","+6.2 L since admit")}${tin(p,B+"diur","Diuretics","furosemide 80 IV ×2")}${tin(p,B+"bolus","Fluid boluses","LR 1 L ×1")}</div>
    <div class="nb"><span>AKI stage (if established)</span>${ichips(p,B+"aki",["None","1","2","3"])}</div>
    <div class="nb"><span>RRT</span>${ichips(p,B+"rrt",["None","iHD","CRRT","PD","Other"])}</div>${rrt}
    ${ta(B+"plan","Renal / fluid plan","volume status, net goal, diurese vs fluids, lytes to replete, renal dosing, RRT")}`);
}
function micuID(p){
  const pend=(p.cx||[]).filter(c=>c.st==="Pending"||c.st==="NGTD");
  return isec(p,"id","icu-id","Infection & antimicrobials",`
    <div class="grid two">${tin(p,"icu.infSrc","Suspected / confirmed source","urine — E. coli")}${tin(p,"icu.infOrg","Organisms","E. coli pan-S")}</div>
    <div class="nb"><span>Source control</span>${ichips(p,"icu.infSC",["N/A","Achieved","Pending","Not feasible"])}</div>
    ${tin(p,"today.icu.id.resp","Clinical response today","afebrile 24 h, WBC 18 → 12")}
    <div class="meta">${pend.length?`${pend.length} culture${pend.length>1?"s":""} pending / NGTD (Cultures section)`:"No pending cultures listed (Cultures section)"}</div>
    ${lbl("Antimicrobials")}${abxRows(p)}
    ${ta("today.icu.id.plan","ID plan","coverage, de-escalation, duration, source control, levels")}`,{cnt:(p.abx||[]).filter(a=>a.name).length||""});
}
function micuCV(p){
  const B="today.icu.cv.";
  return isec(p,"cv","icu-cv","Cardiac",`
    <div class="nb"><span>Rhythm</span>${ichips(p,B+"rhy",["NSR","Sinus tach","Sinus brady","AF / AFL","Paced","Other"])}</div>
    <div class="grid two">${tin(p,B+"tele","Telemetry events","")}${tin(p,B+"trop","Troponin trend","")}${tin(p,"icu.echo","Echo (date, findings)","")}${tin(p,"icu.lvef","LVEF / RV","EF 30%, RV normal")}${tin(p,B+"ac","Anticoagulation","")}${tin(p,B+"meds","Cardiac meds","")}</div>
    ${ta(B+"plan","Cardiac plan","")}`);
}
function micuGI(p){
  const g=ic0(p).gi||{},B="today.icu.gi.";
  return isec(p,"gi","icu-gi","GI, nutrition & endocrine",`
    <div class="nb"><span>Nutrition</span>${ichips(p,B+"diet",["NPO","PO","Tube feeds","TPN"])}</div>
    ${g.diet==="Tube feeds"?`<div class="nbg">${tin(p,B+"tf","Formula","")}${tin(p,B+"tfr","Rate / goal","40 → goal 60 mL/h")}<div class="nb"><span>Tolerance</span>${ichips(p,B+"tol",["Tolerating","Held / interrupted","Vomiting"])}</div></div>`:""}
    <div class="nbg">${din(p,B+"lbm","Last BM")}${tin(p,B+"bowel","Bowel regimen","")}${tin(p,B+"sup","Stress-ulcer ppx / indication","")}${tin(p,B+"bleed","GI bleeding concerns","")}</div>
    ${lbl("Endocrine")}<div class="nbg">${tin(p,B+"glu","Glucose range","140–210")}${tin(p,B+"gluT","Target","140–180")}${tin(p,B+"ins","Insulin","drip 3 u/h")}<div class="nb"><span>Hypoglycemia</span>${ichips(p,B+"hypo",["None","Yes"])}</div>${tin(p,B+"ster","Steroids / indication","hydrocortisone 50 q6 — shock")}</div>
    ${lbl("Hematology")}${tin(p,B+"heme","Heme (transfusions, bleeding, anticoag issues)","")}
    ${ta(B+"plan","GI / nutrition / endocrine plan","")}`);
}
function micuDevices(p){
  const unrev=(p.dev||[]).filter(d=>d.type&&d.needD!==today()).length;
  const okd=ic0(p).devOK;
  return `<details open id="icu-dev" class="icusec"><summary>Lines, tubes & drains <span class="cnt">${unrev?unrev+" need review":""}${okd?" · inventory ✓":""}</span></summary><div class="body">
    <div class="calcs"><div><b>As presented:</b> ${devInventory(p)}</div></div>
    <div class="toolbar" style="margin:0 0 8px"><button class="btn ${okd?"pri":""}" data-act="icuDevOK">${okd?"✓ Inventory confirmed complete "+esc(okd):"Confirm inventory is complete for today"}</button></div>
    ${devices(p)}</div></details>`;
}
function micuLabs(p,which){
  const c=a=>ncell(p,which,"lab",a,AN[a][1],false);
  return `<div class="fbh">ICU labs</div><div class="fishes"><div class="fb xtra" style="flex-wrap:wrap">${ICUL.map(x=>c(x[0])).join("")}</div></div>`;
}
function trackTable(p,ro){
  const tr=(p.icu||{}).track||TRACK_DEF;
  const rows=tr.filter(a=>AN[a]).map(a=>{const t=getPath(p,"today.lab."+a),pv=getPath(p,"prior.lab."+a),pd=((p.prior||{}).labDates||{})[a];
    return `<tr><td>${esc(AN[a][1])}</td><td>${filled(pv)?esc(pv)+(pd?` <span class="yday">${esc(mmdd(pd))}</span>`:""):"—"}</td><td><b>${filled(t)?esc(t):"—"}</b></td><td>${trendOf(p,"lab",a)?trendOf(p,"lab",a).split(" ")[0]:""}</td></tr>`}).join("");
  return `<table class="trk"><tr><th>Tracked</th><th>Prior</th><th>Today</th><th></th></tr>${rows}</table>
    ${ro?"":`<details class="adv"><summary>Choose tracked labs</summary><div class="chips">${ANALYTES.map(([a,l])=>`<button class="chip ${tr.includes(a)?"on":""}" data-act="icuTrack" data-v="${a}">${esc(l)}</button>`).join("")}</div></details>`}`;
}
function micuSysAP(p){
  const titles=p.problems.map(x=>x.p).filter(filled);
  const anyOld=SYS.some(([k])=>Object.keys(((p.sys||{})[k]||{}).old||{}).length);
  return `${anyOld?`<div class="oldbar">Gray = carried over from ${esc(mmdd(p.apFrom)||"yesterday")}. Edit a field to make it current, or tap ✓. <button data-act="icuSysKeepAll">Mark all current</button></div>`:""}
  ${lbl("Problem list — #1 is the primary ICU problem; link problems to systems below")}${p.problems.map((pr,i)=>`<div class="vrow"><span class="num">${i+1}.</span><input type="text" data-k="problems.${i}.p" value="${esc(pr.p)}" placeholder="${i?"Problem":"Primary ICU problem"}"><button class="chip sm ${pr.chronic?"on":""}" data-act="pick" data-k="problems.${i}.chronic" data-v="1" title="Chronic condition affecting care">chronic</button><button class="mini" data-act="up" data-i="${i}" aria-label="Move up">↑</button><button class="mini" data-act="down" data-i="${i}" aria-label="Move down">↓</button><button class="x" data-act="delProb" data-i="${i}" aria-label="Remove">×</button></div>`).join("")}
  <button class="add" data-act="addProb">＋ Problem</button>
  ${SYS.map(([k,l])=>{const s=(p.sys||{})[k]||{},old=s.old||{};
    return `<div class="prob sysap"><div class="ph"><b>${esc(l)}</b>${Object.keys(old).length?`<button class="mini keep" data-act="icuSysKeep" data-v="${k}">✓</button>`:""}</div>
      ${titles.length?`<div class="chips" style="margin-bottom:6px">${titles.map(t=>`<button class="chip sm ${(s.link||[]).includes(t)?"on":""}" data-act="icuPickM" data-k="sys.${k}.link" data-v="${esc(t)}">${esc(t)}</button>`).join("")}</div>`:""}
      <div class="grid two">${ta(`sys.${k}.a`,"Assessment","problem, severity, trend, evidence")}${ta(`sys.${k}.pl`,"Plan","intervention, monitoring, target, reassess, de-escalate")}</div></div>`}).join("")}`;
}
function micuGoals(p){
  return isec(p,"g","icu-goals","Today's ICU goals",GOALS.map(([k,l])=>`<div class="goal">${k==="top"?ta("today.icu.g.top",l,"1. … 2. … 3. …"):tin(p,"today.icu.g."+k,l,"")}<button class="mini" data-act="icuToTodo" data-k="today.icu.g.${k}" title="Make a to-do">→ To-do</button></div>`).join(""),{copy:false});
}
function micuChecklist(p){
  const c=ic0(p).chk||{},vals=Object.values(c),n=vals.filter(Boolean).length,tot=ICHK.reduce((s,g)=>s+g[1].length,0),no=vals.filter(v=>v==="N").length,def=vals.filter(v=>v==="D").length;
  return `<details id="icu-chk" class="icusec"><summary>ICU daily safety & liberation checklist <span class="cnt">${n}/${tot} reviewed${no?` · ${no} No`:""}${def?` · ${def} deferred`:""}</span></summary><div class="body">
    <p class="legend">Yes / No / N/A / Deferred. Blank just means not reviewed yet — not that care was missed.</p>
    ${ICHK.map(([g,items])=>`<div class="fbh">${g}</div>${items.map(([k,l])=>`<div class="ck"><span>${esc(l)}</span><span class="seg4">${CHKV.map(([v,t])=>`<button class="seg ${c[k]===v?"on "+(v==="Y"?"ok":v==="N"?"bad":"mid"):""}" data-act="pick" data-k="today.icu.chk.${k}" data-v="${v}">${t}</button>`).join("")}</span></div>`).join("")}`).join("")}
  </div></details>`;
}

/* ---------- MICU top block, list badges ---------- */
function micuTop(p){
  const ic=p.icu||{},hd=hday(ic.hAdm),id=hday(ic.iAdm),st=ic0(p).st||{};
  return `<div class="icuhead"><span class="bdg cs">MICU</span>${hd?` HD ${hd}`:""}${id?` · ICU day ${id}`:""}${filled(ic.dx)?` · <b>${esc(ic.dx)}</b>`:""}${st.traj?` · <span class="tj tj-${esc(st.traj.split("/")[0].toLowerCase())}">${esc(st.traj)}</span>`:""}</div>${snapshot(p)}`;
}
function micuBadges(p){
  const ic=ic0(p),r=ic.r||{},b=[];
  if(hday((p.icu||{}).iAdm))b.push("ICU d"+hday(p.icu.iAdm));
  if(r.sup&&r.sup!=="RA")b.push(r.sup);
  (ic.h&&ic.h.press||[]).filter(x=>x.drug).forEach(x=>b.push(dripName(x).slice(0,4)+" "+(x.cur||"")));
  if(ic.rn&&ic.rn.rrt&&ic.rn.rrt!=="None")b.push(ic.rn.rrt);
  if(ic.st&&ic.st.traj)b.push(ic.st.traj);
  return `<span class="bdg cs">MICU</span>`+b.map(x=>`<span class="bdg cs">${esc(x)}</span>`).join("");
}

/* ---------- actions, freshness, rollover ---------- */
const ROW_TPL={drip:()=>({drug:"",cur:"",unit:"",max:""}),ev:()=>({type:"",time:"",what:"",intv:"",resp:""}),abg:()=>({type:"ABG",time:""}),
  dev:()=>({type:"",site:"",date:today()}),abx:()=>({name:"",start:today()})};
function icuFresh(p,k){
  const m=k.match(/^today\.icu\.(\w+)\./);
  if(m&&(p.icuOld||{})[m[1]]){delete p.icuOld[m[1]];markTs("icuOld."+m[1],p);const s=$("main").querySelector(`.icusec[data-sec="${m[1]}"]`);if(s){s.classList.remove("oldsec");const ob=s.querySelector(".oldbar");if(ob)ob.remove()}}
  const s2=k.match(/^sys\.(\w+)\.(a|pl)$/);
  if(s2){const sy=(p.sys||{})[s2[1]];if(sy&&sy.old&&sy.old[s2[2]]){delete sy.old[s2[2]];markTs("sys."+s2[1]+".old",p);const el=$("main").querySelector(`[data-k="${k}"]`);if(el)el.classList.remove("old")}}
}
function icuInputHook(t,k){
  const p=P();if(!isM(p))return;
  if(k.startsWith("today.icu.")||k.startsWith("sys."))icuFresh(p,k);
  const box=t.closest(".nb");if(box&&k.startsWith("today.")){const em=box.querySelector(".trw");if(em)em.innerHTML=trendSimple(t.value,getPath(p,k.replace(/^today\./,"prior.")))}
  refreshCalcs();
}
function icuChangeHook(t,k){
  const p=P();
  const d=k.match(/^(today\.icu\.(h\.press|n\.sed)\.\d+)\.drug$/);
  if(d){const row=getPath(p,d[1]),cat=d[2]==="h.press"?PRESS:SED;if(row&&!row.unit&&cat[row.drug]){row.unit=cat[row.drug];markTs(d[1]+".unit")}}
  if(isM(p))icuFresh(p,k);
  if(t.dataset.rr){const y=scrollY;render();scrollTo(0,y)}else refreshCalcs();
}
function icuAct(a,b,p,i){
  const rr=()=>{const y=scrollY;render();scrollTo(0,y);save()};
  switch(a){
    case"icuMode":p.mode=b.dataset.v;markTs("mode");if(p.mode==="micu"&&!p.apMode){p.apMode="sys";markTs("apMode")}rr();toast(p.mode==="micu"?"MICU mode — your general-medicine fields are all still here.":"General medicine mode — MICU data is kept, just hidden.");break;
    case"icuAp":p.apMode=b.dataset.v;markTs("apMode");rr();break;
    case"icuPickM":{const k=b.dataset.k,v=b.dataset.v;let l=getPath(p,k);if(!Array.isArray(l)){l=[];setPath(p,k,l)}const j=l.indexOf(v);if(j>=0)l.splice(j,1);else l.push(v);markTs(k);icuFresh(p,k);b.classList.toggle("on",j<0);save();break}
    case"icuAddRow":{const path=b.dataset.path;let l=getPath(p,path);if(!Array.isArray(l)){l=[];setPath(p,path,l)}
      if(path==="today.icu.h.press"&&getPath(p,"today.icu.h.pressNone")){setPath(p,"today.icu.h.pressNone",false);markTs("today.icu.h.pressNone")}
      if(path==="today.icu.n.sed"&&getPath(p,"today.icu.n.sedNone")){setPath(p,"today.icu.n.sedNone",false);markTs("today.icu.n.sedNone")}l.push(ROW_TPL[b.dataset.tpl]());markTs(path);icuFresh(p,path+".");rr();break}
    case"icuDelRow":{const path=b.dataset.path,l=getPath(p,path)||[];if(!confirm("Remove this row?"))break;l.splice(i,1);markTs(path);rr();break}
    case"icuNeed":{const d=p.dev[i];d.need=d.needD===today()&&d.need===b.dataset.v?"":b.dataset.v;d.needD=today();markTs("dev");rr();break}
    case"icuCopy":{const s=b.dataset.sec,src=pi0(p)[s];if(!src)break;
      p.today.icu=p.today.icu||{};if(sectionFilled(p.today.icu[s])&&!confirm("Replace what you've entered today in this section with yesterday's?"))break;
      p.today.icu[s]=clone(src);p.icuOld=p.icuOld||{};p.icuOld[s]=p.prior.icuDate||"";markAll(p,"today.icu."+s,p.today.icu[s]);markTs("icuOld."+s);rr();
      toast("Copied — gray until you check it against today's chart.");break}
    case"icuKeep":{const s=b.dataset.sec;if(p.icuOld)delete p.icuOld[s];markTs("icuOld."+s);rr();break}
    case"icuSysKeep":{const s=(p.sys||{})[b.dataset.v];if(s){s.old={};markTs("sys."+b.dataset.v+".old")}rr();break}
    case"icuSysKeepAll":Object.keys(p.sys||{}).forEach(k=>{p.sys[k].old={};markTs("sys."+k+".old")});rr();break;
    case"icuToTodo":{const v=String(getPath(p,b.dataset.k)||"").trim();if(!v){toast("Write the goal first.");break}
      p.todos=p.todos||[];v.split(/\n+/).map(s=>s.replace(/^\s*\d+[.)]\s*/,"").trim()).filter(Boolean).forEach(t=>p.todos.push({t,done:false,st:"",cat:""}));markTs("todos");rr();toast("Added to To-do.");break}
    case"icuTrack":{p.icu=p.icu||{};const l=p.icu.track=(p.icu.track||TRACK_DEF.slice());const j=l.indexOf(b.dataset.v);if(j>=0)l.splice(j,1);else l.push(b.dataset.v);markTs("icu.track");rr();break}
    case"icuHelp":toast(HELP[b.dataset.t]||"");clearTimeout(toastT);toastT=setTimeout(hideToast,9000);break;
    case"icuBrief":presBrief=b.dataset.v==="1";render();break;
    case"icuDefMode":S.defMode=S.defMode==="micu"?"gen":"micu";saveNow();$("mDef").textContent="New patients start in: "+(S.defMode==="micu"?"MICU":"General medicine");break;
    case"icuPractice":S.practice=!S.practice;saveNow();hide("menu");render();break;
    default:presAct(a,b,p,i);
  }
}
function micuRollover(p){
  if(sectionFilled(p.today.icu)){p.prior.icu=clone(p.today.icu);p.prior.icuDate=p.today.date||today()}
  p.icuOld={};
  Object.values(p.sys||{}).forEach(s=>{s.old={};["a","pl"].forEach(f=>{if(filled(s[f]))s.old[f]=1})});
}
