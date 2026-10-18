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
  // Die gemeinsame, datenschutzfreundliche v2.4-Suche wird extern geladen.
})();
