/* ======================= MICU PRESENTATION LAYER =======================
   Collect once, present flexibly. Everything here only READS patient data (except the
   explicit buttons), so switching formats or profiles can never change clinical content.
   Attending profiles live in S.prefs and sync with the patients. */

/* ---------- attending profiles ---------- */
const PSECS=[["tldr","TL;DR"],["oneliner","One-liner & ICU diagnosis"],["days","Hospital / ICU day"],["events","Overnight events"],
 ["traj","Trajectory & why ICU"],["hemo","Vitals & hemodynamics"],["press","Pressors / inotropes"],["resp","Respiratory / ventilator"],
 ["neuro","Neuro / sedation"],["io","I/O, urine output & renal"],["exam","Exam"],["labs","Lab trends"],["micro","Micro, antibiotics & imaging"],
 ["ap","Assessment & plan"],["goals","Today's goals"],["devices","Lines / tubes / drains"],["checklist","ICU checklist"],["dispo","Disposition & barriers"],["todos","To-do"]];
const PSEC_L=Object.fromEntries(PSECS);
const DEF_PROFILE=()=>({id:"default",name:"Default",fmt:"auto",ap:"int",vent:"std",order:PSECS.map(x=>x[0]),hide:[],sys:SYS.map(x=>x[0])});
function profiles(){const l=(S.prefs&&S.prefs.profiles)||[];return l.length?l:[DEF_PROFILE()]}
function curProfile(){
  const l=profiles(),pr=clone(l.find(x=>x.id===(S.prefs||{}).cur)||l[0]);
  // keep old saved profiles compatible as sections/systems are added
  PSECS.forEach(([k])=>{if(!pr.order.includes(k))pr.order.push(k)});SYS.forEach(([k])=>{if(!pr.sys.includes(k))pr.sys.push(k)});
  return pr;
}
function savePrefs(mut){
  S.prefs=S.prefs||{profiles:[DEF_PROFILE()],cur:"default"};if(!S.prefs.profiles||!S.prefs.profiles.length)S.prefs.profiles=[DEF_PROFILE()];
  mut(S.prefs);S.prefs.ts=Date.now();if(S.sync)S.sync.dirty=true;saveNow();schedulePush();
}

/* ---------- which A&P layout this patient gets ----------
   "auto": systems-based when the patient is complicated (invasive vent, pressors/inotropes, RRT, or ≥2 organ supports),
   prioritized problem list otherwise. A per-patient choice (p.presFmt) overrides the profile. */
function autoFmt(p){
  const ic=ic0(p),r=ic.r||{},sup=[];
  if(isVent(r))sup.push("ventilator");else if(["HFNC","CPAP","BiPAP"].includes(r.sup))sup.push(r.sup);
  if((((ic.h||{}).press)||[]).some(x=>x.drug))sup.push("pressors");
  const rr=(ic.rn||{}).rrt;if(rr&&rr!=="None")sup.push(rr);
  const complex=isVent(r)||sup.includes("pressors")||(rr&&rr!=="None")||sup.length>=2;
  return {fmt:complex?"sys":"prob",why:complex?`complicated — ${sup.join(", ")}`:(sup.length?`one organ support (${sup[0]})`:"no organ support documented")};
}
function effFmt(p,prof){
  if(p.presFmt==="sys"||p.presFmt==="prob")return {fmt:p.presFmt,why:"set for this patient"};
  if(prof.fmt==="auto")return autoFmt(p);
  return {fmt:prof.fmt,why:`profile “${prof.name}”`};
}

