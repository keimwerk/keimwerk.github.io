/* Keimwerk v2.4 – ausschliesslich die Darstellung von Si und SiO2.
   Der Rechenkern, die Produktdaten, Rundungsregeln und die bisherigen
   N-P-K-/Ca-/Mg-Zielbereiche bleiben unveraendert. */
(()=>{
  'use strict';
  const api=window.KeimwerkV21Bridge;
  const summary=document.getElementById('summary');
  if(!api||!summary)return;
  document.body.classList.add('kw24-silicon-integrated');
  const FACTOR=28.085/(28.085+2*15.999); // nur zur Anzeige eines eigenen Si-Zielbereichs als SiO2-Aequivalent
  const STORE_KEY='keimwerk-v24-personal-si-range';
  const fmt=api.fmt;
  const keys=[['Si','Silizium (Si)','mg/L · Elementarwert']];

  const note=document.createElement('p');
  note.id='kw24-silicon-note';note.className='kw24-silicon-note note';
  note.innerHTML='<strong>Silizium-Hinweis:</strong> Angezeigt wird reines Silizium (Si) in mg/L. Der Wert ist berechnet, nicht direkt gemessene Pflanzenaufnahme.';
  summary.after(note);

  const settings=document.createElement('details');
  settings.id='kw24-si-goal';settings.className='kw24-si-goal';
  settings.innerHTML=`
    <summary>Si-Ampel: persönlichen Zielbereich einstellen <small>(optional)</small></summary>
    <div class="kw24-goal-body">
      <p class="note">Für Silizium gibt es keinen allgemein gültigen Bedarfs- oder Überdüngungsbereich. Ohne eigene Eingabe bleibt die Ampel neutral. Eigene Grenzen dienen nur dem Vergleich mit einem selbst gewählten Zielbereich, <strong>nicht als Empfehlung</strong>.</p>
      <div class="kw24-goal-inputs">
        <label>Si ab (mg/L)<input id="kw24-si-min" type="number" inputmode="decimal" min="0" step="any" placeholder="Keine Vorgabe"></label>
        <label>Si bis (mg/L)<input id="kw24-si-max" type="number" inputmode="decimal" min="0" step="any" placeholder="Keine Vorgabe"></label>
        <button id="kw24-goal-clear" class="secondary" type="button">Zurücksetzen</button>
      </div>
      <p id="kw24-goal-message" class="note" role="status" aria-live="polite"></p>
    </div>`;
  note.after(settings);
  const minInput=document.getElementById('kw24-si-min');
  const maxInput=document.getElementById('kw24-si-max');
  const message=document.getElementById('kw24-goal-message');
  try{
    const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
    if(saved&&typeof saved.min==='number'&&typeof saved.max==='number'){
      minInput.value=String(saved.min);maxInput.value=String(saved.max);
    }
  }catch(_error){/* Website bleibt ohne localStorage uneingeschraenkt nutzbar */}

  function getRange(){
    const minText=minInput.value.trim(),maxText=maxInput.value.trim();
    if(minText===''&&maxText==='')return null;
    if(minText===''||maxText==='')return 'incomplete';
    const min=Number(minText),max=Number(maxText);
    if(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<=min)return 'invalid';
    return {min,max};
  }
  function refreshGoal(){
    const range=getRange();
    if(range==='invalid')message.textContent='Bitte gültige Grenzen eingeben: Minimum ≥ 0 und Maximum größer als Minimum.';
    else if(range==='incomplete')message.textContent='Für eine Ampel bitte beide Grenzen eingeben.';
    else if(range){
      message.textContent=`Dein Zielbereich: ${fmt(range.min,1)}–${fmt(range.max,1)} mg/L Si.`;
    }else message.textContent='Kein Zielbereich hinterlegt: neutrale Si-Ampel.';
    try{
      if(range&&typeof range==='object')localStorage.setItem(STORE_KEY,JSON.stringify(range));
      else localStorage.removeItem(STORE_KEY);
    }catch(_error){/* kein Einfluss auf die Berechnung */}
    draw();
  }
  minInput.addEventListener('input',refreshGoal);
  maxInput.addEventListener('input',refreshGoal);
  document.getElementById('kw24-goal-clear').addEventListener('click',()=>{minInput.value='';maxInput.value='';refreshGoal();});

  function assess(si,range){
    if(!range||typeof range!=='object')return {kind:'neutral',label:'Ohne allgemeinen Zielbereich'};
    const span=range.max-range.min;
    const margin=span*0.10;
    if(si<range.min){
      return si>=range.min-margin?{kind:'near',label:'Knapp unter deinem Ziel'}:{kind:'low',label:'Unter deinem Zielbereich'};
    }
    if(si>range.max){
      return si<=range.max+margin?{kind:'near',label:'Knapp über deinem Ziel'}:{kind:'high',label:'Über deinem Zielbereich'};
    }
    if(si-range.min<=margin||range.max-si<=margin)return {kind:'near',label:'Grenzbereich deines Ziels'};
    return {kind:'ok',label:'In deinem Zielbereich'};
  }
  function contribution(key,r){
    return r.details.reduce((s,d)=>s+Math.max(0,Number(d.contribution?.[key])||0),0);
  }
  function createCard(key,title,descriptor){
    const card=document.createElement('div');card.className='nutrient kw24-si-card';card.dataset.kw24Si=key;
    const titleArea=document.createElement('div');titleArea.className='name';
    const link=document.createElement('button');link.type='button';link.className='nutrient-link-button';
    link.dataset.nutrientLink=key;
    link.setAttribute('aria-label',title+' im Nährstofflexikon öffnen');
    link.title='Im Nährstofflexikon nachlesen';link.textContent=title+' ↗';
    titleArea.append(link);
    const val=document.createElement('div');val.className='value';val.dataset.kw24Value='';
    const description=document.createElement('div');description.className='range';description.dataset.kw24Description='';
    description.textContent=descriptor;
    const status=document.createElement('div');status.className='status kw24-status-neutral';status.dataset.kw24Status='';
    card.append(titleArea,val,description,status);
    return card;
  }
  function draw(){
    const results=api.getResults();
    if(!results||!Array.isArray(results.details))return;
    const values={Si:contribution('Si',results)};
    const range=getRange();
    const status=assess(values.Si,range);
    for(const [key,title,descriptor] of keys){
      let card=summary.querySelector(`[data-kw24-si="${key}"]`);
      if(!card){card=createCard(key,title,descriptor);summary.append(card);}
      const num=card.querySelector('[data-kw24-value]');
      const label=card.querySelector('[data-kw24-description]');
      const badge=card.querySelector('[data-kw24-status]');
      const text=fmt(values[key],1);
      if(num.textContent!==text)num.textContent=text;
      const desc=descriptor+(range&&typeof range==='object'?` · Dein Ziel: ${fmt(range.min,1)}–${fmt(range.max,1)}`:'');
      if(label.textContent!==desc)label.textContent=desc;
      const className='status kw24-status-'+status.kind;
      if(badge.className!==className)badge.className=className;
      const badgeText=status.label;
      if(badge.textContent!==badgeText)badge.textContent=badgeText;
    }
  }
  let pending=false;
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;draw();});}
  new MutationObserver(schedule).observe(summary,{childList:true});
  refreshGoal();
})();
