import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverNeeds,retrieveCatalog,recommendProducts,compareProducts,handleObjection,executeCommercialSkill} from './commercial-skills.mjs';
import {createSalesPlan,respondWithSalesPlan} from './sales-orchestrator.mjs';

const catalog={business:{slug:'tienda-a',name:'Tienda A'},checkedAt:'2026-10-16T00:00:00Z',isDemonstration:false,categories:[{id:'ropa',name:'Ropa'}],products:[
{id:'p1',name:'Polo negro',description:'Algodón',categoryId:'ropa',priceCents:9000},
{id:'p2',name:'Polo azul',description:'Algodón',categoryId:'ropa',priceCents:14000},
{id:'p3',name:'Casaca',description:'Casaca resistente',categoryId:'ropa',priceCents:19000}],
variants:[
{id:'v1',productId:'p1',priceCents:9000,attributes:{color:'negro',talla:'m'},stock:{quantity:3}},
{id:'v2',productId:'p2',priceCents:14000,attributes:{color:'azul',talla:'l'},stock:{quantity:2}},
{id:'v3',productId:'p3',priceCents:19000,attributes:{color:'negro',talla:'m'},stock:{quantity:0}}]};
const candidates=catalog.products.map(p=>({p,v:catalog.variants.find(v=>v.productId===p.id)}));
test('discovery asks one useful next question',()=>{
 const result=discoverNeeds({catalog,state:{}});
 assert.equal(result.skill,'discoverNeeds');assert.match(result.nextQuestion,/producto|usar/);
});
test('retrieval excludes depleted products and preserves published facts',()=>{
 const result=retrieveCatalog({catalog,candidates});
 assert.deepEqual(result.items.map(i=>i.productId),['p1','p2']);
 assert.equal(result.items[0].priceCents,9000);
 assert.equal(result.items[0].quantity,3);
});
test('recommendation respects budget and stock without invented choices',()=>{
 const result=recommendProducts({catalog,candidates,state:{budget:10000}});
 assert.deepEqual(result.items.map(x=>x.productId),['p1']);
});
test('comparison prints only prices and variant attributes of listed products',()=>{
 const result=compareProducts({catalog,candidates,requestedIds:['p1','p2']});
 assert.equal(result.complete,true);
 assert.match(result.answer,/Polo negro/);
 assert.match(result.answer,/Polo azul/);
 assert.match(result.answer,/S\/90/);
 assert.doesNotMatch(result.answer,/Casaca/);
});
test('comparison never returns unlisted or exhausted variants',()=>{
 const result=compareProducts({catalog,candidates,requestedIds:['p1','p3']});
 assert.equal(result.complete,false);
 assert.equal(result.items.length,1);
});
test('price objection provides cheaper alternatives from same category',()=>{
 const result=handleObjection({catalog,candidates,state:{productId:'p2'},message:'Más barato'});
 assert.equal(result.type,'price');
 assert.deepEqual(result.items.map(x=>x.productId),['p1']);
});
test('unknown skill is not executed',()=>{assert.equal(executeCommercialSkill('arbitraryFunction',{catalog}),null);});
test('orchestrator integrates comparison output into verified cards',()=>{
 const plan=createSalesPlan(catalog,'Compará Polo negro y Polo azul');
 assert.equal(plan.skill,'compareProducts');
 assert.equal(plan.skillResult.complete,true);
 const reply=respondWithSalesPlan(catalog,'Compará Polo negro y Polo azul',plan);
 assert.deepEqual(reply.products,['p1','p2']);
 assert.deepEqual(reply.variantIds,['v1','v2']);
});
