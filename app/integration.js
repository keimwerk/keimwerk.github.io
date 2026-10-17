"use strict";
(()=>{
  const pages={
    calculator:'calculator', diary:'grow-diary', profiles:'grow-diary',
    'grow-analysis':'grow-analysis', 'cannabis-finder':'cannabis-finder',
    pests:'pests', beneficials:'beneficials', nutrients:'nutrients',
    'knowledge-network':'knowledge-network','knowledge-assistant':'knowledge-assistant',
    about:'about',contact:'contact'
  };
  const supported=new Set(Object.keys(pages));
  const initial=new URLSearchParams(location.search).get('view');
  const initialView=supported.has(initial)?initial:'calculator';
  let current=null, mounted=false, measurePending=false, previousHeight=0;
  const parentOrigin=location.origin;
  const report=(payload)=>{if(window.parent!==window)window.parent.postMessage(payload,parentOrigin);};

  function measure(){
    const section=document.getElementById(pages[current]||'calculator');
    if(!section || section.hidden)return;
    // Hidden pages must not contribute to iframe height.
    const height=Math.max(520,Math.ceil(section.getBoundingClientRect().bottom+window.scrollY+24));
    if(Math.abs(height-previousHeight)>12){previousHeight=height;report({type:'kw-integrated-height',height});}
  }
  function scheduleMeasure(){
    if(measurePending)return;
    measurePending=true;
    requestAnimationFrame(()=>{measurePending=false;measure();});
  }
  function showError(message){
    let alert=document.getElementById('kw-module-error');
    if(!alert){
      alert=document.createElement('div');
      alert.id='kw-module-error';
      alert.setAttribute('role','alert');
      alert.style.cssText='max-width:920px;margin:25px auto;padding:24px;background:#402524;color:#fff;border:1px solid #a86b62;border-radius:12px;font:16px/1.6 Arial,sans-serif';
      document.body.prepend(alert);
    }
    alert.textContent=message;
    report({type:'kw-integrated-error',message});
  }
  function switchTo(view){
    if(!supported.has(view)||!mounted)return;
    const pageId=pages[view];
    const target=document.getElementById(pageId);
    if(!target){showError('Der Bereich '+view+' fehlt in dieser lokalen Kopie.');return;}

    // Preserve the original application's event listeners (and calculator iframe
    // lazy init). But never rely on its routing alone: enforce the correct page
    // even when older scripts or internal back buttons leave "home" active.
    if(typeof window.keimwerkShowPage==='function'){
      try { window.keimwerkShowPage(view==='profiles'?'diary':view); }
      catch(error) { console.error('Originalnavigation:',error); }
    }

    const home=document.getElementById('home');
    if(home)home.hidden=true;
    for(const section of document.querySelectorAll('main.page')){
      section.hidden=section!==target;
    }
    // Correctly initialize lazy calculator even if its old controller failed.
    if(view==='calculator'){
      const calculatorFrame=document.getElementById('calculator-frame');
      if(calculatorFrame && calculatorFrame.dataset.loaded!=='true'){
        calculatorFrame.src='calculator.html';
        calculatorFrame.dataset.loaded='true';
      }
    }

    document.body.classList.toggle('kw-profiles-view',view==='profiles');
    document.body.classList.toggle('kw-diary-view',view==='diary');
    document.body.classList.add('kw-integrated');
    document.body.dataset.activeModule=view;
    // Grow-Profile live inside the original diary main, but ONLY the
    // requested subview is shown. Do not click a hidden navigation control.
    const profilePanel=document.getElementById('grow-profile-panel');
    if(profilePanel && (view==='profiles'||view==='diary')){
      profilePanel.hidden=view!=='profiles';
    }
    const moduleError=document.getElementById('kw-module-error');
    if(moduleError)moduleError.remove();
    current=view;
    previousHeight=0;
    scheduleMeasure();
    report({type:'kw-integrated-switched',view});
  }
  function mount(){
    if(mounted)return;
    mounted=true;
    document.body.classList.add('kw-integrated');
    document.getElementById('welcome-overlay')?.setAttribute('hidden','');
    // The source application's script has already been parsed by DOMContentLoaded.
    switchTo(initialView);
    if(!current){showError('Das Modul konnte nicht initialisiert werden.');return;}
    report({type:'kw-integrated-ready',view:current});
    setTimeout(scheduleMeasure,180);
    setTimeout(scheduleMeasure,700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==parentOrigin||!event.data)return;
    if(event.data.type==='kw-switch-view')switchTo(event.data.view);
    else if(event.data.type==='kw-parent-hello'){
      report({type:'kw-integrated-ready',view:current});scheduleMeasure();
    }
  });
  window.addEventListener('resize',scheduleMeasure,{passive:true});
  window.addEventListener('load',scheduleMeasure,{once:true});
  if('ResizeObserver' in window)new ResizeObserver(scheduleMeasure).observe(document.body);
  // Read-only diagnostic useful when testing a local ZIP, no network traffic.
  window.keimwerkModuleState=()=>({view:current,visible:[...document.querySelectorAll('main.page')].filter(el=>!el.hidden).map(el=>el.id)});
})();
