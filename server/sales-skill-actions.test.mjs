import test from 'node:test';
import assert from 'node:assert/strict';
import {createSalesPlan,respondWithSalesPlan} from './sales-orchestrator.mjs';
const c={business:{slug:'tienda-a',name:'Tienda A'},checkedAt:'2026-10-16T00:00:00Z',isDemonstration:false,categories:[{id:'ropa',name:'Ropa'}],
 products:[{id:'p1',name:'Camisa',description:'Camisa',categoryId:'ropa',priceCents:12500}],
 variants:[{id:'v1',productId:'p1',priceCents:12500,attributes:{color:'negro',talla:'m'},stock:{quantity:2}},{id:'v2',productId:'p1',priceCents:13000,attributes:{color:'azul',talla:'l'},stock:{quantity:1}}]};
test('cart skill produces clickable product detail hint only after unique variant selection',()=>{
 const plan=createSalesPlan(c,'Me lo llevo',[],null,{slug:'tienda-a',productId:'p1',size:'m',color:'negro'});
 const result=respondWithSalesPlan(c,'Me lo llevo',plan);
 assert.equal(plan.skill,'guideCart');
 assert.deepEqual(result.nextAction,{type:'open_product',productId:'p1',variantId:'v1'});
 assert.equal(result.provider,'catalog');
});
test('does not suggest cart action if variant is ambiguous',()=>{
 const plan=createSalesPlan(c,'Me lo llevo',[],null,{slug:'tienda-a',productId:'p1'});
 const result=respondWithSalesPlan(c,'Me lo llevo',plan);
 assert.equal(result.nextAction,undefined);
});
test('does not suggest cart action for sold-out variants',()=>{
 const altered={...c,variants:[{...c.variants[0],stock:{quantity:0}}]};
 const plan=createSalesPlan(altered,'Me lo llevo',[],null,{slug:'tienda-a',productId:'p1',size:'m',color:'negro'});
 assert.equal(respondWithSalesPlan(altered,'Me lo llevo',plan).nextAction,undefined);
});
test('reference to another business is rejected',()=>{
 const plan=createSalesPlan(c,'Me lo llevo',[],null,{slug:'otra-tienda',productId:'p1'});
 assert.equal(respondWithSalesPlan(c,'Me lo llevo',plan).nextAction,undefined);
});