/* ---------- mode-aware ventilator / O2 report ---------- */
const pct=v=>{const f=fio2f(v);return isNaN(f)?null:Math.round(f*100)+"%"};
function ventReport(p,ord){
  const r=ic0(p).r||{},s=r.sup||"",miss=[];
  const g=(k,lab,f)=>{if(filled(r[k]))return f(r[k]);miss.push(lab);return null};
  const fi=()=>filled(r.fio2)?"FiO₂ "+(pct(r.fio2)||r.fio2+" (check)"):(miss.push("FiO₂"),null);
  if(!s)return {line:"",meas:"",miss:["respiratory support"],vent:false};
  if(!isVent(r)){
    let line="";
    if(s==="RA")line="Room air";
    else if(["NC","Face mask","NRB","Trach collar"].includes(s))line=`${filled(r.flow)?r.flow+" L ":(s==="NC"?(miss.push("flow"),""):"")}${({NC:"nasal cannula","Face mask":"face mask",NRB:"non-rebreather","Trach collar":"trach collar"})[s]}`;
    else if(s==="HFNC")line=["HFNC",g("flow","flow",x=>x+" L"),fi()].filter(Boolean).join(", ");
    else if(s==="BiPAP")line=["BiPAP",(filled(r.ipap)||filled(r.epap))?`${r.ipap||"?"}/${r.epap||"?"}`:(miss.push("IPAP/EPAP"),null),fi()].filter(Boolean).join(" ").replace(" FiO₂",", FiO₂");
    else if(s==="CPAP")line=["CPAP",g("epap","CPAP level",x=>x),fi()].filter(Boolean).join(" ").replace(" FiO₂",", FiO₂");
    if(filled(r.wob))line+=` — work of breathing ${r.wob.toLowerCase()}`;
    return {line,meas:"",miss,vent:false};
  }
  const m=r.vmode;if(!m)miss.push("vent mode");
  const rate=()=>g("vrr","set rate",x=>"rate "+x),vt=()=>g("vvt",m==="PRVC"?"target Vt":"set Vt",x=>(m==="PRVC"?"target Vt ":"Vt ")+x+" mL"),
    pi=()=>g("vpi","inspiratory pressure",x=>`inspiratory pressure ${x}${r.pconv==="above"?" above PEEP":r.pconv==="abs"?" (absolute)":""}`),
    ps=()=>g("vps","pressure support",x=>"PS "+x),peep=()=>g("vpeep","PEEP",x=>"PEEP "+x);
  if(m==="AC/PC"&&filled(r.vpi)&&!r.pconv)miss.push("whether insp. pressure is above PEEP or absolute");
  const alt=ord==="alt";let parts=[];
  if(m==="AC/VC"||m==="PRVC")parts=alt?[vt(),rate(),peep(),fi()]:[rate(),vt(),fi(),peep()];
  else if(m==="AC/PC")parts=alt?[pi(),rate(),peep(),fi()]:[rate(),pi(),fi(),peep()];
  else if(m==="PSV"){const a=ps(),b=peep();parts=[a&&b?`${a} over ${b}`:a||b,fi()]}
  else if(m==="SIMV")parts=alt?[vt(),rate(),ps(),peep(),fi()]:[rate(),vt(),ps(),fi(),peep()];
  else if(m==="APRV")parts=[g("phi","P high",x=>"P high "+x),g("plo","P low",x=>"P low "+x),g("thi","T high",x=>"T high "+x),g("tlo","T low",x=>"T low "+x),fi()];
  else if(m==="Other")parts=[filled(r.vother)?r.vother:(miss.push("settings"),null),fi()];
  const line=[s==="Trach vent"?"Trach vent":"",m||"Vent (mode not set)"].filter(Boolean).join(" ")+(parts.filter(Boolean).length?", "+parts.filter(Boolean).join(", "):"");
  // measured values: always labeled as measured; spontaneous modes lead with rate and Vt
  const spont=m==="PSV";
  if(spont){if(!filled(r.mrr))miss.push("actual RR");if(!filled(r.mvt))miss.push("exhaled Vt")}
  const mv=[filled(r.mrr)&&`${spont?"breathing":"RR"} ${r.mrr}`,filled(r.mvt)&&`Vte ${r.mvt} mL`,filled(r.mve)&&`Ve ${r.mve} L/min`,filled(r.pip)&&`PIP ${r.pip}`,filled(r.pplat)&&`Pplat ${r.pplat}`,filled(r.tpeep)&&`total PEEP ${r.tpeep}`].filter(Boolean);
  const calcs=respCalc(p).filter(x=>x.v&&x.v!=="—"&&x.l!=="PBW"&&x.l!=="Check").map(x=>`${x.l} ${x.v}`);
  return {line,meas:mv.length?"Measured: "+mv.join(", "):"",calcs,miss,vent:true};
}

/* ---------- device inventory ---------- */
const devRank=t=>{const i=DEV.indexOf(t);return i<0?99:i};
function devItem(d){
  const n=num(d.count),name=d.type==="PIV"&&n>1?`${n} PIVs`:d.type;
  return [filled(d.site)?d.site:"",name,filled(d.det)?`(${d.det})`:"",hday(d.date)?`day ${hday(d.date)}`:""].filter(Boolean).join(" ")
    +(d.needD===today()&&d.need==="No"?" — plan to remove":"");
}
function devInventory(p){
  const l=(p.dev||[]).filter(d=>d.type).slice().sort((a,b)=>devRank(a.type)-devRank(b.type)),okd=ic0(p).devOK;
  if(!l.length)return okd?"No lines, tubes or drains (confirmed today)":`<span class="miss">No devices documented — not confirmed</span>`;
  const unrev=l.filter(d=>d.needD!==today()).map(d=>d.type);
  return esc(l.map(devItem).join("; "))+(unrev.length?` <span class="miss">(necessity not reviewed today: ${esc(unrev.join(", "))})</span>`:"")+(okd?"":` <span class="miss">(inventory not confirmed today)</span>`);
}

