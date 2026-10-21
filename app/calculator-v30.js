/* Keimwerk V30 — ergänzender, rein mathematischer Mehrwochen-Düngeplan.
   Berechnet ausschließlich aus den bestehenden Produktkoeffizienten und
   den unveränderten 16 Keimwerk-Modellwochen. Die Kernberechnung bleibt unberührt.
   Keine Änderungen an Dosierungen ohne ausdrückliche Bestätigung. */
(()=>{
  'use strict';
  const api=window.KeimwerkV21Bridge,model=window.KeimwerkWeeklyOrientation;
  const host=document.getElementById('kw30-plan');
  if(!api||!model||!host)return;
  const $=id=>document.getElementById(id);
  const keys=['N','P','K','Ca','Mg','S'];
  const maxRows=12;
  const fnum=(n,d=2)=>Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
  const safe=(n)=>Number.isFinite(Number(n))?Number(n):0;
  const esc=api.escapeHtml;
  let generated=null;
  const first=$('kw30-from'),last=$('kw30-to'),liters=$('kw30-liters');
  function synchronizeDefaults(){
    const w=model.weekNumber();
    first.value=String(w);last.value='16';liters.value=String(api.getLiters());
  }
  synchronizeDefaults();
  // Vorrangig dieselben Koeffizienten wie in der existierenden Rechnerdatenbank
  // verwenden; Fallback ausschließlich für nutzereigene Dünger ohne Koeffizienten.
  function unitValue(f,k){
    const ref=f.referencePerUnit||f.perUnitNutrients;
    if(ref)return Number(ref[k])||0;
    const density=f.state==='solid'?1:Math.max(1,safe(f.density)||1);
    const raw=f.values||{};
    const ox={N:10,P:4.36,K:8.302,Ca:7.15,Mg:6.03,S:10};
    const fields={N:'N',P:'P2O5',K:'K2O',Ca:'CaO',Mg:'MgO',S:'S'};
    return Math.round((safe(raw[fields[k]])*ox[k]*density+Number.EPSILON)*100)/100;
  }
  // Leichte, nichtnegative quadratische Optimierung mit festen technischen Obergrenzen.
  // Grenzen sind RECHENlimits, keine medizinisch / agronomisch begründete Dosierung.
  function fitWeek(products,water,target,prior){
    const caps=products.map(p=>p.fert.state==='solid'?3:6);
    const scale=keys.map(k=>Math.max(20,safe(target[k])));
    const a=keys.map((k,j)=>products.map(p=>unitValue(p.fert,k)/scale[j]));
    const b=keys.map((k,j)=>(safe(water[k])-safe(target[k]))/scale[j]);
    const x=products.map((p,i)=>prior?Math.min(caps[i],Math.max(0,prior[i])):Math.min(caps[i],Math.max(0,safe(p.dose))));
    // Kleine Strafe gegen unnötig hohe Dosen und abrupte Sprünge von Woche zu Woche.
    const dosagePenalty=.004,continuityPenalty=prior?.length===products.length?.003:0;
    const score=y=>{
      let e=0;
      for(let j=0;j<keys.length;j++){
        let v=b[j];for(let i=0;i<products.length;i++)v+=a[j][i]*y[i];
        e+=v*v;
      }
      for(let i=0;i<products.length;i++){
        e+=dosagePenalty*(y[i]/caps[i])**2;
        if(continuityPenalty)e+=continuityPenalty*((y[i]-prior[i])/caps[i])**2;
      }
      return e;
    };
    for(let iteration=0;iteration<750;iteration++){
      let change=0;
      for(let i=0;i<products.length;i++){
        let grad=dosagePenalty*x[i]/(caps[i]*caps[i]);
        let hess=dosagePenalty/(caps[i]*caps[i]);
        if(continuityPenalty){grad+=continuityPenalty*(x[i]-prior[i])/(caps[i]*caps[i]);hess+=continuityPenalty/(caps[i]*caps[i]);}
        for(let j=0;j<keys.length;j++){
          let err=b[j];for(let q=0;q<products.length;q++)err+=a[j][q]*x[q];
          grad+=a[j][i]*err;hess+=a[j][i]**2;
        }
        if(hess<=1e-12)continue;
        const n=Math.max(0,Math.min(caps[i],x[i]-grad/hess));
        change=Math.max(change,Math.abs(n-x[i]));x[i]=n;
      }
      if(change<1e-7)break;
    }
    // Reproduzierbare, praxisnah ablesbare 0,01 g/ml je Liter.
    const rounded=x.map(v=>Math.round(v*100)/100);
    const actual=Object.fromEntries(keys.map(k=>[k,safe(water[k])+products.reduce((sum,p,i)=>sum+unitValue(p.fert,k)*rounded[i],0)]));
    const err=keys.map(k=>Math.abs(actual[k]-safe(target[k]))/Math.max(20,safe(target[k])));
    return {doses:rounded,actual,error:err.reduce((s,v)=>s+v,0)/err.length,score:score(rounded),caps};
  }
  function signature(schema){
    return JSON.stringify({
      water:schema.water,dilution:schema.dilution,
      doses:(schema.doses||[]).map(d=>[d.fertId,safe(d.dose)]),
      products:(schema.fertilizers||[]).filter(f=>(schema.doses||[]).some(d=>d.fertId===f.id)).map(f=>[f.id,f.referencePerUnit||f.perUnitNutrients||f.values])
    });
  }
  function invalidate(text){
    generated=null;
    $('kw30-export').disabled=true;
    $('kw30-status').textContent=text||'Der Plan ist noch nicht berechnet.';
    $('kw30-results').replaceChildren();
  }
  function render(){
    const root=$('kw30-results');root.replaceChildren();
    if(!generated)return;
    const {weeks,products,amount,water,limitations}=generated;
    const expl=document.createElement('p');expl.className='kw30-explanation';
    expl.textContent=`${weeks.length} Woche(n) berechnet · ${products.length} Dünger · ${fnum(amount,1)} L Gießmenge. Jede Zeile ist ein mathematischer Vorschlag, keine geprüfte Anwendungsdosierung.`;
    root.append(expl);
    if(limitations.length){const warn=document.createElement('p');warn.className='kw30-warning';warn.textContent=limitations.join(' ');root.append(warn);}
    for(const row of weeks){
      const card=document.createElement('section');card.className='kw30-week-card';
      const header=document.createElement('div');header.className='kw30-week-heading';
      const h=document.createElement('h5');h.textContent=`Woche ${row.week} · ${row.week<=8?'Vegetation '+row.week:'Blüte '+(row.week-8)}`;
      const caption=document.createElement('span');caption.textContent=`Mittlere relative Zielabweichung: ${fnum(row.fit.error*100,0)} %`;
      header.append(h,caption);card.append(header);
      const wrap=document.createElement('div');wrap.className='table-scroll';
      const table=document.createElement('table');table.className='kw30-table';
      const thead=document.createElement('thead');thead.innerHTML='<tr><th scope="col">Produkt</th><th scope="col">pro Liter</th><th scope="col">Gesamtmenge</th></tr>';table.append(thead);
      const body=document.createElement('tbody');
      products.forEach((p,i)=>{
        const unit=p.fert.state==='solid'?'g':'ml',dose=row.fit.doses[i],total=dose*amount;
        const tr=document.createElement('tr');
        [p.fert.name,`${fnum(dose)} ${unit}/L`,`${fnum(total)} ${unit}`].forEach((value,index)=>{
          const td=document.createElement(index===0?'th':'td');if(index===0)td.scope='row';td.textContent=value;tr.append(td);
        });body.append(tr);
      });table.append(body);wrap.append(table);card.append(wrap);
      const hint=document.createElement('p');hint.className='kw30-swipe';hint.textContent='↔ Tabelle seitlich wischen, um Dosierung und Gesamtmenge zu sehen.';card.append(hint);
      const details=document.createElement('details');details.className='kw30-detail';
      const summary=document.createElement('summary');summary.textContent='Nährstoffvergleich für diese Woche';details.append(summary);
      const nutrient=document.createElement('div');nutrient.className='table-scroll';
      const comp=document.createElement('table');comp.className='kw30-table';
      comp.innerHTML='<thead><tr><th>Nährstoff</th><th>Wasser + Dünger</th><th>Modellwert</th><th>Abweichung</th></tr></thead>';
      const cb=document.createElement('tbody');
      keys.forEach(k=>{
        const value=row.fit.actual[k],delta=value-row.target[k],tr=document.createElement('tr');
        [k,`${fnum(value,1)} mg/L`,`${fnum(row.target[k],1)} mg/L`,`${delta>=0?'+':''}${fnum(delta,1)} mg/L`].forEach((t,i)=>{
          const c=document.createElement(i===0?'th':'td');c.textContent=t;tr.append(c);
        });cb.append(tr);
      });comp.append(cb);nutrient.append(comp);details.append(nutrient);card.append(details);
      const apply=document.createElement('button');apply.type='button';apply.className='secondary kw30-apply';
      apply.textContent=`Woche ${row.week} nach Prüfung in Rechner übernehmen`;
      apply.addEventListener('click',()=>{
        const live=api.getSchema();
        if(!generated||signature(live)!==generated.signature){invalidate('Wasserwerte, Produktwahl oder Dosierungen wurden verändert. Bitte den Plan neu berechnen.');return;}
        const original=live.doses||[];
        if(original.length!==row.fit.doses.length){invalidate('Die Produktauswahl wurde verändert. Bitte den Plan neu berechnen.');return;}
        if(!confirm(`Woche ${row.week} mit ${fnum(amount,1)} L Planmenge in den Rechner übernehmen? Dadurch werden die aktuellen Dosierungen ersetzt. Die Werte sind nur mathematische Modellvorschläge und nicht auf EC, pH oder Herstellerdosierungen geprüft.`))return;
        try{
          api.applySchema({...live,week:row.week,batchLiters:amount,doses:original.map((d,i)=>({...d,dose:row.fit.doses[i]}))});
          invalidate(`Woche ${row.week} wurde übernommen und mit den originalen Keimwerk-Formeln neu berechnet. Bitte die Werte vor der Anwendung prüfen.`);
        }catch(e){$('kw30-status').textContent='Die Übernahme ist fehlgeschlagen: '+String(e.message||e);}
      });
      card.append(apply);root.append(card);
    }
  }
  function generate(){
    invalidate('Berechnung läuft …');
    const start=Number(first.value),end=Number(last.value),amount=Number(liters.value);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>16||start>end){invalidate('Bitte einen gültigen Zeitraum zwischen Woche 1 und 16 auswählen.');return;}
    if(!Number.isFinite(amount)||amount<.1||amount>100000){invalidate('Bitte eine Gießmenge zwischen 0,1 und 100.000 Litern eingeben.');return;}
    const schema=api.getSchema(),res=api.getResults();
    if(!res||!Array.isArray(res.details)||!res.water?.nutrients){invalidate('Rechnerdaten konnten nicht gelesen werden.');return;}
    const products=res.details.map(d=>({fert:d.fert,dose:safe(d.dose)}));
    if(!products.length||!products.some(p=>keys.some(k=>unitValue(p.fert,k)>0))){invalidate('Bitte oben im Rechner zuerst passende Dünger auswählen. Auch Dünger mit aktueller Dosis 0 können eingeplant werden.');return;}
    if(products.length>maxRows){invalidate(`Bitte höchstens ${maxRows} Düngerzeilen verwenden, damit die Planung übersichtlich bleibt.`);return;}
    if(products.some(p=>keys.some(k=>unitValue(p.fert,k)<0||!Number.isFinite(unitValue(p.fert,k))))){invalidate('Ungültige Nährstoffkoeffizienten in einer Produktauswahl.');return;}
    const limitations=[];
    if(products.some(p=>keys.some(k=>Array.isArray(p.fert.knownNutrients)&&!p.fert.knownNutrients.includes(k))))limitations.push('Mindestens ein ausgewählter Dünger hat unvollständig deklarierte Nährstoffe. Die errechneten Konzentrationen können daher zu niedrig erscheinen.');
    if(products.some(p=>p.dose>(p.fert.state==='solid'?3:6)))limitations.push('Vorhandene Dosierungen liegen teilweise über den technischen Vorschlagsgrenzen (3 g/L für Pulver, 6 ml/L für Flüssigkeiten).');
    const water=res.water.nutrients,weeks=[];let previous=null;
    for(let week=start;week<=end;week++){
      const target=model.forWeek(week),fit=fitWeek(products,water,target,previous);
      weeks.push({week,target,fit});previous=fit.doses;
    }
    generated={weeks,products,amount,water,limitations,signature:signature(schema),start,end};
    $('kw30-export').disabled=false;
    $('kw30-status').textContent=`Plan für Woche ${start}–${end} erstellt. Die Eingaben im Rechner wurden nicht geändert.`;
    render();
  }
  function exportCsv(){
    if(!generated)return;
    if(signature(api.getSchema())!==generated.signature){invalidate('Die Eingaben wurden seit der Planung geändert. Bitte neu berechnen und dann exportieren.');return;}
    const {weeks,products,amount}=generated;
    const cells=['Woche','Phase','Produkt','Dosierung','Einheit je Liter','Gießmenge L','Gesamtmenge','Einheit Gesamt',...keys.map(k=>`Berechnet ${k} mg/L`),...keys.map(k=>`Modell ${k} mg/L`)];
    const lines=[cells];
    for(const w of weeks){
      products.forEach((p,i)=>{
        const unit=p.fert.state==='solid'?'g':'ml';
        lines.push([w.week,w.week<=8?'Vegetation':'Blüte',p.fert.name,w.fit.doses[i],unit+'/L',amount,Math.round(w.fit.doses[i]*amount*100)/100,unit,...keys.map(k=>Number(w.fit.actual[k].toFixed(2))),...keys.map(k=>w.target[k])]);
      });
    }
    // UTF-8-BOM für Excel, Semikolon für DE-CSV, Formelinjektion in Textspalten vermeiden.
    const quote=value=>{
      let v=String(value??'');
      if(/^[\s]*[=+@\-\t\r]/.test(v)&&!(/^-?\d+(?:\.\d+)?$/.test(v)))v="'"+v;
      return '"'+v.replace(/"/g,'""')+'"';
    };
    const deNumber=value=>typeof value==='number'?value.toLocaleString('de-DE',{useGrouping:false,maximumFractionDigits:4}):value;
    const csv='\uFEFF'+lines.map(r=>r.map(x=>quote(deNumber(x))).join(';')).join('\r\n')+'\r\n';
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`Keimwerk-Duengeplan-W${generated.start}-W${generated.end}.csv`;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('kw30-generate').addEventListener('click',generate);
  $('kw30-export').addEventListener('click',exportCsv);
  $('kw30-copy-liters').addEventListener('click',()=>{liters.value=String(api.getLiters());invalidate('Gießmenge übernommen. Jetzt den Plan neu berechnen.');});
  $('kw30-current-week').addEventListener('click',()=>{first.value=String(model.weekNumber());last.value=String(model.weekNumber());invalidate('Aktuelle Woche ausgewählt. Jetzt den Plan berechnen.');});
  for(const field of [first,last,liters])field.addEventListener('change',()=>invalidate('Eingaben geändert. Bitte den Plan neu berechnen.'));
  $('kw30-status').textContent='Wähle einen Zeitraum und starte den Generator. Deine bisherigen Dosierungen werden nicht verändert.';
})();
