/* Keimwerk v2.2 — Bedienoberfläche, KEINE Änderungen der Berechnungen oder Produktkoeffizienten. */
(()=>{
 'use strict';
 const api=window.KeimwerkV21Bridge;
 if(!api){console.warn('Keimwerk v2.2: Rechner nicht bereit');return;}
 const $=id=>document.getElementById(id);
 const fmt=api.fmt;
 const KEY='keimwerk-v22-schema-favorites';
 const nameInput=$('kw22-fav-name'),select=$('kw22-fav-select'),status=$('kw22-fav-status');
 const say=message=>{status.textContent=message;};
 function readFavorites(){
  try{
   const value=JSON.parse(localStorage.getItem(KEY)||'[]');
   return Array.isArray(value)?value.filter(x=>x&&typeof x.name==='string'&&typeof x.id==='string'&&x.schema&&typeof x.schema==='object').slice(0,30):[];
  }catch(err){say('Gespeicherte Favoriten konnten nicht gelesen werden.');return [];}
 }
 function persistFavorites(items){try{localStorage.setItem(KEY,JSON.stringify(items));return true;}catch(err){say('Speichern fehlgeschlagen – eventuell ist der Browserspeicher voll. Bitte Schema als JSON exportieren.');return false;}}
 function displayFavorites(id=''){
  const items=readFavorites();select.replaceChildren(new Option(items.length?'Schema auswählen':'Noch keine Favoriten vorhanden',''));
  items.forEach(v=>select.add(new Option(v.name,v.id)));
  if(items.some(v=>v.id===id))select.value=id;
  $('kw22-fav-load').disabled=!items.length;
  $('kw22-fav-delete').disabled=!items.length;
 }
 function collectCompactSchema(){
  const state=api.getSchema();
  // Stock products are loaded from the unchanged built-in database. Only user-created products require a snapshot.
  const own=state.fertilizers.filter(f=>!String(f.id||'').startsWith('KW-DNG-'));
  return {...state,fertilizers:own,doses:state.doses.map(x=>({fertId:x.fertId,dose:x.dose}))};
 }
 $('kw22-fav-save').addEventListener('click',()=>{
  const name=nameInput.value.trim();
  if(!name){say('Bitte zuerst einen Namen eingeben.');nameInput.focus();return;}
  const items=readFavorites();const existing=items.find(x=>x.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de'));
  if(existing&&!confirm('Favorit „'+name+'“ überschreiben?'))return;
  if(!existing&&items.length>=30){say('Maximal 30 Favoriten. Bitte zuerst einen löschen.');return;}
  const value={id:existing?.id||('fav-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)),name,schema:collectCompactSchema(),updated:new Date().toISOString()};
  const next=existing?items.map(x=>x.id===existing.id?value:x):[...items,value];
  if(persistFavorites(next)){displayFavorites(value.id);say('„'+name+'“ gespeichert. Favoriten sind nur in diesem Browser verfügbar.');}
 });
 $('kw22-fav-load').addEventListener('click',()=>{
  const fav=readFavorites().find(x=>x.id===select.value);
  if(!fav){say('Bitte ein gespeichertes Schema auswählen.');return;}
  if(!confirm('Das Schema „'+fav.name+'“ laden? Aktuelle Eingaben werden dadurch ersetzt.'))return;
  try{api.applySchema(fav.schema);nameInput.value=fav.name;say('Schema „'+fav.name+'“ geladen.');}
  catch(error){say('Laden fehlgeschlagen: '+error.message);}
 });
 $('kw22-fav-delete').addEventListener('click',()=>{
  const fav=readFavorites().find(x=>x.id===select.value);
  if(!fav)return;
  if(!confirm('Favorit „'+fav.name+'“ endgültig löschen?'))return;
  if(persistFavorites(readFavorites().filter(x=>x.id!==fav.id))){displayFavorites();say('Favorit gelöscht. Aktuelle Eingaben wurden nicht geändert.');}
 });
 select.addEventListener('change',()=>{const fav=readFavorites().find(x=>x.id===select.value);if(fav)nameInput.value=fav.name;});
 displayFavorites();

 // Read-only visualization of the unchanged calculation results.
 const chart=$('kw22-chart-bars'),siBox=$('kw22-chart-silicon');
 const chartKeys=[['N','Stickstoff'],['P','Phosphor'],['K','Kalium'],['Ca','Calcium'],['Mg','Magnesium'],['Si','Silizium (Si)'],['SiO2','Siliziumdioxid (SiO₂)']];
 function drawCharts(){
  const r=api.getResults();
  if(!r||!r.sum)return;
  const values=chartKeys.map(([k,label])=>({k,label,value:['Si','SiO2'].includes(k)
    ?r.details.reduce((total,d)=>total+Math.max(0,Number(d.contribution[k])||0),0)
    :Math.max(0,Number(r.sum[k])||0)}));
  const max=Math.max(1,...values.map(x=>x.value));
  chart.replaceChildren();
  for(const item of values){
   const row=document.createElement('div');row.className='kw22-bar-row';
   const title=document.createElement('span');title.textContent=item.k;title.title=item.label;
   const track=document.createElement('div');track.className='kw22-bar-track';track.title=item.label+': '+fmt(item.value,2)+' mg/L';
   const fill=document.createElement('div');fill.className='kw22-bar-fill';fill.style.width=(item.value/max*100)+'%';
   track.append(fill);
   const amount=document.createElement('span');amount.textContent=fmt(item.value,1)+' mg/L';
   row.append(title,track,amount);chart.append(row);
  }
  const si=r.details.reduce((sum,d)=>sum+Math.max(0,Number(d.contribution.Si)||0),0);
  const sio2=r.details.reduce((sum,d)=>sum+Math.max(0,Number(d.contribution.SiO2)||0),0);
  siBox.replaceChildren();
  if(si>0||sio2>0){
   const label=document.createElement('p');label.className='note';
   label.textContent=`Si: ${fmt(si,1)} mg/L · SiO₂: ${fmt(sio2,1)} mg/L. Beide Balken zeigen dieselbe Siliziummenge in verschiedenen Darstellungen; nicht addieren. Für Silizium gibt es keinen pauschalen Zielbereich.`;
   siBox.append(label);
  }
  const active=values.map(v=>v.label+': '+fmt(v.value,1)+' mg/L').join(', ');
  chart.setAttribute('aria-label','Nährstoffkonzentrationen: '+active);
 }
 let chartScheduled=false;
 function scheduleCharts(){if(chartScheduled)return;chartScheduled=true;requestAnimationFrame(()=>{chartScheduled=false;drawCharts();});}
 new MutationObserver(scheduleCharts).observe($('summary'),{childList:true});
 new MutationObserver(scheduleCharts).observe($('silicateDetails'),{childList:true,attributes:true,attributeFilter:['hidden']});
 drawCharts();

 for(const button of document.querySelectorAll('[data-kw22-scroll]')){
  button.addEventListener('click',()=>{
   const target=$(button.dataset.kw22Scroll);
   if(!target)return;
   target.scrollIntoView({behavior:'smooth',block:'start'});
  });
 }

 // Only an explicit click sends the active plan to the parent Grow-Tagebuch.
 $('kw22-to-diary').addEventListener('click',()=>{
  const results=api.getResults(),state=api.getSchema(),liters=api.getLiters();
  const rows=results.details.filter(x=>x.dose>0).map(x=>({name:String(x.fert.name||'').slice(0,150),fertId:String(x.fert.id||''),dose:Number(x.dose),unit:x.fert.state==='solid'?'g/L':'ml/L'}));
  if(!rows.length){alert('Bitte zuerst mindestens einen Dünger mit einer Dosierung größer als 0 auswählen.');return;}
  const concentrations=Object.fromEntries(['N','P','K','Ca','Mg','S','Fe','Mn','B','Zn','Cu','Mo'].map(k=>[k,Number(results.sum[k])||0]));
  for(const key of ['Si','SiO2']){
   const val=results.details.reduce((n,d)=>n+(Number(d.contribution[key])||0),0);
   if(val>0)concentrations[key]=val;
  }
  const payload={source:'keimwerk-calculator-v22',date:new Date().toISOString().slice(0,10),stage:state.stage,liters,water:{ph:state.waterInfo?.ph??null,ec:state.waterInfo?.ec??null},rows,concentrations};
  if(window.parent===window){alert('Bitte den Düngerrechner über die Keimwerk-Website öffnen, um ein Grow-Projekt auszuwählen.');return;}
  window.parent.postMessage({type:'keimwerk-v22-to-diary',payload},location.origin);
 });
})();
