'use strict';
(()=>{
  const views={
    'calculator': {title:'Düngerrechner',description:'Düngepläne berechnen, Produkte vergleichen und Wasserwerte berücksichtigen.',category:'Berechnen'},
    'diary': {title:'Grow-Tagebuch',description:'Grow-Projekte, Bilder, Messwerte und Beobachtungen dokumentieren.',category:'Dokumentieren'},
    'profiles': {title:'Grow-Profile',description:'Anbau-Setups lokal speichern und im Tagebuch wiederverwenden.',category:'Dokumentieren'},
    'grow-analysis': {title:'Grow-Analyse',description:'Verläufe aus deinem Tagebuch zusammenführen und auswerten.',category:'Auswerten'},
    'cannabis-finder': {title:'Mängel-Finder',description:'Symptome eingeben und mögliche Ursachen mit Lexikoneinträgen vergleichen.',category:'Erkennen'},
    'pests': {title:'Schädlingslexikon',description:'Schadbilder und mögliche Schädlinge erkennen.',category:'Wissen'},
    'beneficials': {title:'Nützlingslexikon',description:'Natürliche Gegenspieler und ihre Merkmale kennenlernen.',category:'Wissen'},
    'nutrients': {title:'Nährstofflexikon',description:'Nährstoffmängel, Überschüsse und Zusammenhänge verstehen.',category:'Wissen'},
    'knowledge-network': {title:'Cannabis-Wissensnetz',description:'Verknüpfte Themen, Beobachtungen und Grundlagen entdecken.',category:'Wissen'},
    'knowledge-assistant': {title:'Wissensassistent',description:'Fragen zu Pflanzenphysiologie und Pflege stellen.',category:'KI-Dienst'},
    'contact': {title:'Kontakt',description:'Rückmeldungen und Fehlerhinweise versenden.',category:'Kontakt'},
    'about': {title:'Über Keimwerk',description:'Mehr über das Hobbyprojekt und seine Idee erfahren.',category:'Keimwerk'}
  };
  const valid = key => Object.prototype.hasOwnProperty.call(views,key);
  const pageFromUrl = () => { const key = new URLSearchParams(location.search).get('view'); return valid(key) ? key : 'calculator'; };
  let current = pageFromUrl();
  let ready = false;
  const iframe = document.getElementById('work-frame');
  const loader = document.getElementById('frame-loading');
  loader.hidden=true; // avoid flashing a loader for quick cached starts
  setTimeout(()=>{if(!ready)loader.hidden=false;},450);
  const loadError = document.getElementById('frame-error');
  const sidebarLinks = [...document.querySelectorAll('.work-sidebar nav a[data-view]')];
  const send = (type, view) => iframe.contentWindow?.postMessage({type,view},location.origin);
  function updateContext(view){
    const el=document.getElementById('work-context');
    if(!el)return;
    el.hidden=!['diary','profiles'].includes(view);
    if(el.hidden)return;
    const label=document.getElementById('work-context-text');
    const link=document.getElementById('work-context-link');
    if(view==='profiles'){
      label.textContent='Grow-Profile sind Vorlagen für dein Anbau-Setup. Tagebucheinträge speicherst du im Grow-Tagebuch.';
      link.textContent='Zum Grow-Tagebuch →';
      link.href='?view=diary';
    }else{
      label.textContent='Im Grow-Tagebuch legst du Projekte und Einträge an. Anbau-Setups kannst du separat als Grow-Profil speichern.';
      link.textContent='Grow-Profile öffnen →';
      link.href='?view=profiles';
    }
  }
  function present(view) {
    const info = views[view];
    document.title = info.title+' — Keimwerk';
    document.getElementById('work-title').textContent = info.title;
    document.getElementById('work-description').textContent = info.description;
    document.getElementById('breadcrumbs-title').textContent = info.title.toUpperCase();
    document.getElementById('module-category').textContent = info.category.toUpperCase();
    document.getElementById('frame-label').textContent = info.title.toUpperCase()+' / ORIGINAL-MODUL';
    document.getElementById('open-full').href = 'app/index.html?view='+encodeURIComponent(view);
    iframe.title = 'Keimwerk: '+info.title;
    updateContext(view);
    for (const link of sidebarLinks) {
      const selected=link.dataset.view===view;
      link.classList.toggle('active',selected);
      if(selected)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    }
  }
  function openQueryTarget(){
    if(!ready)return;
    const params=new URLSearchParams(location.search);
    const entry=params.get('entry'),product=params.get('product');
    if(entry && /^[a-z][a-z0-9-]{1,100}$/.test(entry))iframe.contentWindow?.postMessage({type:'kw24-open-entry',view:current,entry},location.origin);
    if(product && /^KW-DNG-\d{5}$/.test(product))iframe.contentWindow?.postMessage({type:'kw24-open-product',product},location.origin);
  }
  function go(view, push = true) {
    if (!valid(view)) return;
    if (view === current && ready) return;
    current=view;
    present(view);
    if(push)history.pushState({view},'', '?view='+encodeURIComponent(view));
    if(ready)send('kw-switch-view',view);
    if(push){
      // Nach Wechsel nicht am Ende des zuvor geöffneten, langen Lexikons stehenbleiben.
      const heading=document.querySelector('.work-heading');
      if(heading)window.scrollTo({top:Math.max(0,heading.getBoundingClientRect().top+window.scrollY-20),behavior:'instant'});
    }
    // Die gleiche iframe-Instanz bleibt erhalten. Kein Reload, keine zweite Ladeanzeige.
  }
  present(current);
  // Ein einziger Start der alten Anwendung; alle weiteren Wechsel erfolgen im Speicher.
  iframe.src='app/index.html?version=6&view='+encodeURIComponent(current);
  function onReady() {
    if (ready) return;
    ready=true;
    loader.hidden=true;
    iframe.classList.add('is-loaded');
    send('kw-switch-view',current); // Auch schnell geklickte Wechsel während des Starts übernehmen.
    setTimeout(openQueryTarget,130);
  }
  iframe.addEventListener('load',()=>{
    // Wait for the explicit ready message from the app, not a blank/failed load.
    send('kw-parent-hello',current);
  });
  function showLoadError(message){
    if(ready)return;
    loader.hidden=true;
    loadError.hidden=false;
    loadError.textContent=message;
  }
  setTimeout(()=>{
    if(!ready)showLoadError('Das Modul antwortet nicht. Bitte den lokalen Server neu starten (Strg+C), die V6-ZIP in einen neuen Ordner entpacken und die Seite mit Strg+F5 neu laden.');
  },12000);
  window.addEventListener('message', event=>{
    if(event.source!==iframe.contentWindow || event.origin!==location.origin || !event.data)return;
    if(event.data.type==='kw-integrated-ready')onReady();
    if(event.data.type==='kw-integrated-switched' && valid(event.data.view) && event.data.view!==current)go(event.data.view,true);
    if(event.data.type==='kw-integrated-error')showLoadError(event.data.message||'Modulfehler');
    if(event.data.type==='kw-integrated-height'){
      const h=Number(event.data.height);
      if(!Number.isFinite(h) || h<350 || h>30000)return;
      const next=Math.max(780,Math.ceil(h+12));
      const old=Number.parseInt(iframe.style.height,10) || 1100;
      if(Math.abs(old-next)>12)iframe.style.height=next+'px';
    }
  });
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link || event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target && link.target!=='_self')return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin || url.pathname!==location.pathname || !url.searchParams.has('view'))return;
    const view=url.searchParams.get('view');
    if(!valid(view))return;
    event.preventDefault();
    if(url.searchParams.has('entry')||url.searchParams.has('product')){
      history.pushState({view},'',url.search);
      go(view,false);
      setTimeout(openQueryTarget,120);
    }else go(view);
  });
  window.addEventListener('popstate',()=>{go(pageFromUrl(),false);setTimeout(openQueryTarget,160);});
  const menu=document.getElementById('menu-toggle');
  const nav=document.getElementById('main-nav');
  menu.addEventListener('click',()=>{
    const open=menu.getAttribute('aria-expanded')!=='true';
    menu.setAttribute('aria-expanded',String(open));
    nav.classList.toggle('is-open',open);
    menu.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');
  });
})();
