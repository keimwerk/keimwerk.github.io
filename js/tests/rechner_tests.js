// Keimwerk v2.2: automated regression tests. Run with: node tests/rechner_tests.js
// Parses the SAME functions and records that the browser calculator uses.
'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const vm=require('node:vm');
const root=join(__dirname,'..');
const calcHtml=readFileSync(join(root,'app/calculator.html'),'utf8');
const database=readFileSync(join(root,'app/duengerdatenbank_keimwerk.json'));
const fingerprints=JSON.parse(readFileSync(join(__dirname,'calculation-fingerprints.json'),'utf8'));
function segment(start,end){const a=calcHtml.indexOf(start);const b=calcHtml.indexOf(end,a+start.length);assert(a>=0&&b>a,`Bereich fehlt: ${start} / ${end}`);return calcHtml.slice(a,b);}
const spans={
 defaultFerts:segment('const defaultFerts=','\nlet fertilizers='),
 waterContrib:segment('function waterContrib(){','// Silizium (Si)'),
 silicatePerUnit:segment('function silicatePerUnit(','function withSilicates('),
 withSilicates:segment('function withSilicates(','function hasActiveSilicates('),
 fertilizerContribution:segment('function fertilizerContribution(','function calc(){'),
 calc:segment('function calc(){','function renderSummary(')
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [key,original] of Object.entries(fingerprints.spans)){
 assert.equal(sha(spans[key]),original,`Berechnungslogik/Datensatz geändert: ${key}`);
}
assert.equal(sha(database),fingerprints.databaseJson,'Dünger-Datenbank-Datei wurde verändert');
console.log('✓ SHA-256: alle Originalfunktionen und Produktdaten unverändert');
const ions=segment('const waterIons=','const defaultFerts=');
const keys=['N','P','K','Ca','Mg','S','B','Cu','Fe','Mn','Mo','Zn'];
let inputs={};
const documentMock={querySelector(selector){const id=selector.startsWith('#')?selector.slice(1):selector;return inputs[id]||{value:'0'};}};
const context={Math,Number,Object,document:documentMock,console};vm.createContext(context);
const calculationCode=`
const keys=${JSON.stringify(keys)};
const $=(selector)=>document.querySelector(selector);
function number(el){const n=parseFloat(el?.value);return Number.isFinite(n)?n:0;}
${segment('const oxidation=','const defaultFerts=')}
${spans.defaultFerts}
${segment('const SI_IN_SIO2=','function silicatePerUnit(')}
${spans.silicatePerUnit}
${spans.withSilicates}
${spans.fertilizerContribution}
${spans.waterContrib}
let doses=[];let fertilizers=defaultFerts;let currentResults=null;
function fert(id){return fertilizers.find(x=>x.id===id)||fertilizers[0];}
${spans.calc}
function setDoses(d){doses=d;}
({defaultFerts,waterIons,fertilizerContribution,waterContrib,calc,setDoses});
`;
const engine=vm.runInContext(calculationCode,context);
const {defaultFerts,fertilizerContribution,waterContrib,calc,setDoses,waterIons}=engine;
assert.equal(defaultFerts.length,227);
console.log('✓ 227 Düngerprodukte vorhanden');
const terra=defaultFerts.find(x=>x.id==='KW-DNG-00226');
assert(terra&&terra.name==='Terra Aquatica Silicate');
function approx(actual,expected,delta=0.001){assert(Math.abs(actual-expected)<=delta,`Erwartet ${expected}, erhalten ${actual}`);}
for(const [dose,si,sio2] of [[0,0,0],[0.25,42.209,90.3],[0.5,84.419,180.6],[1,168.837,361.2],[2,337.675,722.4]]){
 const x=fertilizerContribution(terra,dose);
 approx(x.Si,si);approx(x.SiO2,sio2);
}
const t=fertilizerContribution(terra,1);
approx(t.Ca,96.239);approx(t.Mg,17.788);approx(t.Fe,24);approx(t.S,4);
console.log('✓ Terra Aquatica: Si und SiO₂ weiterhin getrennt; Ca, Mg, Fe, S korrekt');
const haifa=defaultFerts.find(x=>x.id==='KW-DNG-00154');
assert(haifa);approx(fertilizerContribution(haifa,1).Si,200);approx(fertilizerContribution(haifa,1).SiO2,428);
console.log('✓ Zweites Siliziumprodukt unverändert');
const liquid=defaultFerts.find(x=>x.state==='liquid'&&x.referencePerUnit&&x.referencePerUnit.N>0);
assert(liquid);
const expectedN=Number((liquid.referencePerUnit.N*1.25).toFixed(3));
approx(fertilizerContribution(liquid,1.25).N,expectedN);
console.log('✓ Flüssigdünger mit vorhandenen Referenzkoeffizienten');
function water(ca,mg,dilution=0,unit='mg'){
 inputs={'ion-Ca':{value:String(ca)},'ion-Mg':{value:String(mg)},'dilution':{value:String(dilution)}};
 for(const i of waterIons){if(!inputs['ion-'+i.key])inputs['ion-'+i.key]={value:'0'};inputs['unit-'+i.key]={value:unit};}
 inputs.stage={value:'veg'};
 return waterContrib();
}
let w=water(43,6.9);
approx(w.nutrients.Ca,43);approx(w.nutrients.Mg,6.9);
w=water(43,6.9,25);approx(w.nutrients.Ca,32.25);approx(w.nutrients.Mg,5.175);
w=water(1,1,0,'mmol');approx(w.nutrients.Ca,40.078);approx(w.nutrients.Mg,24.305);
console.log('✓ Wasserwerte, RO-Verdünnung und mmol/L-Umrechnung');
water(0,0);setDoses([{fertId:terra.id,dose:1}]);
const r=calc();approx(r.details[0].contribution.Si,168.837);approx(r.sum.Ca,96.239);
console.log('✓ Gesamtrechnung: Düngergaben und Wasserwerte unverändert');
console.log('ERGEBNIS: Alle Tests bestanden.');
