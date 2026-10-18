/* Keimwerk v2.1 – reine Komfortfunktionen für den Düngerrechner.
   Die Berechnung, Nährstoffkoeffizienten und Produktdaten werden nicht verändert. */
(() => {
  'use strict';
  const engine=window.KeimwerkV21Bridge;
  if(!engine){console.warn('Keimwerk v2.1: Rechnerverbindung fehlt');return;}
  const $=id=>document.getElementById(id);
  const list=$('doseRows'),summary=$('summary');
  const brand=$('kw21Brand'),nutrient=$('kw21Nutrient'),status=$('kw21FilterResults');
  const micronutrients=new Set(['Fe','Mn','B','Zn','Cu','Mo']);
  const nutrients={
    N:['Stickstoff','Baustein für Aminosäuren, Proteine und Chlorophyll; beeinflusst besonders das vegetative Wachstum.'],
    P:['Phosphor','Wichtig für Energieübertragung (ATP), Zellprozesse und Wachstum. Der Rechner zeigt elementaren Phosphor, nicht P₂O₅.'],
    K:['Kalium','Beteiligt an Wasserhaushalt, Enzymfunktionen und Stomata-Regulation. Angezeigt wird K, nicht K₂O.'],
    Ca:['Calcium','Baustein von Zellwänden und wichtig für junge Gewebe. Die Versorgung hängt auch von Wassertransport und Wurzelzustand ab.'],
    Mg:['Magnesium','Zentraler Bestandteil von Chlorophyll und Aktivator zahlreicher Enzyme.'],
    S:['Schwefel','Bestandteil schwefelhaltiger Aminosäuren und Proteine.'],
    B:['Bor','Wichtig für Zellwandbildung und Wachstumsprozesse; der Abstand zwischen Mangel und Überschuss kann klein sein.'],
    Cu:['Kupfer','Beteiligt an Redoxreaktionen und Enzymsystemen; hohe Mengen können toxisch sein.'],
    Fe:['Eisen','Wichtig für Elektronentransport und Chlorophyllbildung; die Verfügbarkeit ist stark pH-abhängig.'],
    Mn:['Mangan','Beteiligt an Photosynthese und zahlreichen enzymatischen Reaktionen.'],
    Mo:['Molybdän','Beteiligt an Enzymen des Stickstoffstoffwechsels, etwa der Nitratreduktion.'],
    Zn:['Zink','Wichtig für Enzyme sowie Wachstums- und Regulationsprozesse.'],
    Si:['Silizium','Kann bei manchen Pflanzen Stressresistenz unterstützen; ist für die meisten Kulturpflanzen nicht als essenziell eingestuft. Die Aufnahme erfolgt überwiegend als gelöste Kieselsäure.'],
    SiO2:['Siliziumdioxid','SiO₂ ist die Oxid-/Äquivalentdarstellung derselben Siliziummenge. Si und SiO₂ werden nicht addiert. Nicht gleichbedeutend mit gelöster, pflanzenverfügbarer Kieselsäure.']
  };
  const generalSource='https://extension.oregonstate.edu/catalog/em-9903-environmental-factors-affecting-plant-growth';
  const siSource='https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2022.982068/full';
  const generalSourceTitle='Oregon State University – Plant Nutrition';
  const siSourceTitle='Frontiers in Plant Science – Silicic Acid';
  const escapeHTML=engine.escapeHtml;
  const fmt=engine.fmt;

  function manufacturer(f){return String(f?.brand||'Eigene Dünger').trim()||'Eigene Dünger';}
  function nutrientPresent(f,key){
    if(!key)return true;
    const ref=f.referencePerUnit||f.perUnitNutrients||{};
    if(Number(ref[key])>0)return true;
    // Si / SiO₂: keine Schätzungen für nicht deklarierte Werte.
    if(key==='Si'||key==='SiO2'){
      const raw=f.declaredNutrients||f.values||{};
      return Number(raw[key])>0||(key==='Si'&&Number(raw.SiO2)>0)||(key==='SiO2'&&Number(raw.Si)>0);
    }
    const raw=f.declaredNutrients||f.values||{};
    const alternatives={P:['P','P2O5'],K:['K','K2O'],Ca:['Ca','CaO'],Mg:['Mg','MgO']};
    return (alternatives[key]||[key]).some(k=>Number(raw[k])>0);
  }
  function passes(f){return (!brand.value||manufacturer(f)===brand.value)&&nutrientPresent(f,nutrient.value);}
  window.KeimwerkV21Filter=passes;
  function resetFilters(){brand.value='';nutrient.value='';filtersChanged();}
  function filtersChanged(){
    const products=engine.getProducts().filter(f=>f.calculatorReady!==false);
    const filtered=products.filter(passes);
    status.textContent=`${filtered.length} von ${products.length} aktuell auswählbaren Produkten${filtered.length===0?' – Filter anpassen':''} (${engine.getProducts().length} insgesamt in der Datenbank).`;
    engine.refreshOpenMenu();
    // Vergleich aktualisieren, ohne ausgewählte Dosierungen zu ändern.
    engine.refreshComparison();
  }
  function populateBrands(){
    const current=brand.value;
    const names=[...new Set(engine.getProducts().filter(f=>f.calculatorReady!==false).map(manufacturer))]
      .sort((a,b)=>a.localeCompare(b,'de',{sensitivity:'base'}));
    brand.replaceChildren(new Option('Alle Hersteller',''));
    names.forEach(name=>brand.add(new Option(name,name)));
    if(names.includes(current))brand.value=current;
    filtersChanged();
  }
  brand.addEventListener('change',filtersChanged);
  nutrient.addEventListener('change',filtersChanged);
  $('kw21ResetFilters').addEventListener('click',resetFilters);

  function appendHelpTo(container,code){
    if(!container||container.querySelector('.kw21-nutrient-details'))return;
    const info=nutrients[code];if(!info)return;
    const details=document.createElement('details');details.className='kw21-nutrient-details';
    const head=document.createElement('summary');head.textContent='Wert verstehen';details.append(head);
    const p=document.createElement('p');p.textContent=info[1];details.append(p);
    const method=document.createElement('p');method.className='note';
    method.textContent=code==='Si'||code==='SiO2'?'Beide Werte beruhen auf derselben Siliziummenge und dürfen nicht addiert werden.':'mg/L beschreibt den berechneten Beitrag aus den hinterlegten Produkt- und Wasserwerten, nicht automatisch die Pflanzenaufnahme.';
    details.append(method);
    const a=document.createElement('a');
    a.href=code==='Si'||code==='SiO2'?siSource:generalSource;
    a.target='_blank';a.rel='noopener noreferrer';a.textContent='Fachquelle: '+(code==='Si'||code==='SiO2'?siSourceTitle:generalSourceTitle)+' ↗';
    details.append(a);container.append(details);
  }
  function renderNutrientHelp(){
    const boxes=summary.querySelectorAll('.nutrient');
    for(const box of boxes){const code=box.querySelector('[data-nutrient-link]')?.dataset.nutrientLink;
      if(code)appendHelpTo(box,code);
    }
    const silicate=$('silicateDetails');
    if(silicate&&!silicate.hidden){
      const cards=silicate.querySelectorAll('.summary-grid .nutrient');
      cards.forEach((box,i)=>appendHelpTo(box,i===0?'Si':'SiO2'));
    }
  }
  let pending=false;
  function scheduleRefresh(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;renderNutrientHelp();});}
  // Auch erneutes Antippen eines bereits fokussierten Suchfelds öffnet die Produktauswahl.
  list.addEventListener('click',event=>{const search=event.target.closest('[data-dose-search]');if(search&&search.getAttribute('aria-expanded')!=='true')engine.openSearchRow(search);});
  new MutationObserver(scheduleRefresh).observe(summary,{childList:true,subtree:false});
  new MutationObserver(scheduleRefresh).observe($('silicateDetails'),{childList:true,subtree:false,attributes:true,attributeFilter:['hidden']});

  // Reuse the EXISTING print-plan function and computed result object. No recomputation rules are added.
  function printSummary(){
    engine.renderPrintPlan();
    const r=engine.getResults(),area=$('printPlanArea');
    const liters=engine.getLiters();
    const sum={...r.sum};
    const known=['N','P','K','Ca','Mg','S','B','Cu','Fe','Mn','Mo','Zn'];
    for(const code of ['Si']){
      const contributing=r.details.filter(d=>d.dose>0&&Number(d.contribution[code])>0);
      if(contributing.length){sum[code]=contributing.reduce((t,d)=>t+Number(d.contribution[code]||0),0);known.push(code);}
    }
    const incomplete=code=>r.details.some(d=>d.dose>0&&Array.isArray(d.fert.knownNutrients)&&!d.fert.knownNutrients.includes(code));
    const labels={N:'Stickstoff (N)',P:'Phosphor (P)',K:'Kalium (K)',Ca:'Calcium (Ca)',Mg:'Magnesium (Mg)',S:'Schwefel (S)',B:'Bor (B)',Cu:'Kupfer (Cu)',Fe:'Eisen (Fe)',Mn:'Mangan (Mn)',Mo:'Molybdän (Mo)',Zn:'Zink (Zn)',Si:'Silizium (Si)',SiO2:'Siliziumdioxid (SiO₂)'};
    const rows=known.map(k=>`<tr><td>${labels[k]}</td><td>${fmt(Number(sum[k])||0,micronutrients.has(k)?2:1)} mg/L${incomplete(k)?' *':''}</td><td>${fmt((Number(sum[k])||0)*liters,micronutrients.has(k)?2:1)} mg</td></tr>`).join('');
    const div=document.createElement('section');div.className='kw21-print-nutrients';
    div.innerHTML=`<h2>Berechnete Nährstoffkonzentrationen</h2><p class="plan-section-intro">Aus den bereits angezeigten Keimwerk-Ergebnissen übernommen. Silizium wird nur als elementares Si ausgewiesen.</p><table><thead><tr><th>Nährstoff</th><th>Konzentration</th><th>Menge für ${fmt(liters,1)} L</th></tr></thead><tbody>${rows}</tbody></table><p class="kw21-print-note">* Mindestens bekannter Beitrag: Ein verwendetes Produkt hat für diesen Nährstoff keine vollständige Angabe. „0“ ist ohne vollständige Deklaration kein nachgewiesener Nullgehalt.</p><p class="kw21-print-note">Hinweis zur Datenqualität: Der Rechenwert hängt von Produktdeklaration, Flüssigdichte, Dosierung und Wasseranalyse ab. Die pflanzenverfügbare Menge wird nicht direkt gemessen. Prüfe Angaben anhand aktueller Herstellerdaten und deiner Wasserwerte.</p>`;
    area.append(div);
    window.print();
  }
  $('kwV21Print').addEventListener('click',printSummary);
  populateBrands();
  scheduleRefresh();
})();
