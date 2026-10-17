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
    const count=el('span','kw-lex-count',`${articles.length} ${config.name} · Foto auswählen, um Details zu sehen`);
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
      }else{
        const fallback=el('span','kw-lex-no-photo');
        fallback.append(el('span','kw-lex-no-icon','❧'),el('small','', 'Kein Foto vorhanden'));
        cover.append(fallback);
      }
      const caption=el('span','kw-lex-caption');
      const info=el('span','kw-lex-caption-main');
      info.append(el('span','kw-lex-caption-label',config.singular));
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
      count.textContent=`${found} von ${articles.length} ${config.name} · Foto auswählen, um Details zu sehen`;
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
  function init(){
    configs.forEach(enhance);
    enhanceNutrientReference();
    ensureAnchorOpen();
    window.addEventListener('hashchange',ensureAnchorOpen);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
