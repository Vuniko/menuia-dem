import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveVariants,guideCart,retrieveCatalog,recommendProducts} from './commercial-skills.mjs';
import {classifySalesIntent,createSalesPlan,respondWithSalesPlan} from './sales-orchestrator.mjs';
const c={business:{slug:'tienda-a',name:'Tienda A'},checkedAt:'2026-10-16T00:00:00.000Z',isDemonstration:false,categories:[{id:'ropa',name:'Ropa'}],
products:[{id:'p1',name:'Camisa',categoryId:'ropa',priceCents:12500,description:'Camisa básica'},{id:'p2',name:'Polo',categoryId:'ropa',priceCents:6500,description:'Polo básico'}],
variants:[{id:'v1',productId:'p1',priceCents:12500,stock:{quantity:2},attributes:{color:'negro',talla:'m'}},{id:'v2',productId:'p1',priceCents:12500,stock:{quantity:0},attributes:{color:'azul',talla:'m'}},{id:'v3',productId:'p1',priceCents:13000,stock:{quantity:1},attributes:{color:'negro',talla:'l'}},{id:'v4',productId:'p2',priceCents:6500,stock:{quantity:4},attributes:{color:'blanco',talla:'m'}}]};
test('resolveVariants matches chosen size+color on same available variant',()=>{
 const x=resolveVariants({catalog:c,state:{productId:'p1',color:'negro',size:'m'}});
 assert.equal(x.status,'available');assert.equal(x.selectedVariantId,'v1');assert.equal(x.items.length,1);
});
test('resolveVariants returns unavailable for exhausted combination',()=>{
 const x=resolveVariants({catalog:c,state:{productId:'p1',color:'azul',size:'m'}});
 assert.equal(x.status,'unavailable');assert.deepEqual(x.items,[]);
});
test('resolveVariants asks to choose when multiple variants exist',()=>{
 const x=resolveVariants({catalog:c,state:{productId:'p1',color:'negro'}});
 assert.equal(x.status,'choose_variant');assert.equal(x.selectedVariantId,null);assert.equal(x.items.length,2);
});
test('guideCart never modifies stock, adds an item or confirms checkout',()=>{
 const before=JSON.stringify(c);
 const x=guideCart({catalog:c,state:{productId:'p1',color:'negro',size:'m'}});
 assert.equal(x.status,'ready_for_product_page');assert.equal(x.canAdd,false);
 assert.equal(x.selectedVariantId,'v1');assert.match(x.answer,/No se realizó ninguna compra/);
 assert.equal(JSON.stringify(c),before);
});
test('guideCart requires an explicit variant if multiple are eligible',()=>{
 const x=guideCart({catalog:c,state:{productId:'p1'}});
 assert.equal(x.status,'choose_variant');assert.equal(x.selectedVariantId,undefined);
});
test('guideCart never recommends sold out variant',()=>{
 const x=guideCart({catalog:c,state:{productId:'p1',color:'azul',size:'m'}});
 assert.equal(x.status,'unavailable');assert.deepEqual(x.items,[]);
});
test('safe retrieval rejects a forged product name and price even with authentic IDs',()=>{
 const p={...c.products[0],name:'FORGED',priceCents:1};const v={...c.variants[0],stock:{quantity:999}};
 const x=retrieveCatalog({catalog:c,candidates:[{p,v}]});
 assert.equal(x.items[0].name,'Camisa');assert.equal(x.items[0].priceCents,12500);assert.equal(x.items[0].quantity,2);
});
test('recommendations reject foreign variant IDs and obey budget',()=>{
 const x=recommendProducts({catalog:c,candidates:[{p:c.products[0],v:c.variants[3]},{p:c.products[1],v:c.variants[3]}],state:{budget:7000}});
 assert.deepEqual(x.items.map(i=>i.productId),['p2']);
});
test('orchestrator safely routes variant and cart help',()=>{
 assert.equal(classifySalesIntent('¿Y en negro?',{productId:'p1'}),'variant');
 assert.equal(classifySalesIntent('Me lo llevo',{productId:'p1'}),'cart_help');
 const variant=createSalesPlan(c,'¿Y en negro?',[],null,{slug:'tienda-a',productId:'p1',size:'m'});
 assert.equal(variant.skill,'resolveVariants');
 const reply=respondWithSalesPlan(c,'¿Y en negro?',variant);
 assert.deepEqual(variant.skillResult.items.map(x=>x.variantId),['v1']);
 assert.ok(reply.answer.includes('Camisa'));
 const cart=createSalesPlan(c,'Me lo llevo',[],null,{slug:'tienda-a',productId:'p1',size:'m',color:'negro'});
 const response=respondWithSalesPlan(c,'Me lo llevo',cart);
 assert.deepEqual(response.products,['p1']);
 assert.equal(cart.skillResult.canAdd,false);
 assert.match(response.answer,/no confirma pedidos/i);
});
