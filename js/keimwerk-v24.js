/* Keimwerk v2.4 – Suche und lokale Gesamtsicherung. Keine Drittserver und kein Tracking. */
(()=>{
 'use strict';
 const prefix=location.pathname.includes('/app/')?'../':'';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').toLocaleLowerCase('de-DE');
 const create=(tag,props={})=>Object.assign(document.createElement(tag),props);
 let searchData=[],lastFocus=null;
 const root=create('div',{id:'kw24-overlay'});root.hidden=true;document.body.append(root);
 const close=()=>{root.hidden=true;root.replaceChildren();document.body.classList.remove('kw24-modal-open');lastFocus?.focus?.();};
 const frame=(title)=>{
  lastFocus=document.activeElement;root.replaceChildren();root.hidden=false;document.body.classList.add('kw24-modal-open');
  const backdrop=create('div',{className:'kw24-backdrop'});backdrop.addEventListener('click',close);root.append(backdrop);
  const panel=create('section',{className:'kw24-dialog'});panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','kw24-dialog-title');
  panel.innerHTML='<div class="kw24-dialog-head"><span>KEIMWERK · WISSEN & WERKZEUGE</span><button type="button" class="kw24-close" aria-label="Schließen">×</button></div><h2 id="kw24-dialog-title">'+esc(title)+'</h2>';
  root.append(panel);panel.querySelector('.kw24-close').addEventListener('click',close);
  panel.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();close();return;}
   if(e.key==='Tab'){
    const items=[...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')].filter(x=>x.getClientRects().length);
    if(!items.length)return;const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  });
  panel.querySelector('button').focus();return panel;
 };
 const resultLink=i=>{
  const url=new URL(prefix+'bereiche.html',document.baseURI);url.searchParams.set('view',i.view);
  if(i.entry)url.searchParams.set('entry',i.entry);
  if(i.product)url.searchParams.set('product',i.product);
  return url.href;
 };
 const rank=(i,tokens)=>{
  const label=normalize(i.label),kind=normalize(i.kind),body=normalize(i.terms||'');
  if(!tokens.every(q=>label.includes(q)||kind.includes(q)||body.includes(q)))return -1;
  let score=0;
  for(const q of tokens){if(label===q)score+=100;else if(label.startsWith(q))score+=48;else if(label.includes(q))score+=23;else if(kind.includes(q))score+=4;else score+=1;}
  if(i.kind==='Bereich')score+=2;return score;
 };
 async function openSearch(){
  const panel=frame('Was möchtest du wissen?');
  panel.insertAdjacentHTML('beforeend','<label class="kw24-field-label" for="kw24-search-input">Gesamte Website durchsuchen</label><input id="kw24-search-input" type="search" placeholder="z. B. Spinnmilben, Magnesium, Silizium, Düngername …" autocomplete="off"><p id="kw24-search-status" class="kw24-help" role="status">Suche wird geladen …</p><div id="kw24-results" class="kw24-results"></div><p class="kw24-help">Suche auf diesem Gerät – deine Eingabe wird nicht versendet. Ergebnis anklicken, um den Eintrag zu öffnen.</p>');
  const inp=panel.querySelector('#kw24-search-input'),res=panel.querySelector('#kw24-results'),status=panel.querySelector('#kw24-search-status');
  const render=()=>{
   const tokens=normalize(inp.value.trim()).split(/\s+/).filter(Boolean);
   const found=(tokens.length?searchData.map(i=>({i,score:rank(i,tokens)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score):searchData.filter(i=>i.kind==='Bereich').map(i=>({i,score:0})));
   status.textContent=found.length+' Treffer'+(found.length>45?' · 45 werden angezeigt; Suche genauer eingrenzen':'');
   res.replaceChildren();
   for(const {i} of found.slice(0,45)){
    const a=create('a',{className:'kw24-result',href:resultLink(i)});
    a.innerHTML='<span>'+esc(i.label)+'</span><small>'+esc(i.kind)+' ↗</small>';res.append(a);
   }
   if(!found.length)res.append(create('p',{className:'kw24-help',textContent:'Kein Treffer. Versuche einen anderen Begriff oder eine andere Schreibweise.'}));
  };
  inp.addEventListener('input',render);
  inp.focus();
  try{
   if(!searchData.length){const response=await fetch(prefix+'js/keimwerk-v24-search-index.json',{cache:'force-cache'});if(!response.ok)throw Error('index');searchData=await response.json();}
   if(!root.hidden)render();
  }catch(_){status.textContent='Der Suchindex konnte nicht geladen werden. Starte Keimwerk über start.bat und lade neu.';}
 }
 // Sichert bewusst nur die Benutzer-Daten, niemals die fest eingebauten 227 Produktdatensätze.
 const approved=['keimwerk-grow-diary-v1','keimwerk-grow-profiles-v1','keimwerkCalculatorState','keimwerkFertilizers','keimwerk-v22-schema-favorites','keimwerk-v24-personal-si-range'];
 const owns=k=>approved.includes(k)||/^keimwerk-v\d+-(?:favorites|schema-favorites|settings)$/.test(k);
 const retrieve=()=>{
  const records={};
  for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);if(k&&owns(k)){const v=localStorage.getItem(k);if(v!==null)records[k]=v;}
  }return records;
 };
 const sizeText=n=>n>1024*1024?(n/1024/1024).toFixed(1)+' MB':Math.ceil(n/1024)+' KB';
 function downloadBackup(msg){
  try{
   const records=retrieve();const keys=Object.keys(records);
   if(!keys.length){msg.textContent='Noch keine eigenen Daten gespeichert. Lege zuerst ein Projekt oder einen Favoriten an.';return;}
   const payload={format:'keimwerk-browser-backup',version:1,createdAt:new Date().toISOString(),origin:location.origin,records};
   const data=JSON.stringify(payload,null,2);
   const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
   const anchor=create('a',{href:url,download:'Keimwerk-Datensicherung-'+new Date().toISOString().slice(0,10)+'.json'});
   document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   msg.textContent=keys.length+' Datenbereiche exportiert ('+sizeText(new Blob([data]).size)+'). Bewahre die Datei sicher auf: Sie kann persönliche Fotos und Notizen enthalten.';
  }catch(e){msg.textContent='Export fehlgeschlagen: '+e.message;}
 }
 function parseImport(text){
  if(text.length>25*1024*1024)throw Error('Datei ist zu groß (maximal 25 MB).');
  const p=JSON.parse(text);
  if(!p||p.format!=='keimwerk-browser-backup'||p.version!==1||!p.records||typeof p.records!=='object'||Array.isArray(p.records))throw Error('Keine gültige Keimwerk-Gesamtsicherung.');
  const entries=Object.entries(p.records);
  if(!entries.length||entries.length>40||entries.some(([k,v])=>!owns(k)||typeof v!=='string'||v.length>20*1024*1024))throw Error('Ungültige oder unbekannte Datenbereiche in der Sicherung.');
  for(const [k,v] of entries){try{JSON.parse(v);}catch{throw Error('Ungültige Daten in '+k);}}
  return entries;
 }
 function openBackup(){
  const panel=frame('Deine Daten sichern');
  panel.insertAdjacentHTML('beforeend',`<p class="kw24-help">Alle Grow-Projekte, Grow-Profile, gespeicherten Düngeschemata, Rechner-Einstellungen und eigenen Dünger auf diesem Browser in <strong>einer Datei</strong> sichern. Keine Anmeldung und keine Cloud erforderlich.</p>
   <div class="kw24-backup-block"><h3>1. Sicherung herunterladen</h3><button type="button" id="kw24-export" class="kw24-primary">Gesamtsicherung als JSON herunterladen ↓</button></div>
   <div class="kw24-backup-block"><h3>2. Sicherung wiederherstellen</h3><label class="kw24-field-label" for="kw24-import">Gespeicherte Keimwerk-JSON auswählen</label><input type="file" id="kw24-import" accept=".json,application/json"><p id="kw24-preview" class="kw24-help">Noch keine Datei ausgewählt.</p>
   <label class="kw24-check"><input type="checkbox" id="kw24-confirm"> Ich habe verstanden, dass vorhandene Daten in den gewählten Bereichen überschrieben werden können.</label><button type="button" id="kw24-restore" class="kw24-primary" disabled>Geprüfte Sicherung wiederherstellen</button></div>
   <p id="kw24-backup-message" class="kw24-help" role="status"></p><p class="kw24-help">Sicherungen enthalten möglicherweise private Fotos und persönliche Texte. Bewahre sie geschützt auf. Gespeicherte Daten bleiben nur auf dem jeweiligen Browser bzw. der gleichen Website-Adresse verfügbar.</p>`);
  const status=panel.querySelector('#kw24-backup-message'),file=panel.querySelector('#kw24-import'),preview=panel.querySelector('#kw24-preview'),accept=panel.querySelector('#kw24-confirm'),restore=panel.querySelector('#kw24-restore');
  let entries=null;
  panel.querySelector('#kw24-export').addEventListener('click',()=>downloadBackup(status));
  function enable(){restore.disabled=!(entries&&accept.checked);}
  accept.addEventListener('change',enable);
  file.addEventListener('change',async()=>{
   entries=null;restore.disabled=true;status.textContent='';if(!file.files?.length){preview.textContent='Noch keine Datei ausgewählt.';return;}
   try{const f=file.files[0];if(f.size>25*1024*1024)throw Error('Datei ist zu groß.');entries=parseImport(await f.text());
    const old=entries.filter(([k])=>localStorage.getItem(k)!==null);
    preview.textContent=entries.length+' Datenbereiche erkannt; '+old.length+' davon würden vorhandene Daten überschreiben. Betroffene Bereiche: '+entries.map(([k])=>k).join(', ')+'.';
   }catch(e){preview.textContent='Datei abgelehnt: '+e.message;}
   enable();
  });
  restore.addEventListener('click',()=>{
   if(!entries||!accept.checked)return;
   const conflicts=entries.filter(([k])=>localStorage.getItem(k)!==null).length;
   if(!confirm('Wirklich '+entries.length+' Datenbereiche wiederherstellen? '+conflicts+' bereits vorhandene Bereiche werden überschrieben. Die Seite wird anschließend neu geladen.'))return;
   // Vor der Wiederherstellung vollständige lokale Rückrollkopie im Speicher halten.
   const old=new Map(entries.map(([k])=>[k,localStorage.getItem(k)]));
   try{for(const [k,v] of entries)localStorage.setItem(k,v);}catch(e){for(const [k,v] of old){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(_){}}status.textContent='Wiederherstellung fehlgeschlagen; vorherige Daten wurden soweit möglich zurückgesetzt: '+e.message;return;}
   status.textContent='Daten eingelesen. Die Website wird neu geladen.';location.reload();
  });
 }
 document.getElementById('open-search')?.addEventListener('click',openSearch);
 document.querySelectorAll('[data-kw24-backup]').forEach(b=>b.addEventListener('click',openBackup));
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!root.hidden){e.preventDefault();close();return;}
  if(e.key==='/'&&root.hidden&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName||'')&&!document.activeElement?.isContentEditable){e.preventDefault();openSearch();}
 });
 window.kw24OpenBackup=openBackup;
})();
