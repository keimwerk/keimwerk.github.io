/* Keimwerk: Ca:Mg ist ein zusätzlicher Vergleich, kein exakt zu erzwingender Verhältnis-Sollwert. */
(()=>{
 'use strict';
 const bridge=window.KeimwerkV21Bridge;
 const model=window.KeimwerkWeeklyOrientation;
 const summary=document.getElementById('summary');
 if(!bridge||!model||!summary)return;
 const fmt=x=>Number(x).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2});
 function assess(week,ca,mg){
   const goals=model.currentTargets();
   return {week,ca,mg,caGoal:goals.Ca,mgGoal:goals.Mg,
      actualRatio:mg>0?ca/mg:null,referenceRatio:goals.Mg>0?goals.Ca/goals.Mg:null};
 }
 window.KeimwerkCaMgAssessment={assess};
 const panel=document.createElement('section');
 panel.className='kw25-camg-panel';
 panel.id='kw25-camg-panel';
 panel.setAttribute('aria-label','Calcium-Magnesium-Vergleich zur gewählten Woche');
 panel.innerHTML=`
   <div class="kw25-camg-title"><div><h3>Calcium : Magnesium</h3>
      <p class="note">Zusätzlicher Vergleich mit dem gewählten Modell, kein exaktes Idealverhältnis</p></div>
      <span id="kw25-camg-state" class="status kw25-camg-state near" role="status">Orientierung</span></div>
   <div class="kw25-camg-grid">
      <div class="kw25-camg-metric"><span>Ist-Verhältnis</span><strong id="kw25-camg-actual">–</strong></div>
      <div class="kw25-camg-metric"><span>Verhältnis des Modells</span><strong id="kw25-camg-target">–</strong></div>
      <div class="kw25-camg-metric"><span>Wochenwerte</span><div id="kw25-camg-individual">–</div></div>
   </div>
   <div id="kw25-camg-advice" class="kw25-camg-advice note"></div>
   <p class="kw25-camg-disclaimer note">Die Wochenkurve und die daraus abgeleiteten Von-bis-Phasenbereiche liefern kein wissenschaftlich belegtes ideales Ca:Mg-Verhältnis. Eine isolierte Verhältnis-Korrektur kann die absolute Versorgung verschlechtern. Nährstoffangaben und Wasseranalyse gemeinsam prüfen.</p>`;
 summary.after(panel);
 function draw(){
   const r=bridge.getResults();if(!r?.sum)return;
   const week=model.weekNumber();
   const a=assess(week,Number(r.sum.Ca),Number(r.sum.Mg));
   const missing=k=>r.details.some(d=>d.dose>0&&Array.isArray(d.fert.knownNutrients)&&!d.fert.knownNutrients.includes(k));
   document.getElementById('kw25-camg-state').textContent='Woche '+week;
   document.getElementById('kw25-camg-actual').textContent=a.actualRatio===null?'Nicht berechenbar':fmt(a.actualRatio)+':1';
   document.getElementById('kw25-camg-target').textContent=a.referenceRatio===null?'–':fmt(a.referenceRatio)+':1';
   document.getElementById('kw25-camg-individual').textContent='Woche '+week+': Ca '+fmt(a.caGoal)+' · Mg '+fmt(a.mgGoal)+' mg/L';
   const difference='Berechnet: Ca '+fmt(a.ca)+' ('+(a.ca-a.caGoal>=0?'+':'')+fmt(a.ca-a.caGoal)+') und Mg '+fmt(a.mg)+' ('+(a.mg-a.mgGoal>=0?'+':'')+fmt(a.mg-a.mgGoal)+') mg/L gegenüber dem Modell.';
   document.getElementById('kw25-camg-advice').textContent=difference+(missing('Ca')||missing('Mg')?' Achtung: Eine verwendete Dünger-Deklaration für Ca oder Mg ist unvollständig.':'');
 }
 let scheduled=false;function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw();});}
 new MutationObserver(queue).observe(summary,{childList:true});
 draw();
})();
