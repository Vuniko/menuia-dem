// Browser QA with deterministic mocked /api/commercial. Never claims real Gemini.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {publicCatalog,groundedAnswer} from '../server/commercial.mjs';
import {demonstrationCatalog} from '../server/demonstration-catalog.mjs';

const catalog=publicCatalog(demonstrationCatalog(),'menuia-demo');
const extensionTypes={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const path=resolve(process.cwd(),'.'+(pathname==='/'?'/index.html':pathname));
 if(!path.startsWith(process.cwd()+sep)){res.writeHead(403).end();return;}
 try{const f=await stat(path);if(!f.isFile())throw new Error('not file');res.setHeader('Content-Type',extensionTypes[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:830}});
  const failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  let postCount=0;
  await page.route('**/api/commercial**',async route=>{
   const req=route.request();
   if(req.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)});
   if(req.method()!=='POST')return route.fulfill({status:405,body:'{}'});
   ++postCount;
   const input=req.postDataJSON();
   assert.equal(input.slug,'menuia-demo');
   const reply=groundedAnswer(catalog,input.message,input.history||[],input.productId||null,input.memory||null);
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...reply,catalog})});
  });
  await page.goto(origin+'/?negocio=menuia-demo#inicio',{waitUntil:'domcontentloaded'});
  await page.locator('[data-open="chat"]').first().click();
  await page.locator('#chat-send').waitFor({state:'visible'});
  const send=async message=>{
   await page.locator('#question').fill(message);
   await page.locator('#chat-send').click();
   await page.waitForFunction(()=>!document.querySelector('#chat-send')?.disabled,{timeout:15000});
  };
  await send('Hola, quiero comprar algo');
  await send('Busco ropa por S/200');
  const product=catalog.products.find(p=>p.name==='Polo esencial');
  assert.ok(product,'Demo QA requires Polo esencial');
  const matched=catalog.variants.find(v=>v.productId===product.id&&v.attributes.talla==='M'&&v.attributes.color==='Negro'&&v.stock.quantity>0);
  assert.ok(matched,'Demo QA requires available Polo esencial M Negro');
  await send('Polo esencial talla M color Negro');
  await send('Me lo llevo');
  const action=page.locator('.commercial-next-action').last();
  await action.waitFor({state:'visible',timeout:15000});
  await action.click();
  await page.locator('#detail[open]').waitFor({state:'visible'});
  assert.equal(await page.locator('#detail-title').innerText(),product.name);
  assert.equal(await page.locator('#add-cart').isDisabled(),false,'preselected available variant should enable local cart');
  await page.locator('#add-cart').click();
  const counter=await page.locator('#cart-count').innerText();
  assert.ok(Number(counter)>=1,'cart count should increase');
  assert.equal(failures.length,0,'uncaught browser exceptions: '+failures.join('; '));
  assert.ok(postCount>=4);
  console.log('PASS browser mock-flow width='+width+' messages='+postCount+' detail='+product.name+' cart='+counter);
  await page.close();
 }
 console.log('Browser QA: local deterministic catalog and chat only. Gemini real / protected Preview not tested.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
