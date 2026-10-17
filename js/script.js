'use strict';
(() => {
  const menu = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  const closeMenu = () => { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Menü öffnen'); };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if(window.innerWidth > 900) closeMenu(); });

  const views = {
    fertilizer: {sup:'NÄHRSTOFFMANAGEMENT',title:'Düngerrechner',desc:'Nährstoffwerte auf einen Blick – übersichtlich und nachvollziehbar.', labels:['Stickstoff','Calcium','Magnesium'], values:['142','98','34'], units:['mg/L','mg/L','mg/L'],chart:'Nährstoffprofil',bars:[42,62,48,83,70,58,88,66,76,53,69,89]},
    diagnosis: {sup:'BEOBACHTUNGEN EINORDNEN',title:'Mängel-Finder',desc:'Symptome prüfen und mögliche Ursachen im Zusammenhang betrachten.', labels:['Symptome','Hinweise','Profile'], values:['04','03','12'], units:['erfasst','gefunden','im Lexikon'],chart:'Vergleich der Beobachtungen',bars:[38,68,47,50,31,79,44,66,38,62,28,46]},
    water: {sup:'WASSERQUALITÄT',title:'Wasserwerte',desc:'Messwerte verständlich darstellen und Quellen transparenter vergleichen.', labels:['Calcium','Magnesium','Härte'], values:['43','7','8,1'], units:['mg/L','mg/L','°dH'],chart:'Beispielwerte im Überblick',bars:[50,36,51,63,56,54,80,70,43,60,52,76]}
  };
  const title=document.getElementById('preview-title');
  const sup=document.getElementById('preview-sup');
  const desc=document.getElementById('preview-description');
  const chartTitle=document.getElementById('demo-chart-title');
  const panel=document.getElementById('tool-panel');
  document.querySelectorAll('.tool-tab').forEach(button => button.addEventListener('click', () => {
    const view=views[button.dataset.tool];
    document.querySelectorAll('.tool-tab').forEach(tab => { const active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1; });
    title.textContent=view.title;sup.textContent=view.sup;desc.textContent=view.desc;chartTitle.textContent=view.chart;
    view.values.forEach((number,i)=>{document.getElementById('demo-label-'+(i+1)).textContent=view.labels[i];const element=document.getElementById('demo-number-'+(i+1));element.textContent=number;const unit=document.createElement('span');unit.textContent=view.units[i];element.appendChild(unit);});
    document.querySelectorAll('.bars i').forEach((bar,i)=>bar.style.setProperty('--v',view.bars[i]+'%'));
    panel.setAttribute('aria-labelledby',button.id);
    const paths={fertilizer:'calculator',diagnosis:'cannabis-finder',water:'calculator'};
    const link=document.getElementById('open-active-tool');
    link.href='bereiche.html?view='+paths[button.dataset.tool];
    link.innerHTML= (button.dataset.tool==='water'?'Wasserwerte im Rechner öffnen':view.title+' starten')+' <span aria-hidden="true">↗</span>';
  }));
  document.querySelector('.tool-selector').addEventListener('keydown',event=>{
    const tabs=[...document.querySelectorAll('.tool-tab')];const current=tabs.indexOf(document.activeElement);
    if(current<0 || !['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const next=tabs[(current+(event.key==='ArrowRight'||event.key==='ArrowDown'?1:-1)+tabs.length)%tabs.length];next.focus();next.click();
  });
  const modal=document.getElementById('search-modal'), open=document.getElementById('open-search'), close=document.getElementById('close-search'),backdrop=document.getElementById('search-backdrop'),input=document.getElementById('search-input'),results=document.getElementById('search-results');
  const targets=[
    {label:'Wissenswelt',meta:'Artikel & Lexika',href:'#wissen',terms:'wissen lexikon schädlinge nützlinge nährstoffe pflanzen physiologie blatt'},
    {label:'Düngerrechner',meta:'Rechner öffnen',href:'bereiche.html?view=calculator',terms:'dünger rechner n p k magnesium calcium calmag ec ph nährstoffe'},
    {label:'Mängel-Finder',meta:'Diagnose öffnen',href:'bereiche.html?view=cannabis-finder',terms:'mangel mängel finder symptome diagnose gelb blätter'},
    {label:'Wasserwerte',meta:'Im Düngerrechner',href:'bereiche.html?view=calculator',terms:'wasser werte wasseranalyse calcium magnesium leitungswasser'},
    {label:'Grow-Tagebuch',meta:'Tagebuch öffnen',href:'bereiche.html?view=diary',terms:'tagebuch grow journal pflanze projekt foto blüte wachstum'},
    {label:'Über Keimwerk',meta:'Unsere Idee',href:'#philosophie',terms:'keimwerk info über idee wissen'}
  ];
  targets.push(
    {label:'Schädlingslexikon',meta:'Wissensbereich',href:'bereiche.html?view=pests',terms:'schädlinge milben thripse blattläuse trauermücken'},
    {label:'Nützlingslexikon',meta:'Wissensbereich',href:'bereiche.html?view=beneficials',terms:'nützlinge raubmilben schwebfliegen marienkäfer'},
    {label:'Nährstofflexikon',meta:'Wissensbereich',href:'bereiche.html?view=nutrients',terms:'nährstoffe calcium magnesium unterdüngung überdüngung'},
    {label:'Grow-Analyse',meta:'Daten & Verlauf',href:'bereiche.html?view=grow-analysis',terms:'analyse messwerte chart trends grow ki'},
    {label:'Wissensnetz',meta:'Verknüpftes Wissen',href:'bereiche.html?view=knowledge-network',terms:'wissensnetz zusammenhänge graf'},
    {label:'Wissensassistent',meta:'KI-Fragen',href:'bereiche.html?view=knowledge-assistant',terms:'assistent chatbot künstliche intelligenz ki'},
    {label:'Grow-Profile',meta:'Setups speichern',href:'bereiche.html?view=profiles',terms:'profile anbau setup dünger'}
  );
  let lastFocus=null;
  function renderSearch(){const q=input.value.toLocaleLowerCase('de').trim();const found=targets.filter(t=>(t.label+' '+t.terms).toLocaleLowerCase('de').includes(q));results.replaceChildren();if(!found.length){const p=document.createElement('p');p.className='search-empty';p.textContent='Kein passender Bereich gefunden.';results.appendChild(p);return;}
    for(const t of found){const a=document.createElement('a');a.href=t.href;a.className='search-result';const name=document.createElement('span');name.textContent=t.label;const meta=document.createElement('small');meta.textContent=t.meta+' ↗';a.append(name,meta);a.addEventListener('click',hideSearch);results.appendChild(a);}
  }
  function showSearch(){lastFocus=document.activeElement;modal.hidden=false;document.body.classList.add('modal-open');input.value='';renderSearch();input.focus();closeMenu();}
  function hideSearch(){modal.hidden=true;document.body.classList.remove('modal-open');if(lastFocus&&typeof lastFocus.focus==='function')lastFocus.focus();}
  open.addEventListener('click',showSearch);close.addEventListener('click',hideSearch);backdrop.addEventListener('click',hideSearch);input.addEventListener('input',renderSearch);
  document.addEventListener('keydown',event=>{
    if(event.key==='/' && modal.hidden && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName||'')){event.preventDefault();showSearch();return;}
    if(event.key==='Escape'&&!modal.hidden){event.preventDefault();hideSearch();return;}
    if(event.key==='Escape')closeMenu();
    if(event.key==='Tab'&&!modal.hidden){const items=[...modal.querySelectorAll('button,input,a[href]')].filter(e=>e.getClientRects().length);if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
})();
