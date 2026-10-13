import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {filterProducts,mentionedProducts,safeImage,productQuestion,validateMenu,localAssistantOrigin} from '../assets/menu-model.mjs';
const menu=JSON.parse(await readFile(new URL('../assets/demo-menu.json',import.meta.url),'utf8'));
test('illustrative prices and names match the unchanged server source exactly',async()=>{
 const server=await readFile(new URL('./index.js',import.meta.url),'utf8');const from=server.indexOf('const products='),to=server.indexOf('const recent=',from);const ctx=vm.createContext({});vm.runInContext(server.slice(from,to)+'\nglobalThis.catalog=products;',ctx);
 assert.equal(menu.products.length,12);assert.equal(menu.promotions.length,0);assert.equal(menu.demo,true);
 for(const p of menu.products){const row=ctx.catalog.find(r=>r[0].toLocaleLowerCase('es')===p.name.toLocaleLowerCase('es'));assert.ok(row,p.name);assert.equal(p.price,row[1],p.name)}
});
test('search combines category and accent-insensitive names without modifying source',()=>{
 assert.equal(filterProducts(menu.products,{search:'  LIMONADA  '})[0].price,10);
 assert.equal(filterProducts(menu.products,{category:'beer',search:'clasica'}).length,0);
 assert.equal(filterProducts(menu.products,{search:'clasica'}).length,1);
 assert.equal(filterProducts(menu.products,{category:'beer'}).length,4);
 assert.equal(menu.products.length,12);
});
test('response cards use source products and prices; exhausted and unknown products excluded',()=>{
 const products=[{id:'a',name:'Stout',stock:'verificado',price:20},{id:'b',name:'IPA',stock:'agotado',price:19}];
 assert.deepEqual(mentionedProducts('Stout por S/1; IPA; producto inventado',products).map(p=>[p.id,p.price]),[['a',20]]);
 assert.equal(mentionedProducts('Stouts inventadas',products).length,0);
});
test('product context identifies the selected source record without claiming ingredients',()=>{
 const question=productQuestion(menu.products[0]);assert.match(question,/Hamburguesa clásica/);assert.ok(question.length<=500);assert.doesNotMatch(question,/Carne|cheddar/);
});
test('images reject javascript, insecure remote hosts and embedded credentials',()=>{
 const origin='http://127.0.0.1:8813';assert.equal(safeImage('javascript:alert(1)',origin),null);assert.equal(safeImage('http://evil.invalid/photo',origin),null);assert.equal(safeImage('https://user:pass@evil.invalid/photo',origin),null);assert.ok(safeImage('/assets/stout.svg',origin));assert.ok(safeImage('https://images.unsplash.com/photo',origin));
});
test('bad connected data fails closed rather than silently substituting sample data',()=>{
 assert.throws(()=>validateMenu({business:{name:'Invalid'},products:[],categories:[]}));assert.throws(()=>validateMenu({...menu,products:[{...menu.products[0],price:-1}]}));assert.throws(()=>validateMenu({...menu,products:[{...menu.products[0],categoryId:'foreign'}]}));assert.equal(validateMenu(menu),menu);
 for(const price of [null,true,'',Infinity])assert.throws(()=>validateMenu({...menu,products:[{...menu.products[0],price}]}));
});
test('optional local connection keeps the legacy setting but rejects unsafe destinations',()=>{
 assert.equal(localAssistantOrigin('https://demo.trycloudflare.com/'),'https://demo.trycloudflare.com');
 for(const value of ['javascript:alert(1)','http://example.invalid','https://user:pass@example.invalid','https://example.invalid/api/chat','https://example.invalid/?key=x','https://example.invalid/#x'])assert.equal(localAssistantOrigin(value),null);
});