/* ---------- missing / stale check before presenting ---------- */
const SECN={st:"ICU status",h:"Hemodynamics",r:"Respiratory",n:"Neuro",rn:"Renal",id:"Infection",cv:"Cardiac",gi:"GI / endo"};
function preCheck(p){
  const out=[],ic=ic0(p),r=ic.r||{},h=ic.h||{},n=ic.n||{},T=p.today||{};
  const copied=Object.keys(p.icuOld||{}).map(k=>SECN[k]||k);if(copied.length)out.push(`Copied from yesterday, not checked: ${copied.join(", ")}`);
  const vr=ventReport(p,"std");if(vr.miss.length)out.push(`${vr.vent?"Ventilator":"Respiratory"}: missing ${vr.miss.join(", ")}`);
  const pr=(h.press||[]).filter(x=>x.drug);
  if(!pr.length&&!h.pressNone){const y=dripsLine(p,"h.press","prior");out.push(y?`Pressors not documented today (yesterday: ${y}) — enter doses or tap "None"`:`Pressors not documented — tap "None" if off`)}
  pr.filter(x=>!filled(x.cur)).forEach(x=>out.push(`No current dose for ${dripName(x)}`));
  if(isVent(r)){const sd=(n.sed||[]).filter(x=>x.drug);if(!sd.length&&!n.sedNone)out.push(`Sedation not documented — tap "None" if off`);if(!filled(n.rass))out.push("RASS not entered")}
  if(!mapCalc(p)||mapCalc(p).bad)out.push("No usable BP / MAP today");
  if(!anyIn(T.ios,[...IO_IN,...IO_OUT]))out.push("I/O not entered");
  if(!ic.devOK)out.push("Device inventory not confirmed today");
  const unrev=(p.dev||[]).filter(d=>d.type&&d.needD!==today()).length;if(unrev)out.push(`${unrev} device${unrev>1?"s":""}: necessity not reviewed today`);
  const unv=(T.verify||[]).filter(v=>filled(v.t)&&!v.done).map(v=>v.t);if(unv.length)out.push(`Not verified yet: ${unv.join(", ")}`);
  const stale=[p.storyOld&&filled(p.story)&&"TL;DR",p.onelinerOld&&"one-liner",(p.problems.some(x=>x.old&&Object.keys(x.old).length)||SYS.some(([k])=>Object.keys(((p.sys||{})[k]||{}).old||{}).length))&&"A&P"].filter(Boolean);
  if(stale.length)out.push(`Still from yesterday: ${stale.join(", ")}`);
  if(!hasLabs(p,"today")&&!filled(T.labs))out.push("No labs entered today");
  return out;
}

/* ---------- A&P from the same data in either format ---------- */
function apItems(p,prof){
  const probs=p.problems.filter(x=>filled(x.p)||filled(x.a)||filled(x.pl)),sd=k=>(p.sys||{})[k]||{},SL=Object.fromEntries(SYS);
  const linked=new Set(SYS.flatMap(([k])=>sd(k).link||[]));
  const pOld=pr=>!!(pr.old&&Object.keys(pr.old).length),sOld=k=>!!Object.keys(sd(k).old||{}).length;
  const items=[];
  if(prof.fmt==="sys"){
    prof.sys.forEach(k=>{const s=sd(k),lp=probs.filter(pr=>(s.link||[]).includes(pr.p));
      const a=[s.a,...lp.filter(pr=>filled(pr.a)).map(pr=>`${pr.p}: ${pr.a}`)].filter(filled),pl=[s.pl,...lp.filter(pr=>filled(pr.pl)).map(pr=>`${pr.p}: ${pr.pl}`)].filter(filled);
      if(a.length||pl.length)items.push({t:SL[k],tags:lp.map(x=>x.p),a,pl,old:sOld(k)||lp.some(pOld)})});
    probs.filter(pr=>!linked.has(pr.p)&&(filled(pr.a)||filled(pr.pl))).forEach(pr=>items.push({t:pr.p||"Problem",grp:"Other problems",a:[pr.a].filter(filled),pl:[pr.pl].filter(filled),old:pOld(pr)}));
  }else{
    const prim=probs[0],rest=probs.slice(1),act=rest.filter(x=>!x.chronic),chr=rest.filter(x=>x.chronic);
    const pi=(pr,grp)=>{const ls=SYS.filter(([k])=>(sd(k).link||[]).includes(pr.p));
      items.push({t:pr.p||"Problem",grp,a:[pr.a,...ls.filter(([k])=>filled(sd(k).a)).map(([k,l])=>`${l.split(" /")[0]}: ${sd(k).a}`)].filter(filled),
        pl:[pr.pl,...ls.filter(([k])=>filled(sd(k).pl)).map(([k,l])=>`${l.split(" /")[0]}: ${sd(k).pl}`)].filter(filled),old:pOld(pr)||ls.some(([k])=>sOld(k))})};
    if(prim)pi(prim,"Primary ICU problem");else if(filled((p.icu||{}).dx))items.push({t:p.icu.dx,grp:"Primary ICU problem",a:[],pl:[],old:false});
    act.forEach(x=>pi(x,"Active problems"));chr.forEach(x=>pi(x,"Chronic conditions affecting care"));
    SYS.filter(([k])=>k!=="dispo"&&!(sd(k).link||[]).length&&(filled(sd(k).a)||filled(sd(k).pl))).forEach(([k,l])=>items.push({t:l,grp:"ICU maintenance / other systems",a:[sd(k).a].filter(filled),pl:[sd(k).pl].filter(filled),old:sOld(k)}));
    const dz=sd("dispo");if(filled(dz.a)||filled(dz.pl))items.push({t:"Disposition / goals of care",grp:"Disposition",a:[dz.a].filter(filled),pl:[dz.pl].filter(filled),old:sOld("dispo")});
  }
  return items;
}
function apHtml(p,prof,brief){
  const items=apItems(p,prof),br=s=>esc(s).replace(/\n/g,"<br>"),stl=x=>x.old?` <span class="stale">from ${esc(mmdd(p.apFrom)||"yesterday")} — not updated</span>`:"";
  if(!items.length)return `<span class="miss">No assessment / plan entered</span>`;
  let g0="";const grp=x=>{if(x.grp&&x.grp!==g0){g0=x.grp;return `<div class="apg">${esc(x.grp)}</div>`}return""};
  if(brief||prof.ap!=="sep")return items.map(x=>`${grp(x)}<div class="pp ${x.old?"oldtxt":""}"><b>${esc(x.t)}</b>${x.tags&&x.tags.length?` <span class="tsb">${esc(x.tags.join(", "))}</span>`:""}${stl(x)}
    ${!brief?x.a.map(a=>`<div>${br(a)}</div>`).join(""):""}${x.pl.map(l=>`<div class="plan">→ ${br(l)}</div>`).join("")}</div>`).join("");
  g0="";const A=items.filter(x=>x.a.length).map(x=>`${grp(x)}<div class="pp ${x.old?"oldtxt":""}"><b>${esc(x.t)}:</b> ${x.a.map(br).join("; ")}${stl(x)}</div>`).join("");
  g0="";const Pl=items.filter(x=>x.pl.length).map(x=>`${grp(x)}<div class="pp ${x.old?"oldtxt":""}"><b>${esc(x.t)}:</b> ${x.pl.map(br).join("; ")}</div>`).join("");
  return `<div class="apg big">Assessment</div>${A||`<span class="miss">none entered</span>`}<div class="apg big">Plan</div>${Pl||`<span class="miss">none entered</span>`}`;
}

