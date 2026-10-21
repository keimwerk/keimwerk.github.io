/* Keimwerk V8 – Fotokatalog für die drei vorhandenen Lexika.
   Progressive Enhancement: alle Originaltexte/Bildreihen bleiben in den DOM-Elementen erhalten.
   Keine Änderungen an Rechner, Grow-Daten oder Speicherschlüsseln. */
(() => {
  'use strict';
  const configs = [
    {id:'pests', container:'.pest-grid', card:':scope > article.pest', name:'Schädlinge', singular:'SCHÄDLING'},
    {id:'beneficials', container:'.pest-grid', card:':scope > article.pest', name:'Nützlinge', singular:'NÜTZLING'},
    {id:'nutrients', container:'.nutrient-grid', card:':scope > article.nutrient-card', name:'Nährstoffe', singular:'NÄHRSTOFF'}
  ];
  const searchNormalize = value => String(value || '').toLocaleLowerCase('de').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  function el(tag, cls, txt) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (txt !== undefined) node.textContent = txt;
    return node;
  }
  const refs = {};
  function enhance(config) {
    const page=document.getElementById(config.id);
    const grid=page?.querySelector(config.container);
    if (!grid || grid.classList.contains('kw-lex-grid')) return;
    const articles=Array.from(grid.querySelectorAll(config.card));
    if (!articles.length) return;
    const toolbar=el('div','kw-lex-toolbar');
    const copy=el('div','kw-lex-toolbar-copy');
    copy.append(el('strong','', 'Entdecken & vergleichen'));
    const count=el('span','kw-lex-count',config.id==='nutrients'?`${articles.length} Lexikoneinträge · Details öffnen`:`${articles.length} ${config.name} · Foto auswählen, um Details zu sehen`);
    copy.append(count);
    const label=el('label','kw-lex-search-wrap');
    label.setAttribute('aria-label',`${config.name} durchsuchen`);
    label.append(el('span','kw-lex-search-symbol','⌕'));
    const input=el('input','kw-lex-search');
    input.type='search';input.placeholder=`${config.name} suchen …`;
    input.setAttribute('aria-label',`${config.name} suchen`);
    input.autocomplete='off';
    label.append(input);
    toolbar.append(copy,label);
    const empty=el('p','kw-lex-empty','Keine passenden Einträge gefunden. Versuche einen anderen Suchbegriff.');
    empty.hidden=true;
    grid.parentNode.insertBefore(toolbar,grid);
    grid.parentNode.insertBefore(empty,grid.nextSibling);

    let openArticle=null;
    function close(article,restoreFocus=false) {
      if (!article) return;
      const detail=article.querySelector(':scope > .kw-lex-detail');
      const trigger=article.querySelector(':scope > .kw-lex-trigger');
      if (!detail || !trigger) return;
      detail.hidden=true;
      article.classList.remove('kw-open');
      trigger.setAttribute('aria-expanded','false');
      if (openArticle === article) openArticle=null;
      if (restoreFocus) trigger.focus({preventScroll:true});
    }
    function open(article) {
      if (openArticle===article) return close(article);
      if (openArticle) close(openArticle);
      const detail=article.querySelector(':scope > .kw-lex-detail');
      const trigger=article.querySelector(':scope > .kw-lex-trigger');
      detail.hidden=false;
      article.classList.add('kw-open');
      trigger.setAttribute('aria-expanded','true');
      openArticle=article;
    }
    articles.forEach((article,index)=>{
      const heading=article.querySelector('h3');
      const title=heading?.textContent.trim().replace(/\s+/g,' ') || `Eintrag ${index+1}`;
      const descriptor=article.querySelector('.latin')?.textContent.trim().replace(/\s+/g,' ');
      const teaser=article.querySelector('.nutrient-intro')?.textContent.trim() ||
        (config.id==='beneficials' ? article.querySelector(':scope > p:not(.tip)')?.textContent.trim() : '') || descriptor || '';
      const firstImage=article.querySelector('img[src]');
      const fullText=searchNormalize(article.textContent+' '+firstImage?.getAttribute('alt'));
      article.dataset.kwLexSearch=fullText;
      article.classList.add('kw-lex-card');
      const detailId=`kw-lex-detail-${config.id}-${index+1}`;
      const detail=el('div','kw-lex-detail');
      detail.id=detailId;
      detail.hidden=true;
      // Move, never copy, original content. This preserves IDs and original information.
      while(article.firstChild) detail.appendChild(article.firstChild);
      const trigger=el('button','kw-lex-trigger');
      trigger.type='button';
      trigger.setAttribute('aria-expanded','false');
      trigger.setAttribute('aria-controls',detailId);
      trigger.setAttribute('aria-label',`${title}: Details ${config.id==='nutrients'?'zum Nährstoff':'zum Eintrag'} anzeigen`);
      const cover=el('span','kw-lex-cover');
      if(firstImage){
        const img=el('img');
        img.src=firstImage.getAttribute('src');
        img.alt=firstImage.getAttribute('alt') || title;
        img.loading=index<=3?'eager':'lazy';
        img.decoding='async';
        cover.append(img);
        if (config.id === 'nutrients' || config.id === 'beneficials' || config.id === 'pests') {
          cover.append(el('span','kw-lex-ai-label','KI-generierte Illustration'));
        }
      }else{
        const fallback=el('span','kw-lex-no-photo');
        fallback.append(el('span','kw-lex-no-icon','❧'),el('small','', article.dataset.kwTopic==='silicon'?'Fachwissen':'Kein Foto vorhanden'));
        cover.append(fallback);
      }
      const caption=el('span','kw-lex-caption');
      const info=el('span','kw-lex-caption-main');
      info.append(el('span','kw-lex-caption-label',article.dataset.kwTopic==='silicon'?'SILIZIUM-WISSEN':config.singular));
      info.append(el('h3','',title));
      if(teaser) info.append(el('p','',teaser));
      caption.append(info,el('span','kw-lex-arrow','+'));
      trigger.append(cover,caption);
      const originalHeading=detail.querySelector('h3');
      if(originalHeading){
        const intro=el('div','kw-lex-detail-intro');
        const latin=detail.querySelector('.latin');
        const headParent=originalHeading.parentNode;
        // In nutrient articles, both elements stay inside their existing head wrapper.
        if(headParent.classList.contains('nutrient-card-head')) headParent.classList.add('kw-lex-detail-intro');
        else {
          intro.append(originalHeading);
          if(latin) intro.append(latin);
          detail.prepend(intro);
        }
      }
      const dismiss=el('button','kw-lex-dismiss','↑ Details schließen');
      dismiss.type='button';
      dismiss.addEventListener('click',()=>close(article,true));
      detail.append(dismiss);
      article.append(trigger,detail);
      trigger.addEventListener('click',()=>open(article));
    });
    input.addEventListener('input',()=>{
      const q=searchNormalize(input.value.trim());
      let found=0;
      for(const article of articles){
        const matches=article.dataset.kwLexSearch.includes(q);
        article.hidden=!matches;
        if (!matches && article===openArticle) close(article);
        if (matches) found++;
      }
      count.textContent=config.id==='nutrients'?`${found} von ${articles.length} Lexikoneinträgen`:`${found} von ${articles.length} ${config.name} · Foto auswählen, um Details zu sehen`;
      empty.hidden=found!==0;
    });
    grid.classList.add('kw-lex-grid');
    refs[config.id]={page,articles,open};
  }
  function enhanceNutrientReference(){
    const page=document.getElementById('nutrients');
    const grid=page?.querySelector('.nutrient-grid.kw-lex-grid');
    if(!page || !grid) return;
    const parent=grid.parentNode;
    const caution=el('p','kw-lex-caution','Bildbeispiele geben Hinweise, sind aber keine sichere Diagnose. pH, Wurzelzustand, Wasserwerte und andere Ursachen immer mit prüfen.');
    parent.insertBefore(caution,grid.nextSibling);
    const details=el('details','kw-lex-reference');
    details.append(el('summary','', 'Ratgeber & Hintergrundwissen ansehen'));
    const content=el('div','kw-lex-reference-content');
    for(const selector of ['.nutrient-toc','.nutrient-guidance','.nutrient-warning','.nutrient-extra','.nutrient-source']){
      const node=page.querySelector(':scope > '+selector);
      if(node) content.append(node);
    }
    details.append(content);
    parent.insertBefore(details,caution.nextSibling);
    refs.nutrients.reference=details;
  }
  function ensureAnchorOpen(){
    const hash=decodeURIComponent(window.location.hash||'').slice(1);
    if(!hash) return;
    const target=document.getElementById(hash);
    if (!target) return;
    if(refs.nutrients?.reference && refs.nutrients.reference.contains(target)) refs.nutrients.reference.open=true;
    for(const entry of Object.values(refs)){
      const a=target.closest('article.kw-lex-card');
      if(a && entry.articles.includes(a)){
        a.hidden=false;
        entry.open(a);
        break;
      }
    }
  }
  // V2: zusätzliche Siliziumthemen, ohne die zwölf Originalprofile zu verändern.
  // Vor dem Foto-Katalog ergänzen, damit Suche, Kartenansicht und Anker weiter funktionieren.
  function addSiliconKnowledge(){
    const page=document.getElementById('nutrients');
    const grid=page?.querySelector('.nutrient-grid');
    if(!page || !grid || page.querySelector('#nutrient-silicates'))return;
    grid.insertAdjacentHTML('beforeend', String.raw`<article class="nutrient-card" id="nutrient-silicon" data-kw-topic="silicon">
 <div class="nutrient-card-head"><h3>Silizium <span>(Si)</span></h3><div class="latin">Nützliches Element · kein klassisch essenzieller Nährstoff für die meisten Arten</div></div>
 <p class="nutrient-intro">Si ist die chemische Bezeichnung für Silizium. In Keimwerk wird der Siliziumgehalt als elementare Masse in mg/L angegeben.</p>
 <div class="nutrient-detail"><strong>Was bedeutet Si im Düngerrechner?</strong><p>Si zeigt den rechnerischen Massenanteil des Elements Silizium – unabhängig davon, in welcher Verbindung es im Produkt vorliegt. Bei einer eindeutigen Angabe als SiO₂-Äquivalent lässt sich daraus Si berechnen: <strong>Si = SiO₂ × 0,4674</strong>. Si und SiO₂ beschreiben dieselbe Siliziummenge auf zwei unterschiedlichen Massenbasen und dürfen nicht addiert werden.</p></div>
 <div class="nutrient-detail"><strong>Wie nehmen Pflanzen Silizium auf?</strong><p>Wurzeln nehmen Silizium überwiegend in Form gelöster Monokieselsäure (H₄SiO₄, auch Si(OH)₄) auf. Die Umwandlung von Silikatverbindungen in diese gelöste Form hängt von Löslichkeit und Bedingungen im Wurzelraum ab. Ein berechneter Si-Wert garantiert deshalb weder vollständige Löslichkeit noch Pflanzenverfügbarkeit.</p></div>
 <div class="nutrient-detail"><strong>Welche Wirkung ist möglich?</strong><p>Silizium kann bei einigen Pflanzenarten Zell- und Gewebefestigkeit sowie Reaktionen auf bestimmte abiotische und biotische Stressfaktoren beeinflussen. Die Effekte hängen stark von Pflanzenart, Si-Aufnahme und Anbaubedingungen ab. Silizium gilt für die meisten Kulturpflanzen nicht als klassischer essenzieller Nährstoff; eindeutige, universelle Si-Mangelsymptome gibt es nicht.</p></div>
 <div class="nutrient-detail"><strong>Si, SiO₂ und Silikatsalze unterscheiden</strong><p>Bei dem rechnerischen Beispiel mit 1 g/L Produkt, 84 % Silikatsalzen und darin 43 % SiO₂-Äquivalent wären dies <strong>840 mg/L Silikatsalze</strong>, <strong>361,2 mg/L SiO₂-Äquivalent</strong> und <strong>168,8 mg/L Si</strong>. Diese Größen sind nicht austauschbar. Der Si-Wert gilt nur, wenn die Bezugsgröße der 43-%-Angabe eindeutig stimmt.</p></div>
 <div class="nutrient-detail nutrient-tip"><strong>Praxis-Hinweis</strong><p>Keine pauschale Si-Mangeldiagnose allein aus einem Blattbild ableiten. Bei Siliziumpräparaten auf die Herstellerangaben, die verwendete chemische Form und den pH-Einfluss achten. Besonders konzentrierte lösliche Silikate können alkalisch sein.</p></div>
 <div class="nutrient-detail"><strong>Fachquellen</strong><p><a href="https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.697592/full" target="_blank" rel="noopener noreferrer">Frontiers in Plant Science: Silizium in Pflanzen (2021)</a> · <a href="https://academic.oup.com/pcp/article/63/1/4/6374750" target="_blank" rel="noopener noreferrer">Plant and Cell Physiology: Silizium als nützliches Element (2022)</a>.</p></div>
</article>
<article class="nutrient-card" id="nutrient-silicates" data-kw-topic="silicon">
 <div class="nutrient-card-head"><h3>Silikate <span>(Silikatsalze)</span></h3><div class="latin">Siliziumverbindungen · Zusatzstoffe</div></div>
 <p class="nutrient-intro">Silikatsalze sind nicht dasselbe wie reines Silizium: Sie enthalten Silizium, Sauerstoff und meist weitere Bestandteile.</p>
 <div class="nutrient-detail"><strong>Was sind Silikate?</strong><p>Unter Silikaten versteht man eine große Gruppe silizium- und sauerstoffhaltiger Verbindungen. Silikatminerale können zusätzlich beispielsweise Kalium, Calcium, Magnesium oder Aluminium enthalten. Ein Silikatdünger kann eine Mischung verschiedener Verbindungen sein. Aus einer Angabe wie „84 % Silikatsalze“ lässt sich der Gehalt an elementarem Silizium (Si) deshalb nicht direkt bestimmen.</p></div>
 <div class="nutrient-detail"><strong>Aufnahme und Verfügbarkeit</strong><p>Viele Silikatminerale lösen sich nur langsam. Pflanzen nehmen Silizium vor allem als gelöste Monokieselsäure (Orthokieselsäure, H₄SiO₄ beziehungsweise Si(OH)₄) auf. Wie viel Silizium tatsächlich verfügbar wird, hängt unter anderem von der Verbindung, ihrer Löslichkeit, dem pH-Wert und den Bedingungen im Wurzelraum ab. Silikatsalze im Produkt sind kein direkter Messwert für pflanzenverfügbares Silizium.</p></div>
 <div class="nutrient-detail"><strong>Mögliche Wirkung an Pflanzen</strong><p>Silizium kann bei manchen Pflanzenarten zur Stabilität von Gewebe und zur Bewältigung bestimmter Stresssituationen beitragen. Die Wirkung ist je nach Art und Kulturbedingungen unterschiedlich. Ein allgemeingültiges, sicher am Blatt erkennbares „Silikatmangelbild“ existiert nicht. Silizium wird für die meisten Pflanzen nicht zu den klassischen essenziellen Nährstoffen gezählt.</p></div>
 <div class="nutrient-detail"><strong>So liest du 84 % Silikatsalze</strong><p>Bei einem festen Produkt mit 84 % Silikatsalzen ergeben 1,0 g Produkt je Liter rechnerisch <strong>840 mg/L Silikatsalze</strong>. Bei 0,5 g/L sind es 420 mg/L. Das beschreibt ausschließlich die Masse dieser Produktfraktion: weder 840 mg/L reines Si noch 840 mg/L gelöstes, pflanzenverfügbares Si. Die übrigen 16 % gehören zur restlichen Produktzusammensetzung.</p></div>
 <div class="nutrient-detail nutrient-tip"><strong>Praxis-Hinweis</strong><p>Wasserlösliche Silikatkonzentrate, etwa auf Kaliumsilikatbasis, können stark alkalisch sein und den pH-Wert beeinflussen. Konzentrierte Düngerlösungen nie wahllos zusammenmischen: Es können Ausfällungen entstehen. Etikett beachten, getrennt ins Wasser dosieren und anschließend pH sowie gegebenenfalls EC prüfen. Keine pauschale Silikat-Zieldosierung aus dem Prozentwert ableiten.</p></div>
 <div class="nutrient-detail"><strong>Fachquellen</strong><p><a href="https://pubmed.ncbi.nlm.nih.gov/38484684/" target="_blank" rel="noopener noreferrer">Übersichtsarbeit zur Verfügbarkeit von Silizium in Böden und Düngern (2024)</a> · <a href="https://digitalcommons.usu.edu/cpl_nutrients/9/" target="_blank" rel="noopener noreferrer">Utah State University: Löslichkeit von Kaliumsilikat</a> · <a href="https://extension.missouri.edu/publications/g6984" target="_blank" rel="noopener noreferrer">University of Missouri: Nährlösungen richtig mischen</a>.</p></div>
</article>
<article class="nutrient-card" id="nutrient-silica" data-kw-topic="silicon">
 <div class="nutrient-card-head"><h3>Siliziumdioxid <span>(SiO₂)</span></h3><div class="latin">Silica / Kieselsäureanhydrid · Oxidverbindung</div></div>
 <p class="nutrient-intro">SiO₂ ist eine Verbindung aus Silizium und Sauerstoff. Die Angabe „SiO₂-Äquivalent“ ist nicht dasselbe wie gelöstes Silizium.</p>
 <div class="nutrient-detail"><strong>Was ist Siliziumdioxid?</strong><p>Siliziumdioxid besteht chemisch aus einem Silizium- und zwei Sauerstoffatomen (SiO₂). Es kommt zum Beispiel in kristalliner Form als Quarz sowie in amorphen Formen vor. Besonders kristallines SiO₂ ist in Wasser schlecht löslich. Wie viel davon in pflanzenaufnehmbare Monokieselsäure (H₄SiO₄) übergeht, hängt von der Stoffform und den Umweltbedingungen ab.</p></div>
 <div class="nutrient-detail"><strong>Si, SiO₂ und Silikatsalze richtig unterscheiden</strong><p><strong>Si</strong> bezeichnet elementares Silizium als Rechengröße. <strong>SiO₂</strong> bezeichnet dessen Dioxid beziehungsweise bei Düngerangaben häufig ein rechnerisches SiO₂-Äquivalent. <strong>Silikatsalze</strong> bezeichnen vollständige Verbindungen oder Mischungen, in denen weitere Elemente enthalten sein können. Ein und dieselbe Siliziummenge darf nicht als Si und SiO₂ zusammengerechnet werden.</p></div>
 <div class="nutrient-detail"><strong>Umrechnung zwischen Si und SiO₂</strong><p>Die molaren Massen betragen näherungsweise 28,085 g/mol für Si und 60,083 g/mol für SiO₂. Daher gilt: <strong>Si (mg/L) = SiO₂ (mg/L) × 0,4674</strong> und <strong>SiO₂ (mg/L) = Si (mg/L) × 2,1394</strong>. Diese Umrechnung gilt nur, wenn eine tatsächliche SiO₂-Menge beziehungsweise ein eindeutig definiertes SiO₂-Äquivalent vorliegt. Sie sagt nichts darüber aus, wie viel davon der Pflanze sofort zur Verfügung steht.</p></div>
 <div class="nutrient-detail"><strong>Beispiel: 84 % Silikatsalze und 43 % SiO₂</strong><p><em>Nur wenn</em> ausdrücklich belegt ist, dass die Silikatsalze selbst 43 % SiO₂-Äquivalent enthalten, ergibt sich für das Gesamtprodukt: 84 % × 43 % = <strong>36,12 % SiO₂-Äquivalent</strong>. Bei 1 g/L Produkt entspräche das 361,2 mg/L SiO₂-Äquivalent beziehungsweise etwa 168,8 mg/L Si. Die 840 mg/L Silikatsalze sind eine andere Bezugsgröße. Ist die Deklaration von „43 %“ unklar, darf diese Rechnung nicht als gesicherter Produktwert verwendet werden.</p></div>
 <div class="nutrient-detail nutrient-tip"><strong>Praxis-Hinweis</strong><p>Ein hoher SiO₂-Wert bedeutet nicht automatisch eine hohe Aufnahme durch die Pflanzen. Es kommt auf Löslichkeit, Freisetzung als Monokieselsäure und artspezifische Aufnahme an. SiO₂-Äquivalent und elementares Si nicht addieren und nicht mit der gesamten Silikatsalzmasse verwechseln.</p></div>
 <div class="nutrient-detail"><strong>Fachquellen</strong><p><a href="https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.697592/full" target="_blank" rel="noopener noreferrer">Frontiers in Plant Science: Siliziumaufnahme und Wechselwirkungen (2021)</a> · <a href="https://academic.oup.com/pcp/article/63/1/4/6374750" target="_blank" rel="noopener noreferrer">Plant and Cell Physiology: Nutzen und offene Fragen bei Silizium (2022)</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/38484684/" target="_blank" rel="noopener noreferrer">Pflanzenverfügbares Silizium (2024)</a>.</p></div>
</article>`);
    const headline=page.querySelector('.subhead .pill');
    if(headline)headline.textContent='12 Nährstoffprofile · 3 Silizium-Themen';
    const toc=page.querySelector('.nutrient-toc-links');
    if(toc){
      const link=el('a','', 'Silizium (Si), Silikate & Siliziumdioxid (SiO₂)');
      link.href='#nutrient-silicon';
      const profiles=toc.querySelector('a[href="#nutrient-jump-profiles"]');
      if(profiles)profiles.insertAdjacentElement('afterend',link);
      else toc.append(link);
    }
  }
  // Öffnet eine konkrete Lexikonkarte aus dem eingebetteten Düngerrechner.
  // Auch eine vorher aktive Suche darf den Treffer nicht verstecken.
  function openNutrientArticle(id){
    const page=document.getElementById('nutrients');
    const target=document.getElementById(id);
    const group=refs.nutrients;
    if(!page||!target||!group||!group.articles.includes(target))return false;
    const input=page.querySelector('.kw-lex-search');
    if(input && input.value){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}
    target.hidden=false;
    // Already-open cards must stay open when a nutrient link is clicked again.
    if(target.querySelector(':scope > .kw-lex-detail')?.hidden)group.open(target);
    target.scrollIntoView({behavior:'smooth',block:'start'});
    return true;
  }
  window.keimwerkOpenNutrientEntry=openNutrientArticle;
  function init(){
    addSiliconKnowledge();
    configs.forEach(enhance);
    enhanceNutrientReference();
    ensureAnchorOpen();
    window.addEventListener('hashchange',ensureAnchorOpen);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
