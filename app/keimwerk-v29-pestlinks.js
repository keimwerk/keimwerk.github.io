/* Keimwerk v2.9: kommentierte Gegenspieler-Links in vorhandenen Lexikon-Karten.
   Kein chemischer oder biologischer Behandlungsvorschlag; Eignung ist bedingungsabhängig. */
(()=>{
 'use strict';
 const pairs={
  1:[{i:1,n:'Phytoseiulus persimilis',why:'Spezialist gegen Spinnmilben'},{i:2,n:'Neoseiulus californicus',why:'Alternative gegen Spinnmilben'}],
  2:[{i:9,n:'Steinernema feltiae',why:'Gegen Trauermückenlarven im Substrat'},{i:4,n:'Stratiolaelaps scimitus',why:'Boden-Raubmilbe gegen Trauermückenlarven'}],
  3:[{i:6,n:'Aphidius colemani',why:'Parasitierung geeigneter Blattlausarten'},{i:5,n:'Florfliegenlarven',why:'Fressen Blattläuse'},{i:10,n:'Marienkäfer und Larven',why:'Fressen Blattläuse'},{i:11,n:'Schwebfliegenlarven',why:'Fressen Blattläuse'}],
  4:[{i:8,n:'Orius laevigatus',why:'Frisst Thripse in mehreren Stadien'},{i:3,n:'Amblyseius swirskii',why:'Vor allem gegen junge Thripslarven'}],
  5:[{i:7,n:'Encarsia formosa',why:'Parasitierung bestimmter Weißer-Fliegen-Arten'},{i:3,n:'Amblyseius swirskii',why:'Frisst Eier und junge Stadien unter passenden Bedingungen'}],
  10:[{i:3,n:'Amblyseius swirskii',why:'Kann frühe Breitmilbenstadien bejagen'}]
 };
 const page=document.getElementById('pests');
 const beneficials=document.getElementById('beneficials');
 if(!page||!beneficials)return;
 const openBeneficial=i=>{
  const target=document.getElementById('kw24-beneficials-'+i);
  if(!target)return;
  if(typeof window.keimwerkShowPage==='function')window.keimwerkShowPage('beneficials');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const search=beneficials.querySelector('.kw-lex-search');
   if(search?.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
   target.hidden=false;
   const trigger=target.querySelector(':scope > .kw-lex-trigger');
   if(trigger?.getAttribute('aria-expanded')!=='true')trigger?.click();
   target.scrollIntoView({behavior:'smooth',block:'start'});
  }));
 };
 for(let pest=1;pest<=12;pest++){
  const target=document.getElementById('kw24-pests-'+pest);
  if(!target)continue;
  const detail=target.querySelector(':scope > .kw-lex-detail')||target;
  const box=document.createElement('section');box.className='kw29-counterparts';
  const title=document.createElement('h4');title.textContent='Passende Nützlinge im Keimwerk-Lexikon';box.append(title);
  const candidates=pairs[pest]||[];
  if(candidates.length){
   const description=document.createElement('p');description.textContent='Mögliche biologische Gegenspieler. Entscheidend sind Schädlingsart, Entwicklungsstadium und Einsatzbedingungen.';box.append(description);
   const list=document.createElement('div');list.className='kw29-counterpart-list';
   for(const candidate of candidates){
    const btn=document.createElement('button');btn.type='button';btn.className='kw29-counterpart-link';
    const name=document.createElement('strong');name.textContent=candidate.n+' ↗';
    const why=document.createElement('small');why.textContent=candidate.why;
    btn.append(name,why);btn.addEventListener('click',()=>openBeneficial(candidate.i));
    list.append(btn);
   }box.append(list);
  } else {
   const note=document.createElement('p');note.textContent='Im derzeitigen Nützlingslexikon ist kein ausreichend spezifischer Gegenspieler für diesen Eintrag hinterlegt. Das bedeutet nicht, dass es keine biologischen Verfahren gibt.';box.append(note);
  }
  const note=document.createElement('p');note.className='kw29-counterpart-caution';note.textContent='Keine Behandlungsempfehlung: Wirksamkeit hängt von Art, Temperatur, Luftfeuchte, Entwicklungsstadium und Anwendungsbedingungen ab. Angaben von Fachanbietern beachten.';box.append(note);
  const dismiss=detail.querySelector(':scope > .kw-lex-dismiss');
  if(dismiss)detail.insertBefore(box,dismiss);else detail.append(box);
 }
})();
