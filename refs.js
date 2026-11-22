/* ======================= BEDSIDE REFERENCE TOOLTIPS =======================
   Educational reminders only — never patient-specific orders. Each entry: t (title), s (short, shown first),
   m (optional "More detail"), src (where it comes from; "practice" marks common practice / heuristics).
   Edit content here; tip("key") places an ⓘ button. */
const REF={
 /* ---- mechanical ventilation ---- */
 vmode:{t:"Ventilator modes",s:"<b>AC/VC:</b> you set Vt, rate, flow → pressures vary with compliance/resistance (watch PIP, Pplat). <b>AC/PC:</b> you set inspiratory pressure, time, rate → Vt varies (watch Vte, Ve). <b>PSV:</b> patient triggers every breath, no backup rate → Vt and RR depend on the patient; used for weaning / SBT.",
  m:"In assist-control every breath, patient- or machine-triggered, gets the full set breath — fast patient triggering can stack breaths. PRVC is volume-targeted with a decelerating pressure-control breath. SIMV mixes mandatory breaths with pressure-supported spontaneous ones. APRV holds a high pressure with brief releases. Pressure-control 'inspiratory pressure' may be displayed above PEEP or as an absolute value depending on the ventilator — say which.",src:"Physiology; standard ICU teaching"},
 vt:{t:"Tidal volume & predicted body weight",s:"Lung-protective: start ~6 mL/kg <b>PBW</b> in ARDS (range 4–8). Always PBW from height — never actual weight.",
  m:"PBW (ARDSNet): male 50 + 0.91 × (height cm − 152.4); female 45.5 + 0.91 × (height cm − 152.4). Pair with plateau ≤30 cmH₂O. Outside ARDS, 6–8 mL/kg PBW is common practice for most ventilated patients.",src:"ARDSNet (NEJM 2000); ATS/ESICM/SCCM ARDS guideline 2017"},
 pbw:{t:"Predicted body weight",s:"Male: 50 + 0.91 × (height cm − 152.4). Female: 45.5 + 0.91 × (height cm − 152.4). Based on height, so it doesn't change with fluid or obesity.",
  m:"These are sex-based reference equations; use the one your team uses for the patient. Measure height rather than estimate when you can — a few cm changes PBW noticeably.",src:"ARDSNet"},
 rr:{t:"Respiratory rate & CO₂",s:"Minute ventilation Ve = RR × Vt. PaCO₂ falls as alveolar ventilation rises, so raising RR usually clears more CO₂.",
  m:"Higher RR shortens expiratory time → incomplete exhalation and auto-PEEP, especially in COPD/asthma (check an expiratory hold; consider lower RR, longer expiratory time). In severe metabolic acidosis the patient was compensating with a high Ve before intubation — match it afterward, or pH can fall sharply.",src:"Physiology"},
 fio2:{t:"FiO₂",s:"Fraction of inspired O₂ (0.21 = room air). Once oxygenation is adequate, wean it — avoid unnecessary hyperoxia.",
  m:"Many ICUs target SpO₂ about 92–96% (88–92% in hypercapnic COPD); individual targets vary. Write it as a fraction (0.4) or % (40%) consistently. In ARDSNet tables FiO₂ and PEEP move together.",src:"Common practice; oxygen-target trials (mixed results)"},
 peep:{t:"PEEP",s:"Keeps alveoli open at end-expiration → improves recruitment and oxygenation. Too much can cut venous return (hypotension) and overdistend lung.",
  m:"Higher PEEP is suggested for moderate–severe ARDS (without prolonged recruitment maneuvers). Total PEEP = set PEEP + auto-PEEP, measured with an expiratory hold in a passive patient.",src:"ATS ARDS guideline update 2024; physiology"},
 pip:{t:"Peak vs plateau pressure",s:"PIP = resistance + elastic pressure. <b>High PIP, normal Pplat</b> → airway resistance (bronchospasm, secretions, kinked/bitten tube). <b>Both high</b> → compliance problem (ARDS, edema, pneumothorax, mainstem, abdominal distension).",
  m:"A high peak pressure alone doesn't mean low compliance — check a plateau. A sudden rise in both with hypotension: think tension pneumothorax or severe auto-PEEP.",src:"Physiology"},
 pplat:{t:"Plateau pressure",s:"Alveolar pressure at end-inspiration, measured with a ~0.5 s inspiratory hold in a <b>passive</b> patient. ARDS target: ≤30 cmH₂O.",
  m:"Not reliable if the patient is actively breathing during the hold. Obesity or abdominal pressure can raise Pplat without overdistending lung (chest-wall stiffness).",src:"ARDSNet"},
 dp:{t:"Driving pressure",s:"Plateau − <b>total</b> PEEP. Equals Vt ÷ respiratory-system compliance in passive ventilation. ~15 cmH₂O is a commonly used ceiling — not an absolute threshold.",
  m:"Lower driving pressure was associated with survival in ARDS cohorts (observational, not a trial-tested target). Needs a valid plateau, so it isn't calculated in PSV/APRV. Static compliance = Vt ÷ driving pressure.",src:"Amato et al., NEJM 2015 (observational)"},
 pf:{t:"P/F ratio",s:"PaO₂ ÷ FiO₂ as a decimal (88 ÷ 0.4 = 220). Arterial only. Berlin ARDS severity: mild 201–300, moderate 101–200, severe ≤100 — on PEEP/CPAP ≥5.",
  m:"Severity only applies if ARDS criteria are met (timing, bilateral opacities, not mainly cardiac). The 2023 global definition also allows HFNC ≥30 L/min and SpO₂/FiO₂ ≤315 (when SpO₂ ≤97%). Use the FiO₂ at the moment of the gas.",src:"Berlin definition (JAMA 2012); global ARDS definition (2023)"},
 ards:{t:"ARDS — quick reference",s:"Within 1 week of an insult · bilateral opacities not fully explained by effusion/collapse/nodules · respiratory failure not mainly from heart failure or fluid. Then: Vt 6 mL/kg PBW, Pplat ≤30, adequate PEEP; prone for severe.",
  m:"<b>Severity (P/F on PEEP ≥5):</b> mild 201–300 · moderate 101–200 · severe ≤100.<br><b>Ventilation:</b> Vt 4–8 mL/kg PBW (start 6), Pplat ≤30, driving pressure ~≤15 (heuristic), higher PEEP for moderate–severe.<br><b>Prone positioning:</b> severe ARDS (PROSEVA: P/F <150, sessions ~16 h/day) — strong recommendation for >12 h/day.<br><b>Conservative fluids</b> once shock has resolved (FACTT).<br><b>2024 ATS update (conditional):</b> corticosteroids; neuromuscular blockade in early severe ARDS; VV-ECMO for selected severe cases.<br><b>Refractory hypoxemia:</b> check tube/PEEP/sedation/synchrony, prone, paralysis, inhaled pulmonary vasodilators as rescue (no mortality benefit), ECMO referral.",
  src:"Berlin 2012; ARDSNet 2000; PROSEVA 2013; FACTT 2006; ATS ARDS guideline 2024"},
 sbt:{t:"SAT, SBT & extubation",s:"<b>SAT:</b> pause sedation daily if safe. <b>SBT:</b> low support (PS 5–8 / PEEP 5 or T-piece) for 30–120 min. Pair them — 'wake up and breathe'.",
  m:"SBT screen (team criteria vary): improving cause of failure, FiO₂ ≤0.4–0.5 with PEEP ≤5–8, hemodynamically stable on little/no pressor, initiating breaths. Failure signs: RR >35, SpO₂ <90%, HR/BP change, distress, diaphoresis. RSBI (RR ÷ Vt in L) <105 favors success. Extubation also needs mental status, cough, manageable secretions, and an airway (cuff-leak test when at risk).",src:"ABC trial (Lancet 2008); ATS/CHEST liberation guideline 2017"},
 /* ---- ABG / acid–base ---- */
 abg:{t:"Reading a blood gas",s:"1) pH: acidemia <7.35, alkalemia >7.45. 2) Primary: PaCO₂ (respiratory) or HCO₃⁻ (metabolic) — which moves pH that way? 3) Is compensation as expected? 4) Anion gap (and delta) if acidotic.",
  m:"Normal ≈ pH 7.35–7.45, PaCO₂ 35–45, HCO₃⁻ 22–26. A normal pH with abnormal PaCO₂ and HCO₃⁻ suggests a mixed disorder. Venous gases track pH and HCO₃⁻ reasonably but PvCO₂ runs higher and PO₂ is not usable for oxygenation.",src:"Standard acid–base teaching"},
 ph:{t:"pH",s:"Normal ≈ 7.35–7.45. Below = acidemia, above = alkalemia. pH tells you which way the net disturbance goes, not how many disorders there are.",src:"Standard teaching"},
 pco2:{t:"PaCO₂ — respiratory component",s:"High PaCO₂ (>45) → respiratory acidosis. Low (<35) → respiratory alkalosis (or compensation for metabolic acidosis).",
  m:"Expected compensation for a primary respiratory problem: HCO₃⁻ rises ~1 per 10 (acute) or ~3.5 per 10 (chronic) in acidosis; falls ~2 per 10 (acute) or 4–5 per 10 (chronic) in alkalosis.",src:"Standard teaching"},
 hco3:{t:"HCO₃⁻ — metabolic component",s:"Low → metabolic acidosis. High → metabolic alkalosis. <b>Winter's:</b> expected PaCO₂ = 1.5 × HCO₃⁻ + 8 ± 2 in metabolic acidosis.",
  m:"PaCO₂ above Winter's range → concurrent respiratory acidosis (tiring, oversedated, vent Ve too low); below → concurrent respiratory alkalosis. Metabolic alkalosis: expected PaCO₂ ≈ 40 + 0.7 × (HCO₃⁻ − 24).",src:"Standard teaching"},
 ag:{t:"Anion gap",s:"AG = Na − (Cl + HCO₃⁻), normal ≈ 8–12 (lab-dependent). Correct for albumin: add ~2.5 for each 1 g/dL below 4.",
  m:"High-AG causes: lactate, ketoacidosis (DKA, alcoholic, starvation), uremia, toxins (methanol, ethylene glycol, salicylates, propylene glycol), 5-oxoproline (acetaminophen). Delta ratio (AG − 12) ÷ (24 − HCO₃⁻): <1 extra non-gap acidosis, >2 extra metabolic alkalosis.",src:"Standard teaching"},
 lactate:{t:"Lactate",s:"Linked to hypoperfusion and metabolic stress, but <b>not specific</b> for tissue hypoxia. Follow the trend in context.",
  m:"Non-hypoperfusion causes: epinephrine/β₂ agonists, liver failure, metformin, seizures, malignancy, thiamine deficiency, linezolid, propofol infusion syndrome. Surviving Sepsis suggests guiding resuscitation to lower lactate; capillary refill is a reasonable alternative (ANDROMEDA-SHOCK).",src:"SSC 2021; ANDROMEDA-SHOCK (JAMA 2019)"},
 /* ---- shock & hemodynamics ---- */
 map:{t:"MAP",s:"Cuff estimate ≈ (SBP + 2 × DBP) ÷ 3; an arterial line measures it directly. Initial target ≥65 mmHg in septic shock — individualize.",
  m:"Higher targets didn't help overall in septic shock (SEPSISPAM; '65 trial' in older patients favored permissive). Some patients (e.g., chronic hypertension, raised intracranial pressure) may need a different goal set by the team.",src:"SSC 2021; SEPSISPAM 2014; 65 trial 2020"},
 co:{t:"Cardiac output, index & SVR",s:"CO = HR × stroke volume; CI = CO ÷ BSA (≈2.5–4). SVR = 80 × (MAP − CVP) ÷ CO (≈800–1200 dyn·s/cm⁵). BP can rise on pressors while CO falls.",
  m:"Low SVR with normal/high CO → vasodilatory (distributive). High SVR with low CO → cardiogenic or hypovolemic. ScvO₂ low (<65–70%) suggests inadequate O₂ delivery; high can occur in sepsis.",src:"Physiology"},
 shock:{t:"Shock phenotypes",s:"<b>Distributive</b> (sepsis): warm early, low SVR. <b>Cardiogenic:</b> cold, high filling pressures, JVD, pulmonary edema. <b>Hypovolemic:</b> cold, flat neck veins. <b>Obstructive</b> (PE, tamponade, tension PTX): cold, JVD, specific findings.",
  m:"Bedside: extremity temperature, capillary refill, mottling, JVD, lung exam, urine output, lactate. POCUS (e.g., RUSH) helps separate them: LV/RV function, pericardial effusion, IVC, lung sliding, B-lines. Mixed shock is common.",src:"Standard teaching"},
 perf:{t:"Warm/cold, wet/dry",s:"<b>Cold</b> = poor perfusion (cool extremities, delayed cap refill, mottling, oliguria). <b>Wet</b> = congestion (JVD, edema, crackles, orthopnea). Profiles guide therapy in acute heart failure.",
  m:"Warm-wet → diuresis/vasodilators. Cold-wet → may need inotropes ± diuresis. Cold-dry → cautious volume. Capillary refill >3 s and mottling score track poor outcomes in septic shock.",src:"Stevenson profiles; ANDROMEDA-SHOCK"},
 fluids:{t:"Fluid responsiveness",s:"Responsive (CO rises with fluid) ≠ needing fluid. Test before giving: passive leg raise with a real-time CO/stroke-volume measure (↑ ≥10%). Avoid reflexive boluses in congested patients.",
  m:"Pulse-pressure variation needs sinus rhythm, passive ventilation and Vt ≥8 mL/kg — often invalid. Static CVP poorly predicts response. Surviving Sepsis suggests ~30 mL/kg crystalloid early (weak recommendation), then dynamic reassessment; balanced crystalloids preferred.",src:"SSC 2021; physiology"},
 press:{t:"Vasopressor weaning",s:"Wean as MAP, perfusion (cap refill, mentation, UOP), lactate trend and shock trajectory allow. There is <b>no universally correct order</b> for stopping norepinephrine vs vasopressin.",
  m:"Some teams stop norepinephrine first (observational data linked stopping vasopressin first with more hypotension); others stop vasopressin first. Follow local protocol and the patient's response. Educational reference only — not a dosing recommendation.",src:"Observational studies; local practice"},
 /* ---- vasoactive drugs (shown next to the selected drug) ---- */
 "drug-Norepinephrine":{t:"Norepinephrine",s:"Mostly α₁, some β₁ → vasoconstriction with modest inotropy. First-line vasopressor in septic shock.",m:"Peripheral infusion through a good IV is acceptable short-term per many protocols; watch for extravasation.",src:"SSC 2021"},
 "drug-Vasopressin":{t:"Vasopressin",s:"V₁a-mediated vasoconstriction — nonadrenergic. Common adjunct to norepinephrine in septic shock, usually a fixed dose (0.03–0.04 units/min), not titrated.",m:"SSC suggests adding it rather than escalating norepinephrine further (often around NE 0.25–0.5 mcg/kg/min). May spare catecholamine dose; watch for digital/mesenteric ischemia.",src:"SSC 2021; VASST 2008"},
 "drug-Epinephrine":{t:"Epinephrine",s:"α₁, β₁, β₂ → raises contractility and heart rate as well as SVR. Can raise lactate via β₂ (not always hypoperfusion).",m:"Second add-on in septic shock or when inotropy is also needed; tachyarrhythmias and hyperglycemia are common.",src:"SSC 2021"},
 "drug-Phenylephrine":{t:"Phenylephrine",s:"Pure α₁ → raises SVR with no direct inotropy; can lower cardiac output and cause reflex bradycardia.",m:"Useful when tachyarrhythmias limit other agents; generally not first-line in septic shock.",src:"Pharmacology"},
 "drug-Dobutamine":{t:"Dobutamine",s:"Mostly β₁ (+ β₂) → inotropy, raises CO. β₂ vasodilation can drop BP; tachyarrhythmias common.",m:"For low cardiac output with adequate MAP (cardiogenic shock, septic myocardial dysfunction with persistent hypoperfusion), often with a vasopressor.",src:"SSC 2021; pharmacology"},
 "drug-Dopamine":{t:"Dopamine",s:"Dose-dependent dopaminergic → β₁ → α₁ effects. More arrhythmias than norepinephrine; not routinely preferred in septic shock.",m:"'Renal-dose' dopamine does not protect the kidneys. Possible role in selected bradycardic patients.",src:"SOAP II (NEJM 2010); SSC 2021"},
 "drug-Milrinone":{t:"Milrinone",s:"PDE-3 inhibitor → inotropy plus vasodilation (systemic and pulmonary). Hypotension common; renally cleared — accumulates in AKI.",src:"Pharmacology"},
 "drug-Angiotensin II":{t:"Angiotensin II",s:"AT₁-mediated vasoconstriction for refractory vasodilatory shock. Thrombosis risk — patients need VTE prophylaxis.",src:"ATHOS-3 (NEJM 2017)"},
 /* ---- sedation / delirium ---- */
 rass:{t:"RASS",s:"+4 combative · +3 very agitated · +2 agitated · +1 restless · <b>0 alert & calm</b> · −1 drowsy (eyes open to voice ≥10 s) · −2 light sedation (<10 s) · −3 moderate (movement, no eye contact) · −4 deep (movement to touch only) · −5 unarousable.",
  m:"Light sedation (about −2 to 0) is preferred for most ventilated adults unless there's a specific reason for deeper sedation (e.g., severe ARDS with dyssynchrony, raised ICP).",src:"PADIS guideline (SCCM 2018)"},
 cam:{t:"CAM-ICU",s:"Delirium = (1) acute change or fluctuating course + (2) inattention + either (3) altered level of consciousness (RASS ≠ 0) or (4) disorganized thinking. Can't be assessed at RASS −4/−5.",
  m:"Reduce risk: minimize benzodiazepines, light sedation, daily SAT, early mobility, sleep hygiene, reorientation, family presence, glasses/hearing aids. Antipsychotics don't shorten delirium routinely.",src:"PADIS 2018; MIND-USA 2018"},
 sed:{t:"Analgesia-first sedation",s:"Treat pain first (CPOT/BPS), then sedate only to a target RASS. Prefer propofol or dexmedetomidine over benzodiazepines. Daily SAT when safe.",
  m:"Prolonged/deep sedation → longer ventilation, delirium, ICU-acquired weakness, VAP, pressure injury, later PTSD. Watch propofol triglycerides and propofol infusion syndrome; dexmedetomidine causes bradycardia/hypotension.",src:"PADIS 2018; ABCDEF bundle"},
 /* ---- devices ---- */
 devnec:{t:"Daily device review",s:"Ask every day: is each line, tube and drain still needed? Every day in place adds infection and complication risk.",
  m:"CLABSI prevention: insertion bundle, chlorhexidine, daily necessity, prompt removal. CAUTI: remove Foley as soon as strict I/O or retention no longer requires it. Document site, size, day, and plan.",src:"CDC/SHEA prevention guidance"},
 "dev-ETT":{t:"Endotracheal tube",s:"Document size and depth at the teeth/lip (often ~21 cm women, ~23 cm men). CXR: tip ~3–5 cm above the carina with head neutral. Cuff pressure ~20–30 cmH₂O.",m:"Head flexion moves the tip down, extension up. VAP prevention: head of bed 30–45°, oral care, daily SAT/SBT.",src:"Common practice"},
 "dev-Trach":{t:"Tracheostomy",s:"Document size, type (cuffed/cuffless, fenestrated) and date. Fresh trachs (<7 days) are hard to replace if dislodged — keep an obturator and spare at bedside.",src:"Common practice"},
 "dev-CVC":{t:"Central venous catheter",s:"Tip at the lower SVC / cavoatrial junction for IJ/subclavian — confirm before use. Review need daily; CLABSI risk rises with each day.",m:"Femoral sites have historically higher infection and thrombosis risk. Watch for pneumothorax after subclavian/IJ, and for arterial placement (confirm venous).",src:"CDC/SHEA; common practice"},
 "dev-PICC":{t:"PICC",s:"Same infection logic as a CVC; also raises upper-extremity DVT risk. Avoid in patients who may need dialysis access (preserve veins).",src:"Common practice"},
 "dev-Art line":{t:"Arterial line",s:"Beat-to-beat BP and easy ABGs. Check the waveform: over-damped (blunted, falsely low SBP) or under-damped (overshoot, falsely high SBP); MAP is the most reliable number.",m:"Complications: ischemia, infection, bleeding, thrombosis. Remove once frequent gases and titration are no longer needed.",src:"Common practice"},
 "dev-Foley":{t:"Foley catheter",s:"Leading cause of CAUTI. Keep only for a clear indication (retention, strict I/O in critical illness, perineal wounds, comfort at end of life); remove as soon as possible.",src:"CDC CAUTI guideline"},
 "dev-Chest tube":{t:"Chest tube",s:"<b>Tidaling</b> (fluid moving with breaths) = patent tube in the pleural space. <b>Continuous bubbling</b> in the water-seal chamber = air leak (patient or circuit). Note suction (e.g., −20) vs water seal and output.",
  m:"No tidaling: kinked, clotted, or lung fully re-expanded. A new large air leak or subcutaneous emphysema needs evaluation. Removal usually once air leak resolved and output low (thresholds vary).",src:"Common practice"},
 "dev-Feeding tube (post-pyloric)":{t:"Feeding tubes",s:"Confirm position radiographically before first use of any blindly placed tube. Keep head of bed 30–45°.",m:"Post-pyloric feeding may help with aspiration risk or gastric intolerance. Gastric residual volumes are no longer routinely checked in many ICUs.",src:"ASPEN/SCCM nutrition guideline"},
 /* ---- renal & fluids ---- */
 uop:{t:"Urine output",s:"Oliguria ≈ <0.5 mL/kg/h. mL/kg/h = volume ÷ weight ÷ hours. Use the right interval — a 6-hour total divided by 24 h hides oliguria.",
  m:"Per KDIGO: <0.5 mL/kg/h for 6–12 h = stage 1; ≥12 h = stage 2; <0.3 for ≥24 h or anuria ≥12 h = stage 3. Check for a blocked Foley before treating 'oliguria'.",src:"KDIGO AKI 2012"},
 kdigo:{t:"AKI — KDIGO staging",s:"<b>AKI:</b> Cr ↑ ≥0.3 mg/dL in 48 h, or ≥1.5× baseline in 7 days, or UOP <0.5 mL/kg/h for 6 h. <b>Stage 1:</b> 1.5–1.9× · <b>2:</b> 2.0–2.9× · <b>3:</b> ≥3×, Cr ≥4.0, or RRT started (use the worse of Cr or UOP).",
  m:"Baseline Cr matters — use a documented pre-admission value when possible. Creatinine lags injury by 24–48 h and depends on muscle mass.",src:"KDIGO AKI 2012"},
 fluidbal:{t:"Net & cumulative fluid balance",s:"Net = total in − total out over a stated interval. Cumulative positive balance after the initial resuscitation is associated with worse outcomes in many ICU cohorts.",
  m:"Insensible losses (~500–1000 mL/day, more with fever) aren't charted. Daily weights help when I/O charting is incomplete. Conservative fluids after shock resolves improved ventilator-free days in ARDS (FACTT).",src:"FACTT 2006; observational cohorts"},
 rrt:{t:"Urgent RRT indications",s:"Think <b>AEIOU</b> when refractory to medical therapy: <b>A</b>cidosis, <b>E</b>lectrolytes (hyperkalemia), <b>I</b>ngestions (dialyzable toxins), <b>O</b>verload (volume), <b>U</b>remia (pericarditis, encephalopathy, bleeding).",
  m:"Clinical context matters more than a single lab threshold. Starting RRT early without an urgent indication didn't improve survival (AKIKI, STARRT-AKI). CRRT is usually chosen for hemodynamically unstable patients.",src:"KDIGO 2012; STARRT-AKI (NEJM 2020)"},
 lytes:{t:"Common ICU electrolyte issues",s:"<b>K⁺ high:</b> ECG first; stabilize (calcium), shift (insulin/glucose, β-agonist), remove. <b>K⁺/Mg²⁺ low:</b> replete (Mg first if both). <b>Phos low:</b> think refeeding. <b>Na⁺:</b> correct chronic hyponatremia slowly (limit ~8–10 mEq/L/24 h).",
  m:"Hypernatremia usually means free-water deficit — replace gradually. Ionized calcium is the reliable value in critical illness and with citrate CRRT.",src:"Standard teaching"},
};
// old help() keys → new reference keys
const REF_ALIAS={satsbt:"sbt"};

