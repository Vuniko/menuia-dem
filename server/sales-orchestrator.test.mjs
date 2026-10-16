import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySalesIntent,createSalesPlan,respondWithSalesPlan} from './sales-orchestrator.mjs';

const catalog={
 business:{id:'tenant-a',slug:'tienda-a',name:'Tienda A'},
 checkedAt:'2026-10-16T15:00:00.000Z',
 isDemonstration:false,
 categories:[{id:'ropa',name:'Ropa'},{id:'tecnologia',name:'Tecnología'}],
 products:[
  {id:'p1',name:'Polo negro',description:'Polo básico',categoryId:'ropa',priceCents:9000},
  {id:'p2',name:'Polo azul',description:'Polo cómodo',categoryId:'ropa',priceCents:14000},
  {id:'p3',name:'Audífonos',description:'Auriculares',categoryId:'tecnologia',priceCents:17000}
 ],
 variants:[
  {id:'v1',productId:'p1',priceCents:9000,attributes:{color:'negro',talla:'m'},stock:{quantity:3}},
  {id:'v2',productId:'p2',priceCents:14000,attributes:{color:'azul',talla:'m'},stock:{quantity:4}},
  {id:'v3',productId:'p3',priceCents:17000,attributes:{},stock:{quantity:0}}
 ]
};
test('discovers needs instead of refusing an open buying request',()=>{
 const plan=createSalesPlan(catalog,'Quiero comprar algo');
 assert.equal(plan.intent,'discovery');
 assert.equal(plan.skill,'discoverNeeds');
 const reply=respondWithSalesPlan(catalog,'Quiero comprar algo',plan);
 assert.equal(reply.provider,'catalog');
 assert.match(reply.answer,/presupuesto|buscas/i);
});
test('routes price objections to verified available alternatives',()=>{
 const plan=createSalesPlan(catalog,'Algo más barato',[],null,{slug:'tienda-a',productId:'p2'});
 assert.equal(plan.skill,'handleObjection');
 assert.deepEqual(plan.eligible.map(x=>x.p.id),['p1']);
 assert.deepEqual(respondWithSalesPlan(catalog,'Algo más barato',plan).products,['p1']);
});
test('keeps stock and budget bound to the same variant',()=>{
 const plan=createSalesPlan(catalog,'Busco ropa hasta 100 soles');
 assert.ok(plan.eligible.every(({v})=>v.stock.quantity>0));
 assert.ok(plan.eligible.every(({p,v})=>(v.priceCents??p.priceCents)<=10000));
 assert.deepEqual(plan.eligible.map(x=>x.p.id),['p1']);
});
test('rejects malformed catalog',()=>{
 assert.throws(()=>createSalesPlan(null,'Hola'),/Catálogo/);
});
test('does not accept stale memory from another tenant',()=>{
 const plan=createSalesPlan(catalog,'Hola',[],null,{slug:'otra-tienda',budget:100,productId:'p3'});
 assert.equal(plan.state.budget,undefined);
 assert.equal(plan.state.productId,undefined);
});
test('routes product detail and comparison intents',()=>{
 assert.equal(classifySalesIntent('¿Cuánto cuesta?',{productId:'p1'}),'product_detail');
 assert.equal(classifySalesIntent('¿Cuál es la diferencia?'),'compare');
 assert.equal(classifySalesIntent('¿Y en negro?',{productId:'p1'}),'variant');
});
