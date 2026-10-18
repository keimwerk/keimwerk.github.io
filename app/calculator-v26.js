/* Keimwerk v2.5: ausschließlich phasenspezifische Ca:Mg-Anzeige und Bewertung.
   Keine Veränderung des Rechenkerns, der Referenzdaten oder der Nährstoff-Rundungen. */
(()=>{
  'use strict';
  const api=window.KeimwerkV21Bridge;
  const summary=document.getElementById('summary');
  if(!api||!summary)return;

  const targets={
    veg_early:{name:'Frühe vegetative Phase',tenths:35,ca:[70,120],mg:[25,45]},
    veg_late:{name:'Späte vegetative Phase',tenths:29,ca:[90,150],mg:[35,55]},
    flower_early:{name:'Frühe Blütephase',tenths:31,ca:[90,160],mg:[35,60]},
    flower_late:{name:'Späte Blütephase',tenths:14,ca:[91,119],mg:[65,85]}
  };
  const fmt=(x,d=2)=>Number(x).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
  const inRange=(value,range)=>value>=range[0]&&value<=range[1];

  // Einheiten: 10^-6 mg/L. Nur numerische Repräsentation wird normalisiert,
  // NICHT das erlaubte Verhältnis: keine +/- Toleranz und kein grüner Näherungsstatus.
  function assess(stage,ca,mg,missingCa=false,missingMg=false){
    const t=targets[stage]||targets.veg_early;
    if(!Number.isFinite(ca)||!Number.isFinite(mg)||ca<0||mg<0)return {status:'invalid',stage:t,ca,mg};
    if(mg===0)return {status:'undefined',stage:t,ca,mg};
    const caUnits=BigInt(Math.round(ca*1e6));
    const mgUnits=BigInt(Math.round(mg*1e6));
    if(!mgUnits)return {status:'undefined',stage:t,ca,mg};
    const lhs=caUnits*10n, rhs=mgUnits*BigInt(t.tenths);
    const difference=lhs===rhs?0:lhs<rhs?-1:1;
    return {
      status:difference===0?'exact':difference<0?'low':'high',
      difference,stage:t,ca,mg,ratio:ca/mg,target:t.tenths/10,
      caInRange:inRange(ca,t.ca),mgInRange:inRange(mg,t.mg),
      proposedCa:mg*t.tenths/10,proposedMg:ca*10/t.tenths,
      missingCa,missingMg
    };
  }
  window.KeimwerkCaMgAssessment={assess,targets};
  const panel=document.createElement('section');
  panel.className='kw25-camg-panel';
  panel.id='kw25-camg-panel';
  panel.setAttribute('aria-label','Calcium-Magnesium-Verhältnis');
  panel.innerHTML=`
    <div class="kw25-camg-title"><div><h3>Calcium : Magnesium</h3><p class="note">Exakte Verhältnis-Ampel für die ausgewählte Cannabis-Phase</p></div>
      <span id="kw25-camg-state" class="status kw25-camg-state" role="status" aria-live="polite"></span></div>
    <div class="kw25-camg-grid">
      <div class="kw25-camg-metric"><span>Aktuelles Ca:Mg</span><strong id="kw25-camg-actual">–</strong></div>
      <div class="kw25-camg-metric"><span>Exaktes Ziel</span><strong id="kw25-camg-target">–</strong></div>
      <div class="kw25-camg-metric"><span>Einzelziele</span><div id="kw25-camg-individual">–</div></div>
    </div>
    <div id="kw25-camg-advice" class="kw25-camg-advice note"></div>
    <p class="kw25-camg-disclaimer note">Persönlich festgelegte Orientierungswerte, keine wissenschaftlich gesicherten Optima. Das Verhältnis allein beweist weder Mangel noch Überschuss; Wasserwerte, Produktdeklarationen und absolute Ca-/Mg-Werte mitprüfen. Kein Toleranzbereich.</p>`;
  // Fester Bestandteil der Nährstoffausgabe, vor dem einklappbaren Diagramm.
  summary.after(panel);
  const actual=document.getElementById('kw25-camg-actual');
  const goal=document.getElementById('kw25-camg-target');
  const singles=document.getElementById('kw25-camg-individual');
  const badge=document.getElementById('kw25-camg-state');
  const advice=document.getElementById('kw25-camg-advice');
  function proposedMessage(result){
    const t=result.stage;
    const proposals=[];
    if(result.status==='high'){
      if(result.caInRange&&result.proposedMg>result.mg&&inRange(result.proposedMg,t.mg))proposals.push(`Magnesium rechnerisch auf ${fmt(result.proposedMg,3)} mg/L erhöhen (bei unverändertem Calcium).`);
      if(result.mgInRange&&result.proposedCa<result.ca&&inRange(result.proposedCa,t.ca))proposals.push(`Alternativ Calcium rechnerisch auf ${fmt(result.proposedCa,3)} mg/L senken (bei unverändertem Magnesium).`);
    }else if(result.status==='low'){
      if(result.mgInRange&&result.proposedCa>result.ca&&inRange(result.proposedCa,t.ca))proposals.push(`Calcium rechnerisch auf ${fmt(result.proposedCa,3)} mg/L erhöhen (bei unverändertem Magnesium).`);
      if(result.caInRange&&result.proposedMg<result.mg&&inRange(result.proposedMg,t.mg))proposals.push(`Alternativ Magnesium rechnerisch auf ${fmt(result.proposedMg,3)} mg/L senken (bei unverändertem Calcium).`);
    }
    if(proposals.length)return proposals.join(' ');
    return 'Mit einer einseitigen Anpassung lässt sich das exakte Verhältnis innerhalb der gewählten Einzelbereiche nicht erreichen. Beide Nährstoffe und die gesamten Dünger-/Wasserwerte gemeinsam prüfen; keine pauschale Erhöhung empfohlen.';
  }
  function draw(){
    const r=api.getResults();
    if(!r||!r.sum)return;
    const ca=Number(r.sum.Ca),mg=Number(r.sum.Mg);
    const incomplete=k=>r.details.some(d=>d.dose>0&&Array.isArray(d.fert.knownNutrients)&&!d.fert.knownNutrients.includes(k));
    const result=assess(r.stage,ca,mg,incomplete('Ca'),incomplete('Mg'));
    const t=result.stage;
    goal.textContent=fmt(t.tenths/10,1)+':1';
    actual.textContent=result.ratio===undefined?'–':fmt(result.ratio,4)+':1';
    singles.textContent=`Ca ${t.ca[0]}–${t.ca[1]} · Mg ${t.mg[0]}–${t.mg[1]} mg/L`;
    const incompleteData=result.missingCa||result.missingMg;
    const statusMap={exact:['ok','Exakt erreicht'],low:['low','Zu niedrig'],high:['high','Zu hoch'],undefined:['near','Nicht berechenbar'],invalid:['near','Keine Bewertung']};
    let [klass,label]=statusMap[result.status];
    if(incompleteData){klass='near';label='Nur bekannte Beiträge';}
    badge.className='status kw25-camg-state '+klass;
    badge.textContent=label;
    let messages=[];
    if(result.status==='undefined')messages.push('Ohne Magnesiumwert (> 0 mg/L) kann kein Ca:Mg-Verhältnis berechnet werden.');
    else if(result.status==='invalid')messages.push('Ungültige Calcium- oder Magnesiumwerte.');
    else if(result.status==='exact')messages.push('Dein Verhältnis ist mathematisch exakt erreicht; die absoluten Nährstoffmengen weiterhin prüfen.');
    else if(result.status==='high')messages.push('Im Verhältnis ist Calcium zu hoch bzw. Magnesium zu niedrig.');
    else messages.push('Im Verhältnis ist Calcium zu niedrig bzw. Magnesium zu hoch.');
    if(result.status!=='undefined'&&result.status!=='invalid'){
      if(!result.caInRange)messages.push(`Calcium (${fmt(ca,3)} mg/L) liegt außerhalb von ${t.ca[0]}–${t.ca[1]} mg/L.`);
      if(!result.mgInRange)messages.push(`Magnesium (${fmt(mg,3)} mg/L) liegt außerhalb von ${t.mg[0]}–${t.mg[1]} mg/L.`);
    }
    if(incompleteData)messages.push('Mindestens ein verwendeter Dünger deklariert Ca oder Mg nicht vollständig. Daher keine sichere Anpassungsempfehlung.');
    else if(result.status==='high'||result.status==='low')messages.push(proposedMessage(result));
    advice.textContent=messages.join(' ');
  }
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw();});}
  new MutationObserver(schedule).observe(summary,{childList:true});
  draw();
})();