/* ---------- ⓘ button + popover (one open at a time; click/tap/keyboard; hover on desktop) ---------- */
const tip=k=>{k=REF_ALIAS[k]||k;const r=REF[k];return r?`<button type="button" class="tipb" data-tip="${esc(k)}" aria-label="About ${esc(r.t)}" aria-expanded="false" aria-controls="tipPop">ⓘ</button>`:""};
let tipOpenBtn=null,tipHoverT=null,tipPinned=false;
function tipEl(){let el=$("tipPop");if(!el){el=document.createElement("div");el.id="tipPop";el.setAttribute("role","dialog");el.setAttribute("aria-modal","false");el.tabIndex=-1;el.className="hidden noprint";document.body.appendChild(el)}return el}
function tipPlace(){
  const el=$("tipPop");if(!el||!tipOpenBtn)return;const r=tipOpenBtn.getBoundingClientRect(),vw=innerWidth,vh=innerHeight,m=8;
  if(!tipOpenBtn.isConnected||r.bottom<0||r.top>vh){tipClose(false);return}
  el.style.maxHeight="";const w=Math.min(360,vw-2*m);el.style.width=w+"px";
  let left=Math.min(Math.max(m,r.left+r.width/2-w/2),vw-w-m);el.style.left=left+"px";
  const h=el.offsetHeight,below=vh-r.bottom-m,above=r.top-m;
  if(h<=below||below>=above){el.style.top=(r.bottom+6)+"px";el.style.maxHeight=Math.max(120,below-6)+"px"}
  else{const mh=Math.max(120,above-6);el.style.maxHeight=mh+"px";el.style.top=Math.max(m,r.top-6-Math.min(h,mh))+"px"}
}
function tipOpen(btn,pin){
  const k=btn.dataset.tip,r=REF[k];if(!r)return;
  if(tipOpenBtn&&tipOpenBtn!==btn)tipClose(false);
  const el=tipEl();tipOpenBtn=btn;tipPinned=!!pin;btn.setAttribute("aria-expanded","true");
  el.setAttribute("aria-label",r.t);
  el.innerHTML=`<div class="tiph"><b>${r.t}</b><button type="button" class="tipx" aria-label="Close">×</button></div><div class="tips">${r.s}</div>
    ${r.m?`<details class="tipm"><summary>More detail</summary><div>${r.m}</div></details>`:""}
    <div class="tipsrc">${esc(r.src||"")}${r.src?" · ":""}Reference only — not an order.</div>`;
  el.classList.remove("hidden");tipPlace();
  if(pin)el.focus({preventScroll:true});
}
function tipClose(refocus){
  const el=$("tipPop");if(el)el.classList.add("hidden");
  if(tipOpenBtn){tipOpenBtn.setAttribute("aria-expanded","false");if(refocus)tipOpenBtn.focus({preventScroll:true})}
  tipOpenBtn=null;tipPinned=false;
}
// capture phase: handle the ⓘ before row/summary/label click handlers, and never let it toggle or submit anything
document.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest(".tipb");
  if(b){e.preventDefault();e.stopPropagation();if(tipOpenBtn===b&&tipPinned)tipClose(false);else tipOpen(b,true);return}
  const el=$("tipPop");if(!el||el.classList.contains("hidden"))return;
  if(e.target.closest(".tipx")){e.preventDefault();e.stopPropagation();tipClose(true);return}
  if(!el.contains(e.target))tipClose(false);
},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&tipOpenBtn){e.preventDefault();tipClose(true)}});
addEventListener("resize",tipPlace);addEventListener("scroll",tipPlace,{passive:true,capture:true});
if(matchMedia("(hover:hover) and (pointer:fine)").matches){
  document.addEventListener("mouseover",e=>{const b=e.target.closest&&e.target.closest(".tipb");if(!b||tipPinned)return;clearTimeout(tipHoverT);tipHoverT=setTimeout(()=>{if(!tipPinned)tipOpen(b,false)},250)});
  document.addEventListener("mouseout",e=>{const b=e.target.closest&&e.target.closest(".tipb,#tipPop");if(!b||tipPinned)return;clearTimeout(tipHoverT);
    const to=e.relatedTarget;if(to&&to.closest&&(to.closest("#tipPop")||to.closest(".tipb")===tipOpenBtn))return;tipHoverT=setTimeout(()=>{if(!tipPinned)tipClose(false)},200)});
}
