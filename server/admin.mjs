import {randomUUID} from 'node:crypto';
import {buildKnowledge,answerKnowledge} from './knowledge.mjs';
import {trainingAction} from './training.mjs';

class AdminError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new AdminError(status,message)};
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text=(max=500,required=false)=>v=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail(400,'Revisá los campos de texto.');return v.trim()};
const bool=v=>{if(typeof v!=='boolean')fail(400,'Valor de estado inválido.');return v};
const number=(max=100000)=>v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||Math.abs(v*100-Math.round(v*100))>0.00001)fail(400,'Ingresá un número positivo con hasta dos decimales.');return v};
const id=v=>{if(!uuid(v))fail(400,'Identificador inválido.');return v};
const array=(max=30)=>v=>{if(!Array.isArray(v)||v.length>max)fail(400,'Lista inválida.');return [...new Set(v.map(text(100,true)))];};
const url=v=>{if(v===null||v==='')return null;try{const u=new URL(v);if(u.protocol!=='https:'||u.username||u.password||v.length>2000)throw Error();return u.href}catch{fail(400,'Usá una dirección HTTPS válida.')}};
const date=v=>{if(v===null)return null;if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT/.test(v)||!Number.isFinite(Date.parse(v)))fail(400,'Fecha inválida.');return new Date(v).toISOString()};
const versionDate=v=>{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(v)||!Number.isFinite(Date.parse(v)))fail(400,'Versión del registro inválida.');return v};
const time=v=>{if(v===null||v==='')return null;if(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(v))fail(400,'Horario inválido.');return v.slice(0,5)};
const nullable=check=>v=>v===null?null:check(v);
const rules={
 restaurants:{name:text(200,true),description:text(5000),business_type:text(100),address:text(500),phone:text(50),whatsapp:text(50),hours:text(2000),services:text(2000),payment_methods:array(20),business_policies:text(5000),logo_url:url,cover_url:url,published:bool,social_links:v=>{if(!v||Array.isArray(v)||typeof v!=='object'||Object.keys(v).length>10)fail(400,'Redes sociales inválidas.');const result={};for(const [k,x] of Object.entries(v)){if(!['instagram','facebook','tiktok','website'].includes(k))fail(400,'Red social no admitida.');result[k]=url(x)}return result}},
 categories:{name:text(150,true),sort_order:v=>{if(!Number.isInteger(v)||v<0||v>10000)fail(400,'Orden inválido.');return v},published:bool},
 products:{name:text(200,true),description:text(5000),category_id:id,price:number(),image_url:url,ingredients:array(),allergens:array(),dietary_tags:array(),available:bool,published:bool},
 restaurant_faqs:{question:text(500,true),answer:text(10000,true),published:bool},
 knowledge_documents:{title:text(200,true),content:text(12000,true),active:bool,published:bool},
 business_hours:{day_of_week:v=>{if(!Number.isInteger(v)||v<0||v>6)fail(400,'Día inválido.');return v},opens_at:time,closes_at:time,closes_next_day:bool,active:bool},
 promotions:{title:text(200,true),description:text(5000),type:v=>{if(!['happy_hour','combo','discount','2x1','scheduled'].includes(v))fail(400,'Tipo de promoción inválido.');return v},conditions:text(5000),price:nullable(number()),starts_at:date,ends_at:date,days:v=>{if(!Array.isArray(v)||v.some(d=>!Number.isInteger(d)||d<0||d>6))fail(400,'Días inválidos.');return [...new Set(v)]},start_time:time,end_time:time,active:bool,require_available:bool},
 product_pairings:{product_id:id,paired_product_id:id,note:text(1000)}
};
const extras={restaurants:['verifyPayments'],products:['verifyAvailability','validHours','verifyIngredients','verifyAllergens'],knowledge_documents:['verifyDocument'],promotions:['productIds']};
const required={categories:['name'],products:['name','category_id','price'],restaurant_faqs:['question','answer'],knowledge_documents:['title','content'],business_hours:['day_of_week','opens_at','closes_at','closes_next_day'],promotions:['title','description','type','conditions','price','starts_at','ends_at','days','start_time','end_time','active','require_available','productIds'],product_pairings:['product_id','paired_product_id']};

