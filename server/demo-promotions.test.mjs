import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {demoPromotions} from './promotion-catalog.mjs';
import {promotionSummary} from '../assets/promotion-model.mjs';
import {menuAnswer} from './menu-answers.mjs';
const menu=JSON.parse(await readFile(new URL('../assets/demo-menu.json',import.meta.url),'utf8'));
const types={food:'comida',beer:'cerveza',drink:'sin alcohol'};
const products=menu.products.map(p=>[p.name,p.price,types[p.categoryId],p.description]);
test('exactly two demo offers share valid product references, prices and savings between UI and server',()=>{
 assert.equal(demoPromotions.length,2);
 const backend=demoPromotions.map(p=>promotionSummary(p,products)),frontend=demoPromotions.map(p=>promotionSummary(p,menu.products));assert.deepEqual(backend,frontend);
 assert.deepEqual(backend.map(p=>[p.price,p.originalTotal,p.savings]),[[39,45,6],[25,29,4]]);assert.ok(backend.every(p=>p.validityLabel.includes('demo')));
});
test('promotion questions list both configured offers and do not invent 2x1 or happy hour',()=>{
 const answer=menuAnswer('Qué promociones tienen',products,{promotions:demoPromotions});for(const p of demoPromotions){assert.ok(answer.includes(p.title));assert.ok(answer.includes('S/ '+p.price.toFixed(2)));}
 assert.match(menuAnswer('Hay 2x1',products,{promotions:demoPromotions}),/No hay happy hour ni 2x1/);
});
test('budget offers fit the amount and alcohol-free selection never receives beer',()=>{
 const low=menuAnswer('Qué puedo pedir por S/30',products,{promotions:demoPromotions});assert.match(low,/Combo refrescante/);assert.doesNotMatch(low,/Combo cervecero/);assert.match(low,/Te quedan S\/ 5\.00/);
 const both=menuAnswer('Qué puedo pedir por S/40',products,{promotions:demoPromotions});assert.match(both,/Combo cervecero/);assert.match(both,/Combo refrescante/);
 assert.doesNotMatch(menuAnswer('Promos sin alcohol',products,{promotions:demoPromotions}),/Golden Ale/);
 assert.doesNotMatch(menuAnswer('Qué cerveza puedo comprar por S/20',products,{promotions:demoPromotions}),/Hamburguesa/);
});
test('selected promotion and immediate follow-up stay on the chosen combo without bypassing restrictions',()=>{
 const opts={promotions:demoPromotions};
 for(const question of ['¿Qué incluye la promoción Combo cervecero?','Cuánto cuesta Combo cervecero','Cuánto ahorro con Combo cervecero']){const answer=menuAnswer(question,products,opts);assert.match(answer,/Combo cervecero/);assert.match(answer,/39\.00/);assert.doesNotMatch(answer,/Combo refrescante/);}
 const answer=menuAnswer('¿Y cuánto cuesta?',products,{...opts,history:[{role:'user',content:'Qué incluye Combo refrescante'}]});assert.match(answer,/25\.00/);assert.doesNotMatch(answer,/Combo cervecero/);
 assert.match(menuAnswer('Combo cervecero por S/30',products,opts),/supera tu presupuesto/);
 assert.doesNotMatch(menuAnswer('Combo cervecero sin alcohol',products,opts),/Golden Ale/);
 assert.doesNotMatch(menuAnswer('Combo cervecero',products,{...opts,history:[{role:'user',content:'Soy menor de edad'}]}),/Golden Ale/);
 assert.equal(menuAnswer('Qué incluye',products,opts),null);
});
test('minor context excludes alcoholic offers; inactive, invalid and unknown-item promotions are discarded',()=>{
 const answer=menuAnswer('Tienen promos',products,{promotions:demoPromotions,history:[{role:'user',content:'Soy menor de edad'}]});assert.match(answer,/Combo refrescante/);assert.doesNotMatch(answer,/Golden Ale/);
 const p=demoPromotions[0];for(const invalid of [{...p,active:false},{...p,price:-1},{...p,price:100},{...p,items:[{name:'Foreign',quantity:1}]},{...p,items:[{name:'Golden Ale',quantity:0}]}])assert.equal(promotionSummary(invalid,products),null);
});
test('real endpoint and Gemini prompt consume the same canonical offer data',async()=>{
 process.env.GEMINI_API_KEY='synthetic-test-credential';process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='menuia-test.vercel.app';
 const {default:handler}=await import('../api/chat.mjs');const {default:check}=await import('../api/gemini-check.mjs');
 const req={method:'POST',headers:{origin:'https://menuia-test.vercel.app'},socket:{remoteAddress:'promo-fixture'},body:{message:'Tienen promociones'}};
 const response=()=>({headersSent:false,writeHead(code){this.code=code;this.headersSent=true},end(raw){this.data=JSON.parse(raw)}});
 const res=response();await handler(req,res);assert.equal(res.code,200);assert.equal(res.data.provider,'reglas');assert.match(res.data.answer,/Combo cervecero/);assert.match(res.data.answer,/Combo refrescante/);
 const previous=globalThis.fetch;let prompt='';globalThis.fetch=async(u,o)=>{prompt=JSON.parse(o.body).systemInstruction.parts[0].text;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Promociones de ejemplo registradas.'}]}}]})}};
 try{const forced=response();await check({...req,body:{message:'Contame las ofertas'}},forced);assert.equal(forced.code,200);assert.equal(forced.data.provider,'gemini');assert.match(prompt,/Combo cervecero/);assert.match(prompt,/39\.00/);assert.match(prompt,/Combo refrescante/);assert.match(prompt,/25\.00/);assert.doesNotMatch(prompt,/stock, horarios, promociones y grado/);}finally{globalThis.fetch=previous;}
});
