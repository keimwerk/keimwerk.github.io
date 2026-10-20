/* v2.4 – Querverweise ohne Datenaustausch mit Drittservern. */
(()=>{
 'use strict';
 const connections={
  // Links dienen der Orientierung, nicht einer Zusage zur Wirksamkeit in jeder Kultur.
  pests:{1:[1,2],2:[4,9],3:[5,6,10,11],4:[3,8],5:[3,7]},
  beneficials:{1:[1],2:[1],3:[4,5],4:[2],5:[3],6:[3],7:[5],8:[4],9:[2],10:[3],11:[3]}
 };
 const nutrientMap={'nutrient-profile-n':['nutrient-profile-s'],'nutrient-profile-p':['nutrient-profile-zn'],'nutrient-profile-k':['nutrient-profile-ca','nutrient-profile-mg'],'nutrient-profile-ca':['nutrient-profile-mg','nutrient-profile-k'],'nutrient-profile-mg':['nutrient-profile-ca','nutrient-profile-k'],'nutrient-profile-fe':['nutrient-profile-mn'],'nutrient-profile-mn':['nutrient-profile-fe'],'nutrient-silicon':['nutrient-silicates','nutrient-silica'],'nutrient-silicates':['nutrient-silicon','nutrient-silica'],'nutrient-silica':['nutrient-silicon','nutrient-silicates']};
 const findTitle=id=>document.getElementById(id)?.querySelector('h3')?.textContent.replace(/\s+/g,' ').trim()||'';
 function navigate(view,entry){
  if(typeof window.keimwerkNavigateView==='function')window.keimwerkNavigateView(view);
  else window.keimwerkShowPage?.(view);
  if(entry){
   const hash='#'+encodeURIComponent(entry);
   if(location.hash!==hash)location.hash=hash;
   else window.dispatchEvent(new HashChangeEvent('hashchange'));
   setTimeout(()=>{
    const target=document.getElementById(entry);
    if(!target)return;
    // Der Foto-Katalog öffnet Karten über seine eigene bestehende Hash-Navigation.
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
   },110);
  }
 }
 function link(view,entry,label){const a=document.createElement('a');a.href='../bereiche.html?view='+encodeURIComponent(view)+(entry?'&entry='+encodeURIComponent(entry):'');a.textContent=label;a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();navigate(view,entry)});return a;}
 function attach(article,title,links){if(!article||article.querySelector('.kw24-related'))return;const group=document.createElement('div');group.className='kw24-related';const strong=document.createElement('strong');strong.textContent=title;group.append(strong);const row=document.createElement('div');row.className='kw24-related-links';links.forEach(a=>row.append(a));group.append(row);const details=article.querySelector(':scope > .kw-lex-detail');(details||article).append(group);}
 function mount(){
  for(const [idx,target] of Object.entries(connections.pests)){
   const id='kw24-pests-'+idx,article=document.getElementById(id);
   if(!article)continue;
   attach(article,'Passende Nützlinge zum Nachlesen',target.map(i=>link('beneficials','kw24-beneficials-'+i,findTitle('kw24-beneficials-'+i)||'Nützling '+i)));
  }
  for(const [idx,target] of Object.entries(connections.beneficials)){
   const id='kw24-beneficials-'+idx,article=document.getElementById(id);
   if(!article)continue;
   attach(article,'Mögliche Zielschädlinge',target.map(i=>link('pests','kw24-pests-'+i,findTitle('kw24-pests-'+i)||'Schädling '+i)));
  }
  document.querySelectorAll('#nutrients article.nutrient-card').forEach(article=>{
   const links=[link('cannabis-finder',null,'Im Mängel-Finder prüfen ↗'),link('calculator',null,'Düngerrechner öffnen ↗')];
   (nutrientMap[article.id]||[]).forEach(id=>links.push(link('nutrients',id,(findTitle(id)||'Verwandter Nährstoff')+' ↗')));
   attach(article,'Verwandte Themen und Werkzeuge',links);
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0),{once:true});else setTimeout(mount,0);
 // Deep links from the public site and its searchable product catalog.
 const calculatorFrame=document.getElementById('calculator-frame');
 let pendingProduct='';
 const sendProduct=()=>{if(pendingProduct&&calculatorFrame?.contentWindow)calculatorFrame.contentWindow.postMessage({type:'kw24-open-product',product:pendingProduct},location.origin);};
 calculatorFrame?.addEventListener('load',()=>setTimeout(sendProduct,90));
 window.kw24OpenProduct=id=>{
  if(!/^KW-DNG-\d{5}$/.test(id))return;
  pendingProduct=id;
  navigate('calculator',null);
  setTimeout(sendProduct,200);
 };
 window.kw24OpenEntry=(view,entry)=>{
  if(!/^[a-z][a-z0-9-]{1,100}$/.test(String(entry||'')))return;
  navigate(view,entry);
 };
})();
