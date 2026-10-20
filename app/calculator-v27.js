/* Keimwerk – optionaler Vergleich & mathematische Dosiervorschläge für 16-Wochen-Modell.
   Die ursprünglichen Dünge-, Wasser-, Dichte- und Si-Formeln bleiben unverändert.
   Keine automatische Dosierungsänderung ohne ausdrücklichen Klick und Bestätigung. */
(()=>{
 'use strict';
 const api=window.KeimwerkV21Bridge,model=window.KeimwerkWeeklyOrientation;
 const summary=document.getElementById('summary');
 const panel=document.getElementById('kw27-target-panel');
 if(!api||!model||!summary||!panel)return;
 const $=id=>document.getElementById(id);
 const fmt=(x,d=1)=>Number(x).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
 const names={N:'Stickstoff (N)',P:'Phosphor (P)',K:'Kalium (K)',Ca:'Calcium (Ca)',Mg:'Magnesium (Mg)',S:'Schwefel (S)'};
 const esc=api.escapeHtml;
 let proposal=null;
 let renderQueued=false;
 const notKnown=(results,k)=>results.details.some(d=>d.dose>0&&Array.isArray(d.fert.knownNutrients)&&!d.fert.knownNutrients.includes(k));
 function showPhaseTargets(){
   const tbody=$('kw28-phase-table')?.querySelector('tbody');if(!tbody)return;
   const active=model.group(model.weekNumber());
   tbody.innerHTML=model.phaseKeys.map(phase=>{
     const range=model.phaseRanges[phase],selected=phase===active;
     const number=x=>fmt(x,2).replace(/,00$/,'').replace(/(,\d)0$/,'$1');
     return `<tr ${selected?'class="kw28-current-phase" aria-current="true"':''}><th scope="row">${model.phaseNames[phase]}${selected?' · aktiv':''}</th>${model.keys.map(k=>`<td>${range[k].min===range[k].max?number(range[k].min):number(range[k].min)+'–'+number(range[k].max)}</td>`).join('')}</tr>`;
   }).join('');
 }
 function showComparison(){
   const r=api.getResults();if(!r?.sum)return;
   const week=model.weekNumber(),t=model.currentTargets(),phaseRanges=model.phaseRanges[model.group(week)];
   $('kw27-target-title').textContent='Zielvergleich · '+(week<=8?'Vegetation '+week:'Blüte '+(week-8))+' (Gesamtwoche '+week+')';
   showPhaseTargets();
   const rows=model.keys.map(k=>{
     const value=Number(r.sum[k])||0;
     const diff=value-t[k],missing=notKnown(r,k);
     const diffText=(diff>=0?'+':'')+fmt(diff);
     const {min,max}=phaseRanges[k],span=min===max?fmt(min):fmt(min)+'–'+fmt(max);
     return `<tr><th scope="row">${names[k]}${missing?' *':''}</th><td>${span} mg/L</td><td>${fmt(t[k])} mg/L</td><td>${fmt(value)} mg/L</td><td class="${diff<0?'kw27-minus':'kw27-plus'}">${diffText} mg/L</td></tr>`;
   });
   $('kw27-target-table').querySelector('tbody').innerHTML=rows.join('');
   $('kw27-quality-note').textContent=(model.keys.some(k=>notKnown(r,k))?'* Mindestens ein eingesetzter Dünger deklariert einzelne Nährstoffe unvollständig; der berechnete Istwert kann zu niedrig sein. ':'')+'Differenz = berechnete Konzentration minus Wert der ausgewählten Woche. Phasenbereiche zeigen nur Min/Max dieser vier Wochen; keine sichere Mangel- oder Überschussdiagnose.';
   proposal=null;
   $('kw27-suggest-result').replaceChildren();
 }
 function coefficient(f,k){
   if(f.referencePerUnit && typeof f.referencePerUnit[k]==='number')return Number(f.referencePerUnit[k]);
   if(f.perUnitNutrients && typeof f.perUnitNutrients[k]==='number')return Number(f.perUnitNutrients[k]);
   const density=f.state==='solid'?1:Math.max(1,Number(f.density)||1),v=f.values||{};
   const per={N:(Number(v.N)||0)*10*density,
      P:(Number(v.P2O5)||0)*4.36*density,
      K:(Number(v.K2O)||0)*8.302*density,
      Ca:(Number(v.CaO)||0)*7.147*density,
      Mg:(Number(v.MgO)||0)*6.03*density,
      S:(Number(v.S)||0)*10*density};
   // Formeln dienen hier nur einer Annäherung; maßgeblich bleiben die originalen Rechenfunktionen.
   return per[k]||0;
 }
 // Nonnegative, begrenzte gewichtete kleinste Quadrate mit kleiner Regularisierung
 // gegen extreme Änderungen; optionaler mathematischer Vorschlag, KEINE Sicherheitsprüfung.
 function solve(details,water,targets){
   const current=details.map(d=>Number(d.dose)||0);
   const caps=current.map(v=>Math.max(10,v*1.5));
   const scales=model.keys.map(k=>Math.max(20,targets[k]));
   const matrix=model.keys.map((k,j)=>details.map(d=>coefficient(d.fert,k)/scales[j]));
   const baseline=model.keys.map((k,j)=>((Number(water[k])||0)-targets[k])/scales[j]);
   const lambda=.006;
   const norm=current.map(v=>Math.max(2,v));
   const score=x=>{
     let result=0;
     for(let k=0;k<baseline.length;k++){
       let err=baseline[k];for(let i=0;i<x.length;i++)err+=matrix[k][i]*x[i];
       result+=err*err;
     }
     for(let i=0;i<x.length;i++)result+=lambda*((x[i]-current[i])/norm[i])**2;
     return result;
   };
   const x=[...current],initial=score(current);
   for(let iteration=0;iteration<600;iteration++){
     let greatestChange=0;
     for(let i=0;i<x.length;i++){
       let numerator=lambda*(x[i]-current[i])/(norm[i]*norm[i]);
       let denominator=lambda/(norm[i]*norm[i]);
       for(let k=0;k<baseline.length;k++){
         let error=baseline[k];for(let j=0;j<x.length;j++)error+=matrix[k][j]*x[j];
         numerator+=matrix[k][i]*error;
         denominator+=matrix[k][i]**2;
       }
       if(denominator<=1e-12)continue;
       const next=Math.max(0,Math.min(caps[i],x[i]-numerator/denominator));
       greatestChange=Math.max(greatestChange,Math.abs(next-x[i]));x[i]=next;
     }
     if(greatestChange<1e-7)break;
   }
   const proposed=x.map(v=>Math.round(v*100)/100);
   return {doses:proposed,before:initial,after:score(proposed),caps};
 }
 $('kw27-suggest').addEventListener('click',()=>{
   const result=$('kw27-suggest-result');result.replaceChildren();proposal=null;
   const r=api.getResults(),state=api.getSchema();
   const details=r.details;
   if(!details.length||details.every(d=>model.keys.every(k=>coefficient(d.fert,k)===0))){
     result.textContent='Keine geeigneten Dünger zur rechnerischen Annäherung ausgewählt.';return;
   }
   if(details.length>30){result.textContent='Zu viele gleichzeitig ausgewählte Dünger für einen verlässlichen Vergleich (maximal 30).';return;}
   const target=model.currentTargets();
   const fit=solve(details,r.water.nutrients,target);
   if(!(fit.after<fit.before-1e-5)){
      result.textContent='Mit dieser Düngerzusammenstellung ist rechnerisch keine relevante Verbesserung der Abweichung möglich.';return;
   }
   const limitations=details.some(d=>model.keys.some(k=>Array.isArray(d.fert.knownNutrients)&&!d.fert.knownNutrients.includes(k)));
   const note=document.createElement('p');note.className='note';
   note.textContent='Mathematischer Vorschlag auf Basis der gewählten Woche '+model.weekNumber()+'; ohne Prüfung von EC, pH, Verträglichkeit, Konzentrationsgrenzen und Pflanzenzustand. '+(limitations?'Achtung: Produktdeklarationen sind teilweise unvollständig. ':'')+'Es ist oft unmöglich, alle sechs Modellwerte gleichzeitig zu treffen.';
   result.append(note);
   const tbl=document.createElement('table');tbl.className='small-table';
   tbl.innerHTML='<thead><tr><th>Dünger</th><th>Aktuell</th><th>Vorschlag</th></tr></thead>';
   const body=document.createElement('tbody');
   details.forEach((d,i)=>{
     const tr=document.createElement('tr'),unit=d.fert.state==='solid'?'g/L':'ml/L';
     const vals=[String(d.fert.name||'Dünger'),fmt(d.dose,2)+' '+unit,fmt(fit.doses[i],2)+' '+unit];
     vals.forEach((val,j)=>{const cell=document.createElement(j===0?'th':'td');cell.textContent=val;tr.append(cell);});body.append(tr);
   });
   tbl.append(body);result.append(tbl);
   const commands=document.createElement('div');commands.className='kw27-result-actions';
   const apply=document.createElement('button');apply.className='secondary';apply.type='button';
   apply.textContent='Vorschlag nach Prüfung übernehmen';
   const discard=document.createElement('button');discard.className='secondary';discard.type='button';discard.textContent='Vorschlag verwerfen';
   discard.addEventListener('click',()=>{proposal=null;result.replaceChildren();});
   const snapshot={week:model.weekNumber(),mode:model.goalMode(),doses:state.doses.map(d=>({fertId:d.fertId,dose:d.dose})),water:JSON.stringify(state.water),dilution:state.dilution};
   proposal={snapshot,fit};
   apply.addEventListener('click',()=>{
     if(!proposal)return;
     const live=api.getSchema();
     const same=Number(live.week)===snapshot.week&&live.targetMode===snapshot.mode&&live.dilution===snapshot.dilution&&JSON.stringify(live.water)===snapshot.water&&JSON.stringify(live.doses.map(d=>({fertId:d.fertId,dose:d.dose})))===JSON.stringify(snapshot.doses);
     if(!same){result.textContent='Eingaben wurden nach dem Vorschlag geändert. Bitte den Vorschlag neu berechnen.';proposal=null;return;}
     if(!confirm('Dünger-Dosierungen mit den rein mathematischen Vorschlagswerten ersetzen? Diese Werte sind keine wissenschaftlich bestätigte Düngeempfehlung.'))return;
     try{
       api.applySchema({...live,doses:live.doses.map((d,i)=>({...d,dose:fit.doses[i]}))});
       result.textContent='Dosierungen übernommen und mit den originalen Nährstoffformeln neu berechnet. Bitte die Ergebnisse und Herstellervorgaben überprüfen.';
       proposal=null;
     }catch(error){result.textContent='Dosierungen konnten nicht übernommen werden: '+(error.message||String(error));}
   });
   commands.append(apply,discard);result.append(commands);
 });
 function queue(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;showComparison();});}
 new MutationObserver(queue).observe(summary,{childList:true});
 showComparison();
})();
