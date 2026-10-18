/* v2.4: Ein gefundenes Düngerprodukt als zusätzliche Zeile übernehmen.
   Benutzt die bestehenden Rechenfunktionen unverändert. */
(()=>{
 'use strict';
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='kw24-open-product')return;
  const product=String(event.data.product||'');
  if(!/^KW-DNG-\d{5}$/.test(product))return;
  try{
   const candidate=fertilizers.find(f=>f.id===product&&f.calculatorReady!==false);
   if(!candidate)return;
   const existing=doses.find(d=>d.fertId===product);
   if(!existing){
    if(doses.length===1&&Number(doses[0].dose)===0){doses[0].fertId=product;}
    else doses.push({fertId:product,dose:0});
    renderDoseRows();updateAll();
   }
   document.getElementById('doseRows')?.scrollIntoView({behavior:'smooth',block:'center'});
   const idx=doses.findIndex(d=>d.fertId===product);
   document.querySelector(`[data-dose-value="${idx}"]`)?.focus({preventScroll:true});
  }catch(e){console.warn('Produktsuche: Auswahl nicht möglich',e);}
 });
})();