/* ---------- section registry for the oral presentation ---------- */
const miss=t=>`<span class="miss">${t}</span>`;
function presSections(p,prof0,brief){
  const prof=Object.assign({},prof0,{fmt:effFmt(p,prof0).fmt});
  const T=p.today||{},ic=ic0(p),r=ic.r||{},h=ic.h||{},n=ic.n||{},rn=ic.rn||{},icu=p.icu||{},st=ic.st||{},v=T.vit||{};
  const txt=x=>filled(x)?`<p>${esc(x).replace(/\n/g,"<br>")}</p>`:"",j=a=>a.filter(x=>x&&String(x).trim()).join(" · ");
  const stale=d=>` <span class="stale">from ${esc(mmdd(d)||"yesterday")} — not updated</span>`;
  const m=mapCalc(p),u=uopCalc(p),vr=ventReport(p,prof.vent),hd=hday(icu.hAdm),idd=hday(icu.iAdm);
  const S_={
    tldr:()=>filled(p.story)?`<div class="${p.storyOld?"oldtxt":""}">${esc(p.story).replace(/\n/g,"<br>")}</div>${p.storyOld?stale(""):""}`:"",
    oneliner:()=>(filled(p.oneliner)?`<div class="${p.onelinerOld?"oldtxt":""}">${txt(p.oneliner)}</div>${p.onelinerOld?stale(p.apFrom):""}`:"")+(filled(icu.dx)?`<p><b>ICU diagnosis:</b> ${esc(icu.dx)}${filled(icu.comorb)&&!brief?" · "+esc(icu.comorb):""}</p>`:""),
    days:()=>j([hd&&`Hospital day ${hd}`,idd&&`ICU day ${idd}`])||(brief?"":miss("Admit dates not entered")),
    events:()=>{const e=(ic.ev||[]).filter(x=>filled(x.what)||filled(x.type));return (e.length?`<ul>${e.map(x=>`<li>${esc(evTxt(x))}</li>`).join("")}</ul>`:"")+txt(p.on)||(brief?"":"No overnight events entered")},
    traj:()=>(st.traj?`<p><b>${esc(st.traj)}</b>${filled(st.trajT)?" — "+esc(st.trajT):""}</p>`:"")+((st.why||[]).length||filled(st.whyT)?`<p>In the ICU for: ${esc(j([(st.why||[]).join(", "),st.whyT]))}</p>`:""),
    hemo:()=>j([filled(v.tmax)&&`Tmax ${esc(v.tmax)}`,filled(h.hrR)?`HR ${esc(h.hrR)}`:filled(v.hr)&&`HR ${esc(v.hr)}`,filled(h.bpR)?`BP ${esc(h.bpR)}`:"",
      m&&!m.bad&&`MAP ${m.v}${m.calc?" (calc from cuff)":""}`,filled(h.mapGoal)&&`goal ${esc(h.mapGoal)}`,filled(h.mapLow)&&`lowest overnight ${esc(h.mapLow)}`])
      +(!brief?(j([h.cr&&"cap refill "+esc(h.cr),h.ext&&esc(h.ext.toLowerCase())+" extremities",h.mot&&"mottling "+esc(h.mot.toLowerCase())])?`<p>Perfusion: ${j([h.cr&&"cap refill "+esc(h.cr),h.ext&&esc(h.ext.toLowerCase())+" extremities",h.mot&&"mottling "+esc(h.mot.toLowerCase())])}</p>`:""):"")
      +(filled((T.lab||{}).lac)?`<p>Lactate ${esc(T.lab.lac)} ${trendOf(p,"lab","lac")}</p>`:""),
    press:()=>{const l=dripsLine(p,"h.press");if(l)return esc(l);if(h.pressNone)return "None";const y=dripsLine(p,"h.press","prior");return miss(y?`Not documented today (yesterday: ${esc(y)})`:"Not documented")},
    resp:()=>{if(!vr.line&&!vr.miss.length)return"";
      const abg=(ic.abg||[]).filter(g=>filled(g.ph)),last=abg[abg.length-1];
      const pf=last?abgInterp(last).find(x=>/^P\/F \d/.test(x)):null;
      return `<p>${esc(vr.line)||miss("Support not entered")}${filled(v.spo2)?` · SpO₂ ${esc(v.spo2)}%`:""}</p>`
        +(vr.meas&&(!brief||vr.vent)?`<p>${esc(vr.meas)}${vr.calcs&&vr.calcs.length?" · "+esc(vr.calcs.join(", ")):""}</p>`:"")
        +(last?`<p>${esc(abgTxt(last))}${pf?" · "+esc(pf.split(" (")[0]):""}</p>`:"")
        +(j([r.sbt&&"SBT: "+esc(r.sbt.toLowerCase()),r.extub&&"extubation: "+esc(r.extub.toLowerCase())])?`<p>${j([r.sbt&&"SBT: "+esc(r.sbt.toLowerCase()),r.extub&&"extubation: "+esc(r.extub.toLowerCase())])}</p>`:"")
        +(vr.miss.length?`<p>${miss("Missing: "+esc(vr.miss.join(", ")))}</p>`:"")},
    neuro:()=>{const sed=dripsLine(p,"n.sed");
      return j([n.ms&&esc(n.ms),filled(n.rass)&&`RASS ${esc(n.rass)}${filled(n.rassT)?` (target ${esc(n.rassT)})`:""}`,filled(n.cam)&&`CAM-ICU ${esc(n.cam.toLowerCase())}`,!brief&&filled(n.cmd)&&`follows commands: ${esc(n.cmd.toLowerCase())}`,!brief&&filled(n.pain)&&`pain ${esc(n.pain)}`])
        +(sed?`<p>Sedation: ${esc(sed)}</p>`:n.sedNone?`<p>Sedation: none</p>`:isVent(r)?`<p>${miss("Sedation not documented")}</p>`:"")},
    io:()=>{const io=ioLine(p);return (io||miss("I/O not entered"))+j([u&&u.v&&`UOP ${u.v} mL/kg/h`,crRatio(p)&&esc(crRatio(p)),filled(rn.cum)&&`cumulative ${esc(rn.cum)}`,!brief&&filled(rn.diur)&&esc(rn.diur),rn.rrt&&rn.rrt!=="None"&&esc(rn.rrt)+(rn.rrt==="CRRT"&&filled(rn.uf)?` UF ${esc(rn.uf)} mL/h`:"")])},
    exam:()=>{const e=exLines(T.ex);return (p.examOld&&e.length?` <span class="stale">copied — re-examine</span>`:"")+e.map(x=>`<div class="${x.ab?"abn":""}"><b>${esc(x.l)}:</b> ${esc(x.t)}</div>`).join("")+txt(T.exam)||(brief?"":miss("No exam entered"))},
    labs:()=>(hasLabs(p,"today")||filled(T.labs))?((brief?"":(hasLabs(p,"today")?fish(p,"today",true):""))+trackTable(p,true)+(brief?"":txt(T.labs))):miss("No labs entered today"),
    micro:()=>{const ab=(p.abx||[]).filter(a=>a.name),cx=(p.cx||[]).filter(c=>!brief||c.st==="Positive"||c.st==="Pending"||c.st==="NGTD"),im=(p.img||[]).filter(x=>!brief||x.st!=="Final"||filled(x.imp));
      return (ab.length?`<p>Antibiotics: ${ab.map(a=>esc(abxTxt(a))+(filled(a.ind)&&!brief?" for "+esc(a.ind):"")).join("; ")}</p>`:"")
        +(j([filled(icu.infSrc)&&"source "+esc(icu.infSrc),icu.infSC&&"source control "+esc(icu.infSC.toLowerCase())])?`<p>${j([filled(icu.infSrc)&&"source "+esc(icu.infSrc),icu.infSC&&"source control "+esc(icu.infSC.toLowerCase())])}</p>`:"")
        +cx.map(c=>`<div class="${c.st==="Positive"?"abn":""}">${esc(cxText(c))}</div>`).join("")+im.map(x=>`<div>${esc(imgText(x))}</div>`).join("")},
    ap:()=>apHtml(p,prof,brief),
    goals:()=>{const g=ic.g||{};return GOALS.filter(([k])=>filled(g[k])&&(!brief||k==="top")).map(([k,l])=>`<div><b>${esc(l)}:</b> ${esc(g[k]).replace(/\n/g,"<br>")}</div>`).join("")},
    devices:()=>devInventory(p),
    checklist:()=>{const c=ic.chk||{},all=ICHK.flatMap(([,it])=>it),flag=all.filter(([k])=>c[k]==="N"||c[k]==="D").map(([k,l])=>`${esc(l)} — ${c[k]==="N"?"no":"deferred"}`);
      const prev=["vte","sup","nutr","gluc","bowel","skin","mob"],yes=all.filter(([k])=>prev.includes(k)&&(c[k]==="Y"||c[k]==="NA")).map(([k,l])=>`${esc(l.replace(/ \(.*\)/,""))}${c[k]==="NA"?" n/a":" ✓"}`);
      const n=Object.values(c).filter(Boolean).length;
      return (flag.length?`<ul>${flag.map(f=>`<li>${f}</li>`).join("")}</ul>`:"")+(!brief&&yes.length?`<p>${yes.join(" · ")}</p>`:"")+(n?"":miss("Checklist not reviewed today"))},
    dispo:()=>{const c=ic.chk||{},g=ic.g||{},dz=(p.sys||{}).dispo||{};
      return j([c.still&&`Still needs ICU: ${({Y:"yes",N:"no",NA:"n/a",D:"deferred"})[c.still]}`,c.down&&`downgrade today: ${({Y:"possible",N:"no",NA:"n/a",D:"deferred"})[c.down]}`])
        +(filled(g.barrier)?`<p>Barriers: ${esc(g.barrier)}</p>`:"")+(prof.fmt==="sys"?"":(filled(dz.pl)?`<p>${esc(dz.pl)}</p>`:""))},
    todos:()=>{const t=(p.todos||[]).filter(x=>filled(x.t)&&!x.done);return t.length?`<ul>${t.map(x=>`<li>${esc(x.t)}${x.cat?` <span class="tsb cat">${esc(x.cat)}</span>`:""}${x.st?` <span class="tsb">${esc(x.st)}</span>`:""}</li>`).join("")}</ul>`:""}
  };
  const secKey={hemo:"h",press:"h",resp:"r",neuro:"n",io:"rn",micro:"id",traj:"st",goals:"g"};
  return prof.order.filter(k=>!prof.hide.includes(k)).map(k=>{
    let html="";try{html=S_[k]?S_[k]():""}catch(e){html=miss("Couldn't build this section")}
    if(!html||!String(html).replace(/<[^>]+>/g,"").trim())return"";
    const ck=secKey[k],cp=ck&&(p.icuOld||{})[ck];
    return `<section class="ps ${cp?"oldtxt":""}"><h4>${esc(PSEC_L[k])}${cp?` <span class="stale">copied ${esc(mmdd(p.icuOld[ck]))} — not checked</span>`:""}</h4><div>${html}</div></section>`}).join("");
}

