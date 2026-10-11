// Browser QA fixture only. Never deployed (.vercelignore excludes server/*.test.mjs).
// Start explicitly: node server/admin-visual.test.mjs --visual
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createAdminHandler} from './admin.mjs';
if(process.argv.includes('--visual')){
 const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',U='33333333-3333-4333-8333-333333333333',C='44444444-4444-4444-8444-444444444444',P='55555555-5555-4555-8555-555555555555';
 const stamp='2026-10-11T12:00:00.123456+00:00';
 const data={restaurants:[{id:A,name:'Cervecería Demo',slug:'cerveceria-demo',published:false,description:'Datos ficticios para probar la interfaz.',updated_at:stamp,social_links:{},payment_methods:[]},{id:B,name:'Otro negocio · solo lectura',slug:'solo-lectura',published:false,updated_at:stamp,social_links:{},payment_methods:[]}],restaurant_members:[{restaurant_id:A,user_id:U,role:'owner'},{restaurant_id:B,user_id:U,role:'viewer'}],categories:[{id:C,restaurant_id:A,name:'Comidas',published:true,sort_order:0,updated_at:stamp}],products:[{id:P,restaurant_id:A,category_id:C,name:'Hamburguesa clásica',description:'Hamburguesa de prueba',price:25,ingredients:['Carne','Cheddar'],allergens:['Leche'],dietary_tags:[],available:true,published:false,updated_at:stamp}],promotions:[],promotion_products:[],business_hours:[],restaurant_faqs:[],knowledge_documents:[],product_pairings:[]};
 const json=body=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
 const fetcher=async(url,opts)=>{
  const u=new URL(url),body=opts.body?JSON.parse(opts.body):null;
  if(u.pathname==='/auth/v1/token')return json({access_token:'fixture-user',expires_in:3600,user:{id:U,email:'visual@example.invalid'}});
  if(u.pathname==='/auth/v1/user')return json({id:U,email:'visual@example.invalid'});
  if(u.pathname==='/auth/v1/logout')return json({});
  if(u.pathname.endsWith('/rpc/kb_create_restaurant')){const r={id:randomUUID(),name:body.display_name,slug:body.requested_slug,published:false,updated_at:new Date().toISOString(),social_links:{},payment_methods:[]};data.restaurants.push(r);data.restaurant_members.push({restaurant_id:r.id,user_id:U,role:'owner'});return json(r);}
  if(u.pathname.endsWith('/rpc/kb_save_promotion')){const r={id:body.p_id||randomUUID(),restaurant_id:body.r_id,updated_at:new Date().toISOString()};for(const [k,v] of Object.entries(body))if(k.startsWith('p_')&&k!=='p_id')r[k.slice(2)]=v;const i=data.promotions.findIndex(p=>p.id===r.id);if(i<0)data.promotions.push(r);else data.promotions[i]=r;data.promotion_products=data.promotion_products.filter(p=>p.promotion_id!==r.id);data.promotion_products.push(...body.selected_products.map(product_id=>({restaurant_id:r.restaurant_id,promotion_id:r.id,product_id})));return json(r);}
  const table=u.pathname.split('/').at(-1),rows=data[table];if(!rows)throw Error('Unknown fixture table');
  const matches=row=>[...u.searchParams].every(([k,v])=>['select','limit','order'].includes(k)||v.startsWith('eq.')&&String(row[k])===v.slice(3)||v.startsWith('in.(')&&v.slice(4,-1).split(',').includes(row[k]));
  if(opts.method==='GET')return json(rows.filter(matches));
  if(opts.method==='POST'){const row={...body,...(table==='product_pairings'?{}:{id:randomUUID(),updated_at:new Date().toISOString()})};rows.push(row);return json([row]);}
  if(opts.method==='PATCH'){const selected=rows.filter(matches);for(const row of selected)Object.assign(row,body);return json(selected);}
  throw Error('Unknown fixture operation');
 };
 const handler=createAdminHandler({env:{SUPABASE_URL:'https://secknmhqqzjlirwwnsnf.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',ADMIN_LOCAL_ORIGIN:'http://127.0.0.1:8811'},fetcher});
 const files={'/admin/':'index.html','/admin/panel.js':'panel.js','/admin/panel.css':'panel.css','/admin/assistant.js':'assistant.js'};
 http.createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;if(path==='/api/kb-admin')return handler(req,res);
  if(files[path]){let bytes=await readFile(new URL('../admin/'+files[path],import.meta.url));if(path==='/admin/')bytes=Buffer.from(bytes.toString().replace('Entorno de pruebas','Prueba visual · datos ficticios'));
   res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});res.end(bytes);return;}
  res.writeHead(404);res.end();
 }).listen(8811,'127.0.0.1',()=>console.log('Fixture visual, sin conexión a Supabase: http://127.0.0.1:8811/admin/'));
}
