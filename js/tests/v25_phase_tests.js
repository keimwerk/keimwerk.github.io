/* Keimwerk v2.5: Nährstoff-Ampelphasen und exakte Ca:Mg-Bewertung.
   Die mg/L-Rechenformeln werden separat durch rechner_tests.js geschützt. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app/calculator.html'),'utf8');
const code=fs.readFileSync(path.join(root,'app/calculator-v26.js'),'utf8');
const start=html.indexOf('const kw25MicroTargets=');
const end=html.indexOf('const oxidation=',start);
assert(start>=0&&end>start);
const targets=vm.runInNewContext(html.slice(start,end)+'\n({ranges,kw25MicroTargets});');
const r=JSON.parse(JSON.stringify(targets.ranges));
assert.deepEqual(Object.keys(r),['veg_early','veg_late','flower_early','flower_late']);
assert.deepEqual(r.veg_early,{N:[100,160],P:[20,35],K:[60,140],Ca:[70,120],Mg:[25,45],S:[30,60],B:[.1,.5],Cu:[.02,.19],Fe:[1.2,4],Mn:[.6,1],Mo:[.01,.03],Zn:[.12,.4]});
assert.deepEqual(r.veg_late,{...r.veg_early,N:[160,200],P:[25,40],K:[60,200],Ca:[90,150],Mg:[35,55],S:[40,80]});
assert.deepEqual(r.flower_early,{...r.veg_early,N:[160,230],P:[40,70],K:[120,160],Ca:[90,160],Mg:[35,60],S:[40,100]});
assert.deepEqual(r.flower_late,{...r.veg_early,N:[90,130],P:[40,80],K:[145,200],Ca:[91,119],Mg:[65,85],S:[50,180]});
for(const id of Object.keys(r))assert(html.includes(`<option value="${id}">`));
assert(html.includes("s.stage==='veg'?'veg_late':s.stage==='gen'?'flower_early'"),'Alte veg/gen-Importe werden nicht mehr abgebildet');
assert(html.includes('calculator-v26.css')&&html.includes('calculator-v26.js'));
const mockSummary={after(){}};
const window={KeimwerkV21Bridge:{}};
const document={getElementById(id){return id==='summary'?mockSummary:null;}};
const context={window,document,Number,Math,BigInt};
const pure=code.slice(0,code.indexOf('const panel=document.createElement'))+'})();';
vm.runInNewContext(pure,context);
const api=window.KeimwerkCaMgAssessment;
assert(api&&typeof api.assess==='function');
const scenarios=[['veg_early',105,30,3.5],['veg_late',116,40,2.9],['flower_early',124,40,3.1],['flower_late',105,75,1.4]];
for(const [id,ca,mg,expected] of scenarios){
  const result=api.assess(id,ca,mg);
  assert.equal(result.status,'exact');
  assert.equal(result.ratio,expected);
  assert(result.caInRange&&result.mgInRange);
  assert.equal(api.assess(id,ca+10,mg).status,'high');
  assert.equal(api.assess(id,ca-10,mg).status,'low');
}
assert.equal(api.assess('flower_late',105,0).status,'undefined');
assert.equal(api.assess('flower_late',105,75.0001).status,'low','Keine +/- Verhältnis-Toleranz erlaubt');
assert.equal(api.assess('flower_late',105,74.9999).status,'high','Keine +/- Verhältnis-Toleranz erlaubt');
assert.equal(api.assess('flower_late',105,75,true,true).missingCa,true);
console.log('✓ v2.5: vier Cannabis-Zieltabellen, Zielverhältnisse und exakte Ampelzustände geprüft');
console.log('✓ v2.5: alte veg/gen-Schemata werden geladen, beide Si-Berechnungen bleiben durch Rechentests geschützt');