/* ---------- MICU presenting view ---------- */
let presBrief=false;
function renderPresentMicu(p){
  const prof=curProfile(),pc=preCheck(p),icu=p.icu||{},i=S.patients.indexOf(p),prev=S.patients[i-1],next=S.patients[i+1];
  $("main").innerHTML=`<div class="pres">
    <div class="ph1">${esc(p.name)||"Patient"}</div>
    <div class="ph2">${[p.room&&"Rm "+esc(p.room),hday(icu.hAdm)&&"HD "+hday(icu.hAdm),hday(icu.iAdm)&&"ICU d"+hday(icu.iAdm),p.code&&"Code: "+esc(p.code)].filter(Boolean).join(" · ")}</div>
    <div class="pfmt noprint">
      ${(()=>{const e=effFmt(p,prof),pf=p.presFmt||"";return `<div class="chips"><span class="pfl">A&amp;P:</span>${[["","Auto"],["sys","Systems"],["prob","Prioritized problems"]].map(([v,l])=>`<button class="chip ${pf===v?"on":""}" data-act="icuPresFmt" data-v="${v}">${l}</button>`).join("")}</div>
        <div class="meta">Presenting ${e.fmt==="sys"?"systems-based":"as a prioritized problem list"} — ${esc(e.why)}${pf?"":prof.fmt==="auto"?" (auto: systems for complicated patients, prioritized problems for the rest)":""}</div>`})()}
      <div class="chips">${profiles().map(x=>`<button class="chip ${x.id===prof.id?"on":""}" data-act="icuPcPick" data-v="${esc(x.id)}">${esc(x.name)}</button>`).join("")}<button class="chip" data-act="icuPcOpen">⚙ Customize</button></div>
      <div class="chips"><button class="chip ${presBrief?"":"on"}" data-act="icuBrief" data-v="0">Full</button><button class="chip ${presBrief?"on":""}" data-act="icuBrief" data-v="1">Brief</button></div>
    </div>
    ${pc.length?`<details class="precheck noprint" open><summary>⚠ ${pc.length} thing${pc.length>1?"s":""} to check before presenting</summary><ul>${pc.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details>`:`<div class="precheck ok noprint">✓ Nothing missing or stale that the app can see</div>`}
    ${presSections(p,prof,presBrief)}
    <div class="pnav noprint">
      <button class="btn" ${prev?`data-act="tab" data-id="${prev.id}"`:"disabled"}>← ${prev?esc(tabLabel(prev,i-1)):"—"}</button>
      <button class="btn" data-act="present">✎ Edit</button>
      <button class="btn" ${next?`data-act="tab" data-id="${next.id}"`:"disabled"}>${next?esc(tabLabel(next,i+1)):"—"} →</button>
    </div></div>`;
}

/* ---------- profile editor (sheet) ---------- */
let pcDraft=null;
function pcSheet(){
  let el=$("presCfg");if(!el){el=document.createElement("div");el.id="presCfg";el.className="sheet hidden";el.innerHTML='<div class="box pcbox"></div>';document.body.appendChild(el)}
  const d=pcDraft,box=el.querySelector(".box"),SL=Object.fromEntries(SYS);
  box.innerHTML=`<h3>Presentation format</h3>
    <label class="nb wide"><span>Profile name (e.g. the attending)</span><input type="text" id="pcName" value="${esc(d.name)}"></label>
    <div class="fbh">A&amp;P organized by (patients can override)</div><div class="chips">${[["auto","Auto — systems if complicated, else prioritized problems"],["sys","Always systems"],["prob","Always prioritized problems"]].map(([v,l])=>`<button class="chip ${d.fmt===v?"on":""}" data-act="icuPcSet" data-k="fmt" data-v="${v}">${l}</button>`).join("")}</div>
    <div class="fbh">Assessment and plan</div><div class="chips">${[["int","Integrated (per item)"],["sep","Separate (all assessments, then all plans)"]].map(([v,l])=>`<button class="chip ${d.ap===v?"on":""}" data-act="icuPcSet" data-k="ap" data-v="${v}">${l}</button>`).join("")}</div>
    <div class="fbh">Ventilator settings order</div><div class="chips">${[["std","Mode, rate, Vt/Pinsp, FiO₂, PEEP"],["alt","Mode, Vt/Pinsp, rate, PEEP, FiO₂"]].map(([v,l])=>`<button class="chip ${d.vent===v?"on":""}" data-act="icuPcSet" data-k="vent" data-v="${v}">${l}</button>`).join("")}</div>
    <div class="fbh">Presentation order (✓ = shown)</div>
    ${d.order.map((k,i)=>`<div class="pcrow"><input type="checkbox" data-act="icuPcHide" data-v="${k}" ${d.hide.includes(k)?"":"checked"}><span>${esc(PSEC_L[k])}</span><button class="mini" data-act="icuPcMove" data-k="order" data-i="${i}" data-v="-1">↑</button><button class="mini" data-act="icuPcMove" data-k="order" data-i="${i}" data-v="1">↓</button></div>`).join("")}
    <div class="fbh">Systems order</div>
    ${d.sys.map((k,i)=>`<div class="pcrow"><span>${esc(SL[k])}</span><button class="mini" data-act="icuPcMove" data-k="sys" data-i="${i}" data-v="-1">↑</button><button class="mini" data-act="icuPcMove" data-k="sys" data-i="${i}" data-v="1">↓</button></div>`).join("")}
    <div class="toolbar"><button class="btn pri" data-act="icuPcSave">Save</button><button class="btn" data-act="icuPcNew">Save as new profile</button>${d.id!=="default"?`<button class="btn danger" data-act="icuPcDel">Delete</button>`:`<button class="btn" data-act="icuPcReset">Reset to default</button>`}<button class="btn" data-act="icuPcClose">Close</button></div>
    <p class="note">Profiles only change the order and layout of the presentation — never the patient data. They sync to your paired devices.</p>`;
  el.classList.remove("hidden");
}
function presAct(a,b,p,i){
  const rer=()=>{if(p){const y=scrollY;render();scrollTo(0,y)}};
  switch(a){
    case"icuPresFmt":p.presFmt=b.dataset.v;markTs("presFmt");save();rer();break;
    case"icuPcPick":savePrefs(s=>{s.cur=b.dataset.v});rer();break;
    case"icuPcQuick":{const k=b.dataset.k,v=b.dataset.v,pr=curProfile();savePrefs(s=>{let x=s.profiles.find(q=>q.id===pr.id);if(!x){x=pr;s.profiles.push(x)}x[k]=v;s.cur=x.id});rer();break}
    case"icuPcOpen":pcDraft=curProfile();pcSheet();break;
    case"icuPcClose":$("presCfg").classList.add("hidden");break;
    case"icuPcSet":pcDraft.name=$("pcName").value;pcDraft[b.dataset.k]=b.dataset.v;pcSheet();break;
    case"icuPcHide":{pcDraft.name=$("pcName").value;const k=b.dataset.v,h=pcDraft.hide,j=h.indexOf(k);if(j>=0)h.splice(j,1);else h.push(k);pcSheet();break}
    case"icuPcMove":{pcDraft.name=$("pcName").value;const l=pcDraft[b.dataset.k],j=i+ +b.dataset.v;if(j<0||j>=l.length)break;[l[i],l[j]]=[l[j],l[i]];pcSheet();break}
    case"icuPcSave":{pcDraft.name=$("pcName").value.trim()||pcDraft.name;const d=clone(pcDraft);savePrefs(s=>{const j=s.profiles.findIndex(q=>q.id===d.id);if(j>=0)s.profiles[j]=d;else s.profiles.push(d);s.cur=d.id});$("presCfg").classList.add("hidden");rer();toast("Saved “"+d.name+"”.");break}
    case"icuPcNew":{const d=clone(pcDraft);d.name=$("pcName").value.trim();if(!d.name||d.name===pcDraft.name&&profiles().some(x=>x.name===d.name)){d.name=prompt("Name for the new profile (e.g. Dr. Lee):","")||"";if(!d.name)break}
      d.id=uid();savePrefs(s=>{s.profiles.push(d);s.cur=d.id});$("presCfg").classList.add("hidden");rer();toast("Created “"+d.name+"”.");break}
    case"icuPcDel":{if(!confirm("Delete the “"+pcDraft.name+"” profile?"))break;const id=pcDraft.id;savePrefs(s=>{s.profiles=s.profiles.filter(q=>q.id!==id);s.cur=(s.profiles[0]||{}).id||"default"});$("presCfg").classList.add("hidden");rer();break}
    case"icuPcReset":pcDraft=Object.assign(DEF_PROFILE(),{name:pcDraft.name});pcSheet();break;
    case"icuAfter":afterOn=true;listOn=false;render();scrollTo(0,0);break;
    case"icuDevOK":{p.today.icu=p.today.icu||{};const v=ic0(p).devOK;p.today.icu.devOK=v?"":new Date().toTimeString().slice(0,5);markTs("today.icu.devOK");const y=scrollY;render();scrollTo(0,y);save();break}
    case"icuNone":{const k=b.dataset.k,cur=getPath(p,k);setPath(p,k,!cur);markTs(k);icuFresh(p,k);const y=scrollY;render();scrollTo(0,y);save();break}
  }
}

/* ---------- after-rounds view (all patients) ---------- */
let afterOn=false;
function renderAfter(){
  $("title").textContent="After rounds";
  if(!S.patients.length){$("main").innerHTML=`<div class="empty"><p>No patients yet.</p></div>`;return}
  const catRank=c=>{const i=TCAT.indexOf(c||"");return i<=0?99:i};
  let open=0;
  const cards=S.patients.map(p=>{
    const T=p.today||{},ic=ic0(p),c=ic.chk||{};
    const todos=(p.todos||[]).map((t,j)=>[t,j]).filter(([t])=>filled(t.t)).sort((a,b)=>(a[0].done-b[0].done)||(catRank(a[0].cat)-catRank(b[0].cat)));
    open+=todos.filter(([t])=>!t.done).length;
    const pend=[...(p.cx||[]).filter(x=>x.st==="Pending"||x.st==="NGTD").map(x=>cxText(x)),...(p.img||[]).filter(x=>x.st==="Ordered"||x.st==="Pending read").map(x=>imgText(x)),...(p.cons||[]).filter(x=>x.st==="Requested").map(x=>consText(x))];
    const flags=[c.family==="Y"&&"Family update needed",c.goc==="Y"&&"Goals-of-care discussion needed",p.storyOld&&filled(p.story)&&"TL;DR needs update",...(p.dev||[]).filter(d=>d.type&&d.needD===today()&&d.need==="No").map(d=>`Remove ${d.type}${filled(d.site)?" ("+d.site+")":""}`)].filter(Boolean);
    return `<div class="card"><button class="ch" data-act="open" data-id="${p.id}"><b>${p.room?"Rm "+esc(p.room):"—"}</b><span class="nm">${esc(p.name)||"Patient"}</span><span class="pct">edit ›</span></button>
      ${filled(T.dec)?`<div class="dec"><b>Decided on rounds:</b> ${esc(T.dec).replace(/\n/g,"<br>")}</div>`:`<div class="meta">No decisions recorded — add them under Assessment &amp; plan.</div>`}
      ${flags.length?`<div>${flags.map(f=>`<span class="bdg">${esc(f)}</span>`).join("")}</div>`:""}
      ${todos.map(([t,j])=>`<label class="chk ${t.done?"done":""}"><input type="checkbox" data-act="todoChk" data-pid="${p.id}" data-i="${j}" ${t.done?"checked":""}><span class="lbl">${esc(t.t)}${t.cat&&!t.done?` <span class="tsb cat">${esc(t.cat)}</span>`:""}${t.st&&!t.done?` <span class="tsb">${esc(t.st)}</span>`:""}</span></label>`).join("")}
      <input type="text" class="qadd" data-pid="${p.id}" placeholder="＋ Add a to-do and press Enter">
      ${pend.length?`<div class="meta" style="margin-top:6px"><b>Waiting on:</b> ${esc(pend.join("; "))}</div>`:""}
    </div>`}).join("");
  $("main").innerHTML=`<p class="sumline">${open} open to-do${open===1?"":"s"} across ${S.patients.length} patient${S.patients.length>1?"s":""} · checked items clear on New day</p>${cards}`;
}
document.addEventListener("keydown",e=>{
  const t=e.target;if(!(t.classList&&t.classList.contains("qadd"))||e.key!=="Enter"||!t.value.trim())return;
  const pt=S.patients.find(x=>x.id===t.dataset.pid);if(!pt)return;
  pt.todos=pt.todos||[];pt.todos.push({t:t.value.trim(),done:false,st:"",cat:""});markTs("todos",pt);pt.updated=Date.now();
  if(S.sync)S.sync.dirty=true;saveNow();schedulePush();const y=scrollY;render();scrollTo(0,y);
  const n=$("main").querySelector(`.qadd[data-pid="${pt.id}"]`);if(n)n.focus();
});
