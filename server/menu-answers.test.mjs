import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {menuAnswer,budgetOptions} from './menu-answers.mjs';
import {mentionedProducts} from '../assets/menu-model.mjs';
const sample=JSON.parse(await readFile(new URL('../assets/demo-menu.json',import.meta.url),'utf8'));
const types={beer:'cerveza',food:'comida',drink:'sin alcohol'};
const products=sample.products.map(p=>[p.name,p.price,types[p.categoryId],p.description]);
process.env.GEMINI_API_KEY='synthetic-test-credential';process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='menuia-test.vercel.app';
const {default:handler}=await import('../api/chat.mjs');
test('actual endpoint lists all beers after product context and resolves budgets without model calls',async()=>{
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No model call expected');};
 try{for(const message of ['Qué cervezas tienen','Qué puedo pedir por S/40']){const res={headersSent:false,writeHead(code){this.code=code;this.headersSent=true},end(raw){this.data=JSON.parse(raw)}};
 await handler({method:'POST',headers:{origin:'https://menuia-test.vercel.app'},socket:{remoteAddress:'catalog-'+Math.random()},body:{message,history:[{role:'user',content:'Qué tiene Stout'},{role:'assistant',content:'Stout S/20'}]}},res);
 assert.equal(res.code,200);assert.equal(res.data.provider,'reglas');if(message.includes('cervezas'))assert.equal(mentionedProducts(res.data.answer,sample.products).length,4);
 }assert.equal(calls,0);}finally{globalThis.fetch=previous;}
});
for(const question of ['¿Qué cervezas tienen?','Qué cervezas tienes','¿Qué cervezas?','cervezas','Muéstrame todas las cervezas','Cuáles son las opciones de cerveza','Qué cervezas disponibles hay','Qué cervezas ofrecés'])test('all four beers: '+question,()=>{
 const answer=menuAnswer(question,products);assert.ok(answer,question);const cards=mentionedProducts(answer,sample.products);assert.equal(cards.length,4);assert.deepEqual(new Set(cards.map(p=>p.name)),new Set(['IPA artesanal','Golden Ale','Stout','Red Ale']));for(const p of cards)assert.ok(answer.includes('S/ '+p.price.toFixed(2)));
});
test('all four alcohol-free drinks and all four dishes are enumerated from the source',()=>{
 for(const [q,category]of [['Qué bebidas sin alcohol tienen','drink'],['Muestra todos los platos','food']]){const cards=mentionedProducts(menuAnswer(q,products),sample.products);assert.equal(cards.length,4);assert.ok(cards.every(p=>p.categoryId===category));}
 assert.equal(mentionedProducts(menuAnswer('Muéstrame toda la carta',products),sample.products).length,12);
 assert.equal(mentionedProducts(menuAnswer('Qué cervezas y bebidas sin alcohol tienen',products),sample.products).length,8);
});
test('a beer-only budget lists every affordable beer, without food substitutions',()=>{
 const cards=mentionedProducts(menuAnswer('Qué cervezas puedo comprar por S/20',products),sample.products);assert.equal(cards.length,4);assert.ok(cards.every(p=>p.categoryId==='beer'&&p.price<=20));
});
test('budget calculations never suggest an over-budget option and handle cents',()=>{
 for(const amount of [10,17,20,26,30,40,45,50,100,40.5]){const options=budgetOptions(products,amount);for(const option of options){assert.ok(option.total<=Math.round(amount*100));assert.equal(option.total,option.items.reduce((n,p)=>n+p.cost,0));}}
 const answer=menuAnswer('¿Qué puedo pedir por S/40?',products);assert.match(answer,/Total S\/ /);assert.doesNotMatch(answer,/te faltar|pasarias|S\/ 45\.00/);assert.ok(menuAnswer('Tengo S/8',products).includes('No hay una opción'));
});
test('preferences and dietary uncertainty keep their existing specialized handling',()=>{
 for(const q of ['Quiero una cerveza suave','¿Qué cerveza me recomendás?','Qué puedo comer sin gluten por S/40','¿Hay opciones veganas?','Cuánto cuesta IPA artesanal'])assert.equal(menuAnswer(q,products),null,q);
 const answer=menuAnswer('Qué cervezas sin alcohol tienen',products);assert.match(answer,/No hay cervezas sin alcohol registradas/);assert.ok(mentionedProducts(answer,sample.products).every(p=>p.categoryId==='drink'));
 assert.match(menuAnswer('Quiero una cerveza sin alcohol por S/20',products),/No hay cervezas sin alcohol registradas/);
});
