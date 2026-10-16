import test from 'node:test';
import assert from 'node:assert/strict';
import {demonstrationCatalog} from './demonstration-catalog.mjs';
import {publicCatalog,createCommercialHandler} from './commercial.mjs';
test('public demonstration explicitly identifies fictitious data and uses production origin',async()=>{const c=publicCatalog(demonstrationCatalog(),'menuia-demo');assert.equal(c.isDemonstration,true);assert.ok(c.products.length);assert.match(c.business.description,/ficticios/);const h=createCommercialHandler({env:{VERCEL_ENV:'production'},fetcher:async()=>new Response(JSON.stringify(demonstrationCatalog()))});const r={setHeader(){},end(s){this.data=JSON.parse(s)}};await h({method:'POST',url:'/api/commercial',headers:{origin:'https://menuia-dem.vercel.app','content-type':'application/json'},body:{slug:'menuia-demo',message:'que productos tienen'}},r);assert.equal(r.statusCode,200);assert.equal(r.data.catalog.isDemonstration,true);assert.ok(r.data.products.length);});