export function validateValues(resource,values,{creating=false,now=new Date()}={}){
 if(!Object.hasOwn(rules,resource)||!values||Array.isArray(values)||typeof values!=='object')fail(400,'Formulario inválido.');
 const result={};for(const [key,value] of Object.entries(values)){
  if(Object.hasOwn(rules[resource],key))result[key]=rules[resource][key](value);
  else if(!extras[resource]?.includes(key))fail(400,'Campo no permitido: '+key);
 }
 if(creating||resource==='promotions')for(const key of required[resource]||[])if(!Object.hasOwn(values,key))fail(400,'Completá los campos obligatorios.');
 for(const flag of ['verifyPayments','verifyAvailability','verifyIngredients','verifyAllergens','verifyDocument'])if(Object.hasOwn(values,flag))bool(values[flag]);
 if(resource==='restaurants'&&Object.hasOwn(values,'payment_methods'))result.payments_verified_at=values.verifyPayments?now.toISOString():null;
 if(resource==='products'){
  if(Object.hasOwn(values,'ingredients'))result.ingredients_verified_at=values.verifyIngredients?now.toISOString():null;
  if(Object.hasOwn(values,'allergens'))result.allergens_verified_at=values.verifyAllergens?now.toISOString():null;
  if(Object.hasOwn(values,'available')){
   result.availability_verified_at=null;result.availability_valid_until=null;
   if(values.verifyAvailability&&result.available){const hours=values.validHours;if(!Number.isInteger(hours)||hours<1||hours>24)fail(400,'La disponibilidad debe verificarse por 1 a 24 horas.');result.availability_verified_at=now.toISOString();result.availability_valid_until=new Date(+now+hours*3600000).toISOString();}
  }
 }
 if(resource==='knowledge_documents'&&Object.hasOwn(values,'content'))result.verified_at=values.verifyDocument?now.toISOString():null;
 if(resource==='business_hours'&&(result.opens_at===null||result.closes_at===null||(result.closes_next_day?result.closes_at>result.opens_at:result.closes_at<=result.opens_at)))fail(400,'Revisá el horario y si termina al día siguiente.');
 if(resource==='promotions'){
  if(!result.starts_at||!result.ends_at||Date.parse(result.ends_at)<=Date.parse(result.starts_at))fail(400,'El final debe ser posterior al inicio.');
  if((result.start_time===null)!==(result.end_time===null)||result.start_time!==null&&result.start_time===result.end_time)fail(400,'Completá ambos horarios o dejalos vacíos.');
  if(!Array.isArray(values.productIds)||values.productIds.length>30)fail(400,'Productos de promoción inválidos.');values.productIds.forEach(id);
 }
 if(!Object.keys(result).length)fail(400,'No hay cambios para guardar.');
 return result;
}

