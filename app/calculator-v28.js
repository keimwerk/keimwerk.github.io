/* Keimwerk v2.8: lesende Visualisierung der vorhandenen Nährstoffberechnung.
   Ändert weder Dosierungen noch Produktkoeffizienten oder die 16 Modellpunkte. */
(()=>{
 'use strict';
 const bridge=window.KeimwerkV21Bridge;
 const model=window.KeimwerkWeeklyOrientation;
 const anchor=document.getElementById('kw27-target-panel');
 const summary=document.getElementById('summary');
 if(!bridge||!model||!anchor||!summary)return;
 const keys=['N','P','K','Ca','Mg','S'];
 const names={N:'Stickstoff',P:'Phosphor',K:'Kalium',Ca:'Calcium',Mg:'Magnesium',S:'Schwefel'};
 const fmt=n=>Number(n).toLocaleString('de-DE',{maximumFractionDigits:2});
 const NS='http://www.w3.org/2000/svg';
 const svgEl=(name,attrs={})=>{const node=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));return node;};
 const section=document.createElement('section');section.id='kw28-visual';section.className='kw28-visual';
 section.setAttribute('aria-labelledby','kw28-visual-title');
 section.innerHTML=`<div class="kw28-visual-head"><div><h3 id="kw28-visual-title">Nährstoffverlauf im Vergleich</h3><p class="note">16 Wochen des Keimwerk-Modells und deine tatsächlich berechnete Nährstoffkonzentration; keine experimentell bestätigte Bedarfskurve.</p></div><label for="kw28-nutrient-select">Nährstoff ansehen<select id="kw28-nutrient-select">${keys.map(k=>`<option value="${k}">${names[k]} (${k})</option>`).join('')}</select></label></div>
 <div class="kw28-legend"><span><i class="kw28-legend-target"></i>Modellverlauf</span><span><i class="kw28-legend-actual"></i>Berechnet (konstant als Vergleichslinie)</span><span><i class="kw28-legend-week"></i>Ausgewählte Woche</span></div>
 <div class="kw28-svg-frame"><svg id="kw28-week-svg" role="img" aria-label="Verlauf der Modellwerte und berechnete Konzentration in 16 Wochen" viewBox="0 0 920 295" preserveAspectRatio="xMidYMid meet"></svg></div><p class="kw28-scroll-hint">Diagramm seitlich wischen, um alle 16 Wochen zu sehen →</p>
 <p id="kw28-reading" class="kw28-reading" aria-live="polite"></p>
 <details class="kw28-contributions"><summary>Woher kommt der berechnete Wert?</summary><p class="note">Einzelbeiträge aus der vorhandenen Berechnung, einschließlich Wasser. Unvollständig deklarierte Produktwerte können den bekannten Beitrag unterschätzen.</p><div id="kw28-contribution-bars"></div></details>
 <p class="note kw28-source">Die Linie verbindet die 16 benutzerseitig festgelegten Modellpunkte. Ihre Form sowie insbesondere hohe Kaliumwerte sind keine allgemein validierten Düngeempfehlungen. Der berechnete Istwert stammt unverändert aus dem Düngerrechner.</p>`;
 anchor.parentNode.insertBefore(section,anchor);
 const select=document.getElementById('kw28-nutrient-select');
 const svg=document.getElementById('kw28-week-svg');
 const frame=section.querySelector('.kw28-svg-frame');
 const reading=document.getElementById('kw28-reading');
 const bars=document.getElementById('kw28-contribution-bars');
 const labels={N:'N',P:'P',K:'K',Ca:'Ca',Mg:'Mg',S:'S'};
 function render(){
  const r=bridge.getResults();if(!r?.sum)return;
  const k=select.value,week=model.weekNumber(),data=Array.from({length:16},(_,i)=>Number(model.forWeek(i+1)[k])||0);
  const actual=Math.max(0,Number(r.sum[k])||0),target=data[week-1];
  const max=Math.max(1,actual,...data)*1.16;
  const W=920,H=295,left=66,right=22,top=22,bottom=47;
  const xx=i=>left+i*(W-left-right)/15;
  const yy=n=>top+(max-n)*(H-top-bottom)/max;
  svg.replaceChildren();
  // four horizontal reference bands; labels use SVG text (not data HTML).
  for(let i=0;i<=4;i++){
   const value=max*i/4, y=yy(value);
   svg.append(svgEl('line',{x1:left,x2:W-right,y1:y,y2:y,class:'kw28-grid'}));
   const label=svgEl('text',{x:left-9,y:y+4,'text-anchor':'end',class:'kw28-axis-label'});
   label.textContent=fmt(value);svg.append(label);
  }
  const boundary=(xx(7)+xx(8))/2;
  svg.append(svgEl('line',{x1:boundary,x2:boundary,y1:top,y2:H-bottom,class:'kw28-boundary'}));
  for(let i=0;i<16;i++){
   const label=svgEl('text',{x:xx(i),y:H-bottom+23,'text-anchor':'middle',class:'kw28-axis-label'});
   label.textContent=String(i+1);svg.append(label);
  }
  const title=svgEl('title');title.textContent=`${names[k]} in mg/L. Gewählte Woche ${week}: Modell ${fmt(target)}, berechnet ${fmt(actual)}.`;svg.append(title);
  svg.append(svgEl('line',{x1:left,x2:W-right,y1:yy(actual),y2:yy(actual),class:'kw28-actual-line'}));
  const selectedX=xx(week-1);
  svg.append(svgEl('line',{x1:selectedX,x2:selectedX,y1:top,y2:H-bottom,class:'kw28-week-line'}));
  const poly=svgEl('polyline',{points:data.map((v,i)=>`${xx(i)},${yy(v)}`).join(' '),class:'kw28-target-line'});svg.append(poly);
  svg.append(svgEl('circle',{cx:selectedX,cy:yy(target),r:7,class:'kw28-target-point'}));
  svg.append(svgEl('circle',{cx:selectedX,cy:yy(actual),r:6,class:'kw28-actual-point'}));
  // Mobile: den Marker der gewählten Woche ins sichtbare Diagramm rücken.
  if(frame.scrollWidth>frame.clientWidth){
   const center=selectedX*(svg.getBoundingClientRect().width/W);
   frame.scrollLeft=Math.max(0,center-frame.clientWidth/2);
  }
  const delta=actual-target;
  reading.textContent=`${names[k]} · Woche ${week}: Modell ${fmt(target)} mg/L, berechnet ${fmt(actual)} mg/L, Abweichung ${delta>=0?'+':''}${fmt(delta)} mg/L. Das ist ein Vergleich, keine Diagnose.`;
  const entries=[{name:'Ausgangswasser',n:Number(r.water?.nutrients?.[k])||0,known:true},...r.details.filter(d=>Number(d.dose)>0).map(d=>({name:String(d.fert?.name||'Ausgewählter Dünger'),n:Number(d.contribution?.[k])||0,known:!Array.isArray(d.fert?.knownNutrients)||d.fert.knownNutrients.includes(k)}))];
  bars.replaceChildren();
  const scale=Math.max(1,...entries.map(item=>item.n));
  for(const item of entries){
   const entry=document.createElement('div');entry.className='kw28-contribution-row';
   const name=document.createElement('span');name.className='kw28-contribution-name';name.textContent=item.name+(item.known?'':' *');
   const track=document.createElement('span');track.className='kw28-contribution-track';
   const fill=document.createElement('span');fill.className='kw28-contribution-fill';fill.style.width=`${Math.min(100,Math.max(0,item.n/scale*100))}%`;track.append(fill);
   const n=document.createElement('strong');n.textContent=`${fmt(item.n)} mg/L`;entry.append(name,track,n);bars.append(entry);
  }
  if(entries.some(x=>!x.known)){
   const note=document.createElement('p');note.className='note';note.textContent='* Der Hersteller deklariert diesen Nährstoff nicht vollständig. 0 mg/L bedeutet dann nicht zwangsläufig, dass keiner enthalten ist.';bars.append(note);
  }
 }
 let pending=false;
 function queue(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render();});}
 select.addEventListener('change',render);
 document.getElementById('kw27-week')?.addEventListener('change',queue);
 new MutationObserver(queue).observe(summary,{childList:true});
 render();
})();
