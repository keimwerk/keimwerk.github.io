/* Keimwerk v2.2 Grow-Tagebuch: ausschließlich nach aktiver Bestätigung speichern. */
(()=>{
 'use strict';
 const calculator=document.getElementById('calculator-frame');
 if(!calculator)return;
 const KEY='keimwerk-grow-diary-v1';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const style=document.createElement('style');
 style.textContent=`
 .kw22-diary-dialog{position:fixed;inset:0;background:rgba(4,16,8,.85);z-index:99999;display:flex;justify-content:center;align-items:flex-start;padding:clamp(12px,5vh,55px) 12px 16px;overflow-y:auto}
 .kw22-diary-dialog[hidden]{display:none!important}
 .kw22-diary-content{width:min(100%,550px);padding:22px;background:#25372a;color:#ecf1e9;border:1px solid #73916e;border-radius:13px;box-shadow:0 24px 70px #0009;max-height:90vh;overflow:auto}
 .kw22-diary-content h2{font-size:21px;margin:0 0 8px}
 .kw22-diary-content p{font-size:14px;line-height:1.6;color:#d5e4d0}
 .kw22-diary-content select{width:100%;min-height:45px;background:#13271a;color:white;border:1px solid #89a98d;border-radius:8px;padding:10px;font-size:16px}
 .kw22-diary-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;margin-top:18px}
 .kw22-diary-actions button{min-height:44px;padding:10px 16px;border:1px solid #769878;border-radius:8px;background:#b0c2a6;color:#142a19;font-size:14px;font-weight:700;cursor:pointer}
 .kw22-diary-actions button.secondary{background:transparent;color:#e2eee0}
 .kw22-diary-content .kw22-diary-alert{color:#f4d2a3;min-height:20px}
 `;
 document.head.append(style);
 const layer=document.createElement('div');layer.className='kw22-diary-dialog';layer.hidden=true;
 layer.innerHTML=`<section class="kw22-diary-content" role="dialog" aria-modal="true" aria-labelledby="kw22-diary-title">
  <h2 id="kw22-diary-title">Düngeplan ins Grow-Tagebuch</h2>
  <p id="kw22-diary-intro">Wähle ein Projekt. Der aktuelle Düngeplan wird als <strong>geplanter</strong> Tagebucheintrag gespeichert – nicht als bereits durchgeführte Düngung.</p>
  <label for="kw22-diary-project">Grow-Projekt</label><select id="kw22-diary-project"></select>
  <p class="kw22-diary-alert" id="kw22-diary-status" role="status"></p>
  <div class="kw22-diary-actions"><button type="button" class="secondary" id="kw22-diary-cancel">Abbrechen</button><button type="button" id="kw22-diary-save">Als geplanten Eintrag speichern</button></div>
 </section>`;
 document.body.append(layer);
 const select=layer.querySelector('#kw22-diary-project');
 const msg=layer.querySelector('#kw22-diary-status');
 const save=layer.querySelector('#kw22-diary-save');
 const cancel=layer.querySelector('#kw22-diary-cancel');
 let latestPayload=null,lastFocus=null;
 function read(){try{const p=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(p)?p:[]}catch{return [];}}
 function close(){layer.hidden=true;latestPayload=null;lastFocus?.focus?.();}
 cancel.addEventListener('click',close);
 layer.addEventListener('click',event=>{if(event.target===layer)close();});
 layer.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 function validPayload(p){
  return p&&p.source==='keimwerk-calculator-v22'&&Array.isArray(p.rows)&&p.rows.length>0&&p.rows.length<=100&&
   p.rows.every(r=>r&&typeof r.name==='string'&&r.name.length<=150&&Number.isFinite(r.dose)&&r.dose>=0&&r.dose<=100000&&['g/L','ml/L'].includes(r.unit))&&
   Number.isFinite(p.liters)&&p.liters>=0.1&&p.liters<=100000&&p.concentrations&&typeof p.concentrations==='object';
 }
 function open(p){
  const projects=read().filter(p=>typeof p.id==='string'&&typeof p.name==='string');
  if(!projects.length){
   if(confirm('Noch kein Grow-Projekt vorhanden. Zum Grow-Tagebuch wechseln und eines anlegen?')){
    if(typeof window.keimwerkNavigateView==='function')window.keimwerkNavigateView('diary');
    else window.keimwerkShowPage?.('diary');
   }
   return;
  }
  latestPayload=p;
  lastFocus=document.activeElement;
  msg.textContent='';
  select.replaceChildren();
  projects.forEach(proj=>select.add(new Option(proj.name,proj.id)));
  layer.hidden=false;
  select.focus();
 }
 save.addEventListener('click',()=>{
  if(!validPayload(latestPayload)){msg.textContent='Düngeplan konnte nicht übernommen werden.';return;}
  const all=read(),project=all.find(p=>p.id===select.value);
  if(!project){msg.textContent='Dieses Projekt ist nicht mehr vorhanden.';return;}
  const p=latestPayload;
  const doseText=p.rows.map(d=>`${d.name}: ${String(d.dose).replace('.',',')} ${d.unit}`).join(' · ');
  const nutrientText=Object.entries(p.concentrations).filter(([k,n])=>['N','P','K','Ca','Mg','S','Si','SiO2'].includes(k)&&Number.isFinite(n)).map(([k,n])=>`${k}: ${Number(n).toLocaleString('de-DE',{maximumFractionDigits:2})} mg/L`).join(' · ');
  const waterText=[p.water?.ph==null?'':'Ausgangswasser-pH: '+p.water.ph,p.water?.ec==null?'':'Ausgangswasser-EC: '+p.water.ec+' mS/cm'].filter(Boolean).join(' · ');
  const notes=`Düngeplan aus Keimwerk übernommen (geplant; Anwendung nicht bestätigt).\nGeplante Ansatzmenge: ${p.liters} L.\nBerechnete Konzentrationen: ${nutrientText}.${waterText?'\n'+waterText:''}`;
  const entry={id:'entry-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),date:p.date||new Date().toISOString().slice(0,10),stage:'',height:'',water:'',fertilizer:doseText,ph:'',ec:'',temp:'',humidity:'',notes,photo:'',keimwerkPlan:{version:1,applied:false,liters:p.liters,stage:p.stage,rows:p.rows,concentrations:p.concentrations,source:'calculator'}};
  project.entries=Array.isArray(project.entries)?project.entries:[];
  project.entries.push(entry);
  project.updated=new Date().toISOString();
  try{localStorage.setItem(KEY,JSON.stringify(all));}
  catch(err){msg.textContent='Speichern fehlgeschlagen. Bitte Grow-Tagebuch exportieren und Browserspeicher prüfen.';return;}
  const projectId=project.id;
  close();
  window.gdRefresh?.();
  if(confirm('Düngeplan wurde als geplanter Eintrag zu „'+project.name+'“ gespeichert. Jetzt Grow-Tagebuch öffnen?')){
   if(typeof window.keimwerkNavigateView==='function')window.keimwerkNavigateView('diary');
   else window.keimwerkShowPage?.('diary');
   requestAnimationFrame(()=>document.querySelector(`[data-gd-view="${CSS.escape(projectId)}"]`)?.focus());
  }
 });
 window.addEventListener('message',event=>{
  if(event.source!==calculator.contentWindow ||event.origin!==window.location.origin)return;
  if(event.data?.type!=='keimwerk-v22-to-diary')return;
  if(!validPayload(event.data.payload))return;
  open(event.data.payload);
 });
})();