export function createAdminHandler({env=process.env,fetcher=fetch}={}){
 const hosted=Boolean(env.VERCEL_ENV),cookieName=hosted?'__Host-menuia_admin':'menuia_admin';
 const recoveryCookie=hosted?'__Host-menuia_recovery':'menuia_recovery';
 const recoveryURL='https://menuia-dem-git-feature-menuia-knowledge-base-v1-vuniko.vercel.app/admin/recovery.html';
 const publicKey=()=>{const key=env.SUPABASE_PUBLISHABLE_KEY||'';if(key.startsWith('sb_publishable_'))return true;try{return JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon'}catch{return false}};
 const configured=()=>env.SUPABASE_URL&&publicKey();
 const base=()=>{try{const u=new URL(env.SUPABASE_URL);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.hostname!=='secknmhqqzjlirwwnsnf.supabase.co')throw Error();return u.origin}catch{fail(503,'El proyecto de pruebas no está configurado.')}};
 async function supabase(path,{token,method='GET',body,representation=false}={}){
  const headers={apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;if(representation)headers.Prefer='return=representation';
  let response;try{response=await fetcher(base()+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}catch{fail(503,'No pudimos conectar con el proyecto de pruebas.');}
  let data=null;try{data=await response.json()}catch{}
  if(!response.ok){
   if(path.startsWith('/auth/v1/recover'))fail(response.status===429?429:503,response.status===429?'Esperá unos minutos antes de solicitar otro correo.':'No pudimos solicitar el correo de recuperación.');
   if(path==='/auth/v1/user'&&method==='PUT')fail(response.status===422?400:401,'No se pudo guardar la contraseña. Usá una contraseña distinta y revisá que el enlace siga vigente.');
   if(path.startsWith('/auth/'))fail(response.status===429?429:401,response.status===429?'Demasiados intentos. Esperá un momento.':'Sesión o credenciales inválidas.');
   if(response.status===401||response.status===403||data?.code==='42501')fail(403,'No tenés permiso para realizar este cambio.');
   if(data?.code==='23505')fail(409,'Ese registro ya existe. Revisá el nombre, slug o combinación.');
   if(data?.code==='P0002')fail(409,'El registro cambió. Recargá antes de guardar.');
   if(['23503','23514','22007','22023','P0001'].includes(data?.code))fail(400,'Revisá los datos y las relaciones del formulario.');
   fail(503,'No pudimos guardar o cargar los datos. Verificá la migración y volvé a intentar.');
  }
  return data;
 }
 const query=(table,params)=>'/rest/v1/'+table+'?'+new URLSearchParams(params).toString();
 async function memberships(token,user,restaurantId){
  const params={select:'restaurant_id,role',user_id:'eq.'+user.id,limit:'101'};if(restaurantId)params.restaurant_id='eq.'+restaurantId;
  const rows=await supabase(query('restaurant_members',params),{token});if(!Array.isArray(rows))fail(503,'No se pudieron comprobar los permisos.');return rows;
 }
 return async function handleAdmin(req,res){
  const respond=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  const cookie=(token,seconds)=>res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${seconds}${hosted?'; Secure':''}`);
  try{
   if(env.VERCEL_ENV==='production'){respond(404,{error:'No encontrado.'});return;}
   const requestUrl=new URL(req.url,'http://local'),action=requestUrl.searchParams.get('action')||'session';
   if(!['GET','POST'].includes(req.method))fail(405,'Método no permitido.');
   if(req.method==='POST'){
    const origins=hosted?[env.VERCEL_URL,env.VERCEL_BRANCH_URL].filter(Boolean).map(h=>'https://'+h):[env.ADMIN_LOCAL_ORIGIN||'http://127.0.0.1:8810'];
    if(!origins.includes(req.headers.origin))fail(403,'Origen no permitido.');
    if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Formato no permitido.');
   }
   if(action==='config'&&req.method==='GET'){respond(200,{configured:Boolean(configured()),environment:'Pruebas',sessionMinutes:60});return;}
   if(!configured())fail(503,'Falta configurar Supabase para este Preview.');
   let body={};if(req.method==='POST'){
    const bodyLimit=action==='trainingBankSave'?2000000:40000;
    let raw='';if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);else for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>bodyLimit)fail(413,'Formulario demasiado grande.');}
    if(Buffer.byteLength(raw)>bodyLimit)fail(413,'Formulario demasiado grande.');try{body=JSON.parse(raw)}catch{fail(400,'Formulario inválido.')};if(!body||Array.isArray(body)||typeof body!=='object')fail(400,'Formulario inválido.');
   }
   if(action==='login'&&req.method==='POST'){
    const email=text(254,true)(body.email),password=body.password;if(typeof password!=='string'||password.length<1||password.length>1000)fail(400,'Ingresá tu contraseña.');
    const session=await supabase('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    if(typeof session?.access_token!=='string'||!uuid(session.user?.id))fail(401,'No se pudo iniciar la sesión.');
    cookie(session.access_token,Math.min(3600,session.expires_in||3600));respond(200,{user:{email:session.user.email}});return;
   }
   const recoveryToken=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(recoveryCookie+'='))?.slice(recoveryCookie.length+1);
   const setRecovery=(value,seconds)=>res.setHeader('Set-Cookie',`${recoveryCookie}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${seconds}${hosted?'; Secure':''}`);
   if(action==='recover'&&req.method==='POST'){
    const email=text(254,true)(body.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Ingresá un correo válido.');
    await supabase('/auth/v1/recover?'+new URLSearchParams({redirect_to:recoveryURL}),{method:'POST',body:{email}});
    respond(200,{message:'Si el correo tiene una cuenta, recibirás un enlace para elegir una contraseña nueva.'});return;
   }
   if(action==='recoveryExchange'&&req.method==='POST'){
    if(body.type!=='recovery'||typeof body.accessToken!=='string'||body.accessToken.length>8192||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(body.accessToken))fail(400,'Enlace de recuperación inválido.');
    const recoveredUser=await supabase('/auth/v1/user',{token:body.accessToken});if(!uuid(recoveredUser?.id))fail(401,'Enlace inválido o vencido.');
    setRecovery(body.accessToken,600);respond(200,{ready:true});return;
   }
   if(action==='recoverySession'&&req.method==='GET'){
    if(!recoveryToken||recoveryToken.length>8192)fail(401,'Abrí el enlace de recuperación recibido por correo.');
    const recoveredUser=await supabase('/auth/v1/user',{token:recoveryToken});if(!uuid(recoveredUser?.id))fail(401,'Enlace inválido o vencido.');respond(200,{ready:true});return;
   }
   if(action==='recoverySave'&&req.method==='POST'){
    if(!recoveryToken||recoveryToken.length>8192)fail(401,'El enlace venció. Solicitá uno nuevo.');
    if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)fail(400,'Usá una contraseña de 12 a 128 caracteres.');
    const recoveredUser=await supabase('/auth/v1/user',{token:recoveryToken});if(!uuid(recoveredUser?.id))fail(401,'Enlace inválido o vencido.');
    await supabase('/auth/v1/user',{token:recoveryToken,method:'PUT',body:{password:body.password}});
    setRecovery('',0);respond(200,{message:'Contraseña actualizada. Ya podés ingresar al panel.'});return;
   }
   const rawCookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='));const token=rawCookie?.slice(cookieName.length+1);
   if(action==='logout'&&req.method==='POST'){cookie('',0);if(token){try{await supabase('/auth/v1/logout?scope=local',{token,method:'POST'})}catch{}}respond(200,{ok:true});return;}
   if(!token||token.length>8192)fail(401,'Ingresá para administrar tus negocios.');
   const user=await supabase('/auth/v1/user',{token});if(!uuid(user?.id))fail(401,'La sesión venció. Volvé a ingresar.');
   if(action==='session'&&req.method==='GET'){respond(200,{user:{email:user.email}});return;}
   if(action==='restaurants'&&req.method==='GET'){
    const memberRows=await memberships(token,user);if(memberRows.length>100)fail(400,'Demasiados negocios para esta vista.');
    const ids=memberRows.map(r=>r.restaurant_id).filter(uuid);if(!ids.length){respond(200,{restaurants:[]});return;}
    const rows=await supabase(query('restaurants',{select:'id,name,slug,published,updated_at',id:'in.('+ids.join(',')+')',order:'name.asc',limit:'100'}),{token});
    respond(200,{restaurants:rows.map(r=>({...r,role:memberRows.find(m=>m.restaurant_id===r.id)?.role}))});return;
   }
   if(action==='createRestaurant'&&req.method==='POST'){
    const name=text(200,true)(body.name),slug=text(100,true)(body.slug);if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))fail(400,'El identificador solo admite letras minúsculas, números y guiones.');
    const result=await supabase('/rest/v1/rpc/kb_create_restaurant',{token,method:'POST',body:{display_name:name,requested_slug:slug}});respond(201,{restaurant:result});return;
   }
   const restaurantId=id(req.method==='GET'?requestUrl.searchParams.get('restaurantId'):body.restaurantId);
   const member=(await memberships(token,user,restaurantId))[0];if(!member)fail(403,'No tenés acceso a este negocio.');
   const train=async bundle=>{try{await trainingAction({action,method:req.method,body,url:requestUrl,restaurantId,role:member.role,supabase:(path,options={})=>supabase(path,{...options,token}),query,respond,env,fetcher,bundle});}catch(e){fail(e.status||503,e.status?e.message:'No pudimos guardar o evaluar este lote.');}};
   if(action.startsWith('training')&&action!=='trainingStart'){await train();return;}
   if(action==='bundle'&&req.method==='GET'||action==='assistant'&&req.method==='POST'||action==='trainingStart'&&req.method==='POST'){
    if(action==='assistant'&&(typeof body.message!=='string'||!body.message.trim()||body.message.length>500||!uuid(body.requestId)))fail(400,'Pregunta o identificador inválido.');
    const tables=['restaurants','categories','products','restaurant_faqs','promotions','promotion_products','business_hours','knowledge_documents','product_pairings'];
    const result=Object.fromEntries(await Promise.all(tables.map(async table=>{
     const rows=await supabase(query(table,{select:'*',[table==='restaurants'?'id':'restaurant_id']:'eq.'+restaurantId,limit:'501',...(table==='product_pairings'||table==='promotion_products'?{}:{order:table==='restaurants'?'name.asc':table==='business_hours'?'updated_at.asc':'created_at.asc'})}),{token});
     if(rows.length>500)fail(400,'Esta vista admite hasta 500 registros por sección.');return [table,rows];
    })));
    if(action==='trainingStart'){await train(result);return;}
    if(action==='assistant'){
     const history=Array.isArray(body.history)?body.history.slice(-6).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=700).map(m=>({role:m.role,content:m.content})):[];
     try{
      const knowledge=buildKnowledge(result,restaurantId);
      const answer=await answerKnowledge({knowledge,message:body.message,history,env,fetcher,reserve:async()=>{
       const allowed=await supabase('/rest/v1/rpc/kb_reserve_assistant',{token,method:'POST',body:{r_id:restaurantId,request_id:body.requestId}});
       if(allowed!==true)fail(429,'Alcanzaste el límite de pruebas o esta pregunta ya fue enviada. Probá más tarde.');
      }});
      respond(200,answer);
     }catch(error){if(error instanceof AdminError)throw error;fail(503,error.message==='El conocimiento publicado supera el límite de esta prueba. Reducí los documentos o la carta.'?error.message:'No pudimos consultar el asistente. Revisá la configuración y volvé a intentar.');}
    }else respond(200,{...result,role:member.role,restaurantId});return;
   }
   if(action!=='save'||req.method!=='POST')fail(404,'No encontrado.');
   if(!['owner','editor'].includes(member.role))fail(403,'Tu acceso es de solo lectura.');
   const resource=body.resource;if(!Object.hasOwn(rules,resource))fail(400,'Sección no permitida.');
   const pairingEdit=resource==='product_pairings'&&body.pairingKey;
   const creating=!body.id&&!pairingEdit&&resource!=='restaurants';if(body.id)id(body.id);
   const values=validateValues(resource,body.values,{creating});
   if(resource==='promotions'){
    if(body.id&&!body.expectedUpdatedAt)fail(400,'Recargá la promoción antes de guardar.');
    const args={r_id:restaurantId,p_id:body.id||null,expected_updated_at:body.expectedUpdatedAt?versionDate(body.expectedUpdatedAt):null,selected_products:[...new Set(body.values.productIds)]};
    for(const [k,v] of Object.entries(values))args['p_'+k]=v;
    const result=await supabase('/rest/v1/rpc/kb_save_promotion',{token,method:'POST',body:args});respond(200,{row:result});return;
   }
   const params={select:'*'};if(!creating){params[resource==='restaurants'?'id':'restaurant_id']='eq.'+restaurantId;if(resource!=='restaurants')params.id='eq.'+body.id;
    if(pairingEdit){
     delete params.id;params.product_id='eq.'+id(body.pairingKey.productId);params.paired_product_id='eq.'+id(body.pairingKey.pairedProductId);params.note='eq.'+text(1000)(body.expectedNote);
     if(values.product_id!==body.pairingKey.productId||values.paired_product_id!==body.pairingKey.pairedProductId)fail(400,'La relación no puede cambiar al editar su nota.');
     delete values.product_id;delete values.paired_product_id;
    }else{if(!body.expectedUpdatedAt)fail(400,'Recargá el registro antes de guardar.');params.updated_at='eq.'+versionDate(body.expectedUpdatedAt);}
   }
   if(creating){values.restaurant_id=restaurantId;if(resource==='product_pairings'){if(values.product_id===values.paired_product_id)fail(400,'Elegí dos productos diferentes.');}}
   if(resource!=='product_pairings')values.updated_at=new Date().toISOString();
   const rows=await supabase(query(resource,params),{token,method:creating?'POST':'PATCH',body:values,representation:true});
   if(!Array.isArray(rows)||rows.length!==1)fail(409,'El registro cambió o dejó de estar disponible. Recargá antes de guardar.');
   respond(creating?201:200,{row:rows[0],requestId:randomUUID()});
  }catch(error){if(error.status===401)cookie('',0);respond(error.status||500,{error:error instanceof AdminError?error.message:'No pudimos completar la operación.'});}
 };
}
