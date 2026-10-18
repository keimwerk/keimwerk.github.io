/* Keimwerk v2.4: strukturierte Prüfung neuer Such-/Sicherungsfunktionen. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const index=JSON.parse(read('js/keimwerk-v24-search-index.json'));
const html=read('app/calculator.html');
const m=html.match(/const defaultFerts=(\[[^\n]*\]);/);
assert(m,'Produkt-Datenbank ist nicht auffindbar');
const products=JSON.parse(m[1]);assert.equal(products.length,227);
const ids=new Set(products.map(x=>x.id));assert.equal(ids.size,227);
const mapped=index.filter(x=>x.kind==='Düngerprodukt');assert.equal(mapped.length,227);
assert(mapped.every(x=>ids.has(x.product)),'Produkt-Suchtreffer ohne Datenbankreferenz');
const app=read('app/index.html'),lex=read('app/lexikon-v8.js');
for(const item of index){
 assert(typeof item.label==='string'&&item.label.length>0);
 assert(typeof item.view==='string'&&/^[a-z-]+$/.test(item.view));
 if(item.entry)assert(app.includes('id="'+item.entry+'"')||lex.includes('id="'+item.entry+'"'),item.entry);
}
assert(index.length>=280);
assert(read('js/keimwerk-v24.js').includes('keimwerk-browser-backup'));
assert(read('js/keimwerk-v24.js').includes('keimwerk-v24-personal-si-range'));
assert(read('app/index.html').includes('keimwerk-v24-links.js'));
assert(read('app/calculator.html').includes('calculator-v25.js'));
console.log('✓ v2.4: '+index.length+' Suchziele, 227 Düngerprodukte, Deep-Links und Sicherungsbereiche geprüft');
