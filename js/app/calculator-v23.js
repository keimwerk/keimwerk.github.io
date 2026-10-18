/* Keimwerk v2.3 – ausschließlich Darstellung/Anordnung.
   Keine Änderungen an Rechenkern, Datenbank, Import/Export oder gespeicherten Schemata. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const panel=$('doseRows')?.closest('.panel');
  const body=panel?.querySelector('.panel-body');
  if(!body) return;
  document.body.classList.add('kw23-compact');

  function fold(content,title,description,id){
    const details=document.createElement('details');
    details.className='kw23-fold';
    details.id=id;
    const summary=document.createElement('summary');
    const left=document.createElement('span');left.className='kw23-fold-label';left.textContent=title;
    summary.append(left);
    if(description){const hint=document.createElement('small');hint.textContent=description;summary.append(hint);}
    details.append(summary,content);
    return details;
  }

  // Ein kurzer Hinweis ist sichtbar, der vollständige Text bleibt zugänglich.
  const notice=panel.querySelector('.kw-calculator-notice');
  if(notice){
    notice.removeAttribute('style');
    const wrapped=fold(notice,'Hinweise zur Genauigkeit','Bitte Produktwerte prüfen','kw23-notice');
    panel.querySelector('.panel-head')?.after(wrapped);
  }

  // Filter und Favoriten sind vorhanden, nehmen aber erst beim Öffnen Platz ein.
  const filters=body.querySelector('.kw21-filter-panel');
  const favorites=body.querySelector('.kw22-favorites');
  const doses=$('doseRows');
  if(filters&&favorites&&doses){
    const tools=document.createElement('div');tools.className='kw23-quicktools';
    const filterFold=fold(filters,'Produktfilter','Hersteller und Nährstoffe','kw23-filters');
    const favFold=fold(favorites,'Meine Düngeschemata','Speichern und laden','kw23-favorites');
    tools.append(filterFold,favFold);
    doses.before(tools);
    const updateFilterTitle=()=>{
      const n=Number(!!$('kw21Brand')?.value)+Number(!!$('kw21Nutrient')?.value);
      filterFold.classList.toggle('kw23-active-filter',n>0);
      filterFold.querySelector('summary small').textContent=n?`${n} Filter aktiv`:'Hersteller und Nährstoffe';
    };
    $('kw21Brand')?.addEventListener('change',updateFilterTitle);
    $('kw21Nutrient')?.addEventListener('change',updateFilterTitle);
    $('kw21ResetFilters')?.addEventListener('click',updateFilterTitle);
    updateFilterTitle();
  }

  // Die detaillierte Nährstofftabelle bleibt dauerhaft direkt unter den Düngerzeilen.
  // Keine Verschiebung in ein <details>-Element: Der Rechenkern rendert weiterhin
  // in #contributionTable und aktualisiert die Werte unverändert live.
  const summaryGrid=$('summary');

  // Diagramm nur bei Interesse; dessen Ergebnisdaten werden weiterhin live aktualisiert.
  const chart=$('kw22-charts');
  if(chart&&summaryGrid){
    const chartFold=fold(chart,'Nährstoffdiagramme','N, P, K, Ca, Mg, Si und SiO₂','kw23-charts');
    summaryGrid.after(chartFold);
    document.querySelectorAll('[data-kw22-scroll="kw22-charts"]').forEach(button=>{
      button.addEventListener('click',()=>{chartFold.open=true;},{capture:true});
    });
  }

  // Hintergrund-Erklärungen samt Statuslegende unverändert in eine Hilfsbox verschieben.
  const legend=body.querySelector('.range-legend');
  const explanation=body.querySelector('.kw21-explainer-note');
  const source=body.querySelector('.source-note');
  const pieces=[explanation,legend,source].filter(Boolean);
  if(pieces.length){
    const box=document.createElement('div');box.className='kw23-help-body';
    pieces.forEach(node=>box.append(node));
    const help=fold(box,'Ergebnisse richtig verstehen','Legende, Zielbereiche und Fachquellen','kw23-help');
    body.append(help);
  }

  // Die wichtigsten Handlungen bleiben griffbereit; die selteneren gruppieren wir.
  const topActions=document.querySelector('.top-actions');
  if(topActions){
    const extra=['exportBtn','importBtn','importFile','shareBtn'].map($).filter(Boolean);
    if(extra.length){
      const box=document.createElement('div');box.className='kw23-action-content';
      extra.forEach(node=>box.append(node));
      topActions.append(fold(box,'Schemata & Teilen','','kw23-actions'));
    }
  }
  const toolButtons=document.querySelector('.water-side-action');
  if(toolButtons){
    const extra=['openChecklistModal','openCompareModal','openOwnFertModal'].map($).filter(Boolean);
    if(extra.length){
      const box=document.createElement('div');box.className='kw23-action-content';
      extra.forEach(node=>box.append(node));
      toolButtons.append(fold(box,'Weitere Werkzeuge','','kw23-more-tools'));
    }
  }

  // Weniger Text im Kopfbereich, volle Erklärungen sind weiterhin hinter den Aufklappfeldern.
})();
