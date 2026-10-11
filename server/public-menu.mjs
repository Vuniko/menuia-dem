import {buildKnowledge,answerKnowledge} from './knowledge.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function createPublicMenuHandler({env=process.env,fetcher=fetch}={}){
 return async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  const fail=(status,message)=>{const e=Error(message);e.status=status;throw e;};
  try{
   if(env.VERCEL_ENV==='production')return send(404,{error:'No encontrado.'});
   if(!['GET','POST'].includes(req.method))return send(405,{error:'Método no permitido.'});
   const allowed=[env.VERCEL_URL,env.VERCEL_BRANCH_URL].filter(Boolean).map(h=>'https://'+h);
   if(!env.VERCEL_ENV)allowed.push(env.ADMIN_LOCAL_ORIGIN||'http://127.0.0.1:8810');
   if(req.method==='POST'&&!allowed.includes(req.headers.origin))fail(403,'Origen no permitido.');
   const key=env.SUPABASE_PUBLISHABLE_KEY||'';let isPublic=key.startsWith('sb_publishable_');
   if(!isPublic)try{isPublic=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{}
   if(!isPublic||env.SUPABASE_URL!=='https://secknmhqqzjlirwwnsnf.supabase.co')fail(503,'Falta configurar el proyecto de pruebas.');
   let body={};if(req.method==='POST'){
    if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Formato no permitido.');
    let raw='';if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);else for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8000)fail(413,'Consulta demasiado grande.');}
    if(Buffer.byteLength(raw)>8000)fail(413,'Consulta demasiado grande.');try{body=JSON.parse(raw);}catch{fail(400,'Consulta inválida.');}
    if(!body||Array.isArray(body)||typeof body!=='object')fail(400,'Consulta inválida.');
   }
   const slug=req.method==='GET'?new URL(req.url,'http://local').searchParams.get('slug'):body.slug;
   // First public pilot is intentionally limited to the fictional business.
   if(slug!=='cerveceria-demo')fail(404,'Menú de demostración no encontrado.');
   async function db(table,params,{method='GET',payload}={}){
    const url=env.SUPABASE_URL+'/rest/v1/'+table+(params?'?'+new URLSearchParams(params):'');
    const response=await fetcher(url,{method,headers:{apikey:key,'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    if(!response.ok)fail(503,'No pudimos cargar el menú de pruebas.');const result=await response.json();return result;
   }
   const restaurants=await db('restaurants',{select:'id,name,slug,description,address,phone,whatsapp,payment_methods,payments_verified_at,services,business_policies,published',slug:'eq.'+slug,published:'eq.true',limit:'1'});
   if(!restaurants?.length)fail(404,'Este menú todavía no está publicado para pruebas.');
   const r=restaurants[0],id=r.id;
   const fields={categories:'id,restaurant_id,name,sort_order,published',products:'id,restaurant_id,category_id,name,price,description,image_url,ingredients,allergens,available,published,availability_verified_at,availability_valid_until',restaurant_faqs:'id,restaurant_id,question,answer,published',promotions:'id,restaurant_id,title,description,conditions,price,active,starts_at,ends_at,days,start_time,end_time,require_available',promotion_products:'restaurant_id,promotion_id,product_id',business_hours:'restaurant_id,day_of_week,opens_at,closes_at,closes_next_day,active',knowledge_documents:'id,restaurant_id,title,content,active,published',product_pairings:'restaurant_id,product_id,paired_product_id,note'};
   const bundle={restaurants};for(const [table,select]of Object.entries(fields)){
    const filter={select,restaurant_id:'eq.'+id,limit:'501'};
    if(['categories','products','restaurant_faqs','knowledge_documents'].includes(table))filter.published='eq.true';
    if(['business_hours','knowledge_documents','promotions'].includes(table))filter.active='eq.true';
    bundle[table]=await db(table,filter);if(!Array.isArray(bundle[table])||bundle[table].length>500)fail(503,'El menú supera el límite de esta prueba.');
   }
   const knowledge=buildKnowledge(bundle,id);
   if(req.method==='GET')return send(200,{business:{name:r.name,slug,description:r.description},categories:bundle.categories.sort((a,b)=>a.sort_order-b.sort_order),products:knowledge.products.map(p=>({...p,categoryId:bundle.products.find(x=>x.id===p.id).category_id,image:bundle.products.find(x=>x.id===p.id).image_url})),promotions:knowledge.promotions,hours:knowledge.hours,checkedAt:knowledge.checkedAt,demo:true});
   if(typeof body.message!=='string'||!body.message.trim()||body.message.length>500||!uuid(body.requestId))fail(400,'Pregunta inválida.');
   const history=Array.isArray(body.history)?body.history.slice(-6).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=700).map(m=>({role:m.role,content:m.content})):[];
   const answer=await answerKnowledge({knowledge,message:body.message,history,env,fetcher,reserve:async()=>{
    const allowed=await db('rpc/kb_reserve_public_assistant',null,{method:'POST',payload:{r_id:id,request_id:body.requestId}});
    if(allowed!==true)fail(429,'Esperá 5 segundos entre consultas a Gemini. El cupo compartido es de 500 llamadas diarias.');
   }});send(200,answer);
  }catch(e){send(e.status||503,{error:e.status?e.message:'No pudimos consultar el asistente. Probá más tarde.'});}
 };
}
