'use strict';
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>'S/ '+Number(value).toFixed(2);
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const sections={restaurants:['Información','Información del negocio','Datos de contacto, servicios y políticas.'],categories:['Categorías','Organizá tu carta','Agrupá comidas y bebidas. Las categorías sin publicar quedan como borrador.'],products:['Productos','Tu carta','Precios, ingredientes y disponibilidad. Un stock sin verificación vigente necesita confirmación.'],promotions:['Promociones','Ofertas con vigencia','Fechas y horarios corresponden a Perú. La vigencia se comprueba al consultar la carta.'],business_hours:['Horarios','Cuándo abrís','Podés añadir más de un turno por día.'],restaurant_faqs:['Preguntas frecuentes','Respuestas claras','Guardá respuestas verificadas a las consultas más habituales.'],knowledge_documents:['Conocimiento','Información adicional','Los documentos empiezan privados. Revisá el contenido antes de publicarlo.'],product_pairings:['Combinaciones','Productos que van juntos','Combiná únicamente productos de este negocio.']};
const field=(name,label,type='text',extra={})=>({name,label,type,...extra});
const definitions={
 newBusiness:[field('name','Nombre comercial','text',{required:true,max:200}),field('slug','Identificador del menú','text',{required:true,max:100,help:'Ejemplo: cerveceria-demo. Solo minúsculas, números y guiones; debe ser único.'})],
 restaurants:[field('name','Nombre comercial','text',{required:true,max:200}),field('description','Descripción','textarea',{max:5000}),field('business_type','Tipo de negocio','text',{max:100}),field('address','Dirección','text',{max:500}),field('phone','Teléfono','text',{max:50}),field('whatsapp','WhatsApp','text',{max:50}),field('hours','Resumen de horarios','textarea',{max:2000,help:'Podés cargar los turnos exactos en la sección Horarios.'}),field('services','Servicios disponibles','textarea',{max:2000}),field('payment_methods','Métodos de pago','array',{max:2000,help:'Uno por línea. Una lista vacía significa que falta confirmar el dato.'}),field('verifyPayments','Confirmé los métodos de pago con el negocio','checkbox'),field('business_policies','Políticas del establecimiento','textarea',{max:5000}),...['instagram','facebook','tiktok','website'].map(n=>field('social_'+n,({website:'Sitio web',instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok'})[n],'url',{max:2000})),field('logo_url','Imagen del logo (URL HTTPS)','url'),field('cover_url','Imagen de portada (URL HTTPS)','url'),field('published','Publicar la información de este negocio','checkbox',{help:'Permite consultar sus datos publicados en Supabase. La demo de MenuIA mantiene su carta actual.'})],
 categories:[field('name','Nombre de la categoría','text',{required:true,max:150}),field('sort_order','Orden en la carta','number',{default:0,step:1,max:10000}),field('published','Categoría publicada','checkbox')],
 products:[field('name','Nombre del producto','text',{required:true,max:200}),field('category_id','Categoría','categories',{required:true}),field('price','Precio en soles','number',{required:true,step:.01,max:100000}),field('description','Descripción','textarea',{max:5000}),field('image_url','Imagen del producto (URL HTTPS)','url'),field('ingredients','Ingredientes','array',{help:'Uno por línea. Registrá ingredientes reales, no perfiles de sabor.'}),field('verifyIngredients','Verifiqué los ingredientes con el negocio','checkbox'),field('allergens','Alérgenos declarados','array',{help:'Uno por línea. Una lista vacía no garantiza ausencia de alérgenos ni de trazas.'}),field('verifyAllergens','Revisé la declaración de alérgenos con el negocio','checkbox',{help:'No certifica seguridad frente a contaminación cruzada.'}),field('dietary_tags','Etiquetas','array',{help:'Una por línea. No declares aptitud alimentaria sin verificación.'}),field('available','Producto disponible','checkbox',{default:true}),field('verifyAvailability','Confirmé la disponibilidad con el negocio ahora','checkbox'),field('validHours','Confirmación válida durante (horas)','number',{default:4,step:1,min:1,max:24}),field('published','Producto publicado','checkbox')],
 promotions:[field('title','Nombre de la promoción','text',{required:true,max:200}),field('description','Descripción','textarea',{max:5000}),field('type','Tipo','promotionType',{default:'combo'}),field('price','Precio promocional en soles','number',{step:.01,max:100000,nullable:true}),field('productIds','Productos participantes','productList',{help:'El precio de la promoción y sus productos se guardan juntos.'}),field('starts_at','Inicio (hora de Perú)','datetime-local',{required:true}),field('ends_at','Final (hora de Perú)','datetime-local',{required:true}),field('days','Días de aplicación','days',{help:'Sin selección: todos los días dentro de las fechas.'}),field('start_time','Desde (opcional)','time'),field('end_time','Hasta (opcional)','time',{help:'Si cruza medianoche, la hora final puede ser anterior a la inicial.'}),field('conditions','Condiciones','textarea',{max:5000}),field('require_available','Aplicar solo si los productos participantes están disponibles','checkbox',{default:true}),field('active','Promoción activa','checkbox')],
 business_hours:[field('day_of_week','Día','weekday',{default:1}),field('opens_at','Hora de apertura','time',{required:true}),field('closes_at','Hora de cierre','time',{required:true}),field('closes_next_day','Termina al día siguiente','checkbox'),field('active','Turno activo','checkbox',{default:true})],
 restaurant_faqs:[field('question','Pregunta','textarea',{required:true,max:500}),field('answer','Respuesta','textarea',{required:true,max:10000}),field('published','Respuesta publicada','checkbox')],
 knowledge_documents:[field('title','Título','text',{required:true,max:200}),field('content','Información del documento','textarea',{required:true,max:12000}),field('verifyDocument','Revisé esta información con el negocio','checkbox'),field('active','Documento activo','checkbox',{default:true}),field('published','Documento público','checkbox',{help:'Sin marcar, solo lo ven los miembros autorizados de este negocio.'})],
 product_pairings:[field('product_id','Producto','products',{required:true}),field('paired_product_id','Combinar con','products',{required:true}),field('note','Motivo de la combinación','textarea',{max:1000})]
};
let state={restaurants:[],selected:'',bundle:null,section:'restaurants',busy:false},editing=null,dirty=false,saving=false;
async function api(action,{method='GET',body,params={}}={}){
 const response=await fetch('/api/kb-admin?'+new URLSearchParams({action,...params}),{method,credentials:'same-origin',headers:method==='POST'?{'Content-Type':'application/json'}:{},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(55000)});
 let result;try{result=await response.json()}catch{throw Error('No pudimos conectar con el panel. Volvé a intentar.');}
 if(!response.ok){if(response.status===401&&action!=='login'){showLogin();closeEditor(true);}throw Error(result.error||'No se pudo completar la operación.');}return result;
}
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function setBusy(value){state.busy=value;$('restaurant-select').disabled=value;$('new-business').disabled=value;$('add-record').disabled=value;for(const b of $('sections').querySelectorAll('button'))b.disabled=value;}
function showLogin(){state={restaurants:[],selected:'',bundle:null,section:'restaurants',busy:false};$('workspace').hidden=true;$('login-view').hidden=false;$('logout').hidden=true;}
function canEdit(){return ['owner','editor'].includes(state.bundle?.role);}
async function loadRestaurants(preferred){
 const result=await api('restaurants');state.restaurants=result.restaurants;
 $('restaurant-select').innerHTML=state.restaurants.map(r=>`<option value="${escapeHTML(r.id)}">${escapeHTML(r.name)}</option>`).join('');
 state.selected=state.restaurants.some(r=>r.id===preferred)?preferred:state.restaurants[0]?.id||'';$('restaurant-select').value=state.selected;
 $('login-view').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;
 $('empty-business').hidden=Boolean(state.selected);$('business-content').hidden=!state.selected;
 if(state.selected)await loadBundle();else{$('workspace-title').textContent='Mis negocios';$('role-note').textContent='Todavía no tenés negocios asignados.';}
}
async function loadBundle(){
 const selected=state.selected;notice('Cargando datos del negocio…');const bundle=await api('bundle',{params:{restaurantId:selected}});if(selected!==state.selected)return;
 state.bundle=bundle;$('business-content').hidden=false;$('workspace-title').textContent=bundle.restaurants[0]?.name||'Mi negocio';$('role-note').textContent=bundle.role==='viewer'?'Acceso de solo lectura':bundle.role==='owner'?'Propietario · podés administrar este negocio':'Editor · podés actualizar la información';
 render();notice('');
}
function statusPill(label,warn=false){return `<span class="pill${warn?' warn':''}">${escapeHTML(label)}</span>`;}
function render(){
 const b=state.bundle;if(!b)return;
 const unverified=b.products.filter(p=>!p.availability_verified_at||!p.availability_valid_until||Date.parse(p.availability_valid_until)<=Date.now()).length;
 const metrics=[[b.products.length,'Productos'],[b.categories.length,'Categorías'],[b.promotions.filter(p=>p.active).length,'Promociones activadas'],[unverified,'Stock por verificar']];
 $('metrics').innerHTML=metrics.map(([n,label])=>`<div class="metric"><b>${n}</b><span>${label}</span></div>`).join('');
 $('sections').innerHTML=Object.entries(sections).map(([key,[name]])=>`<button type="button" data-section="${key}" ${key===state.section?'aria-current="page"':''}>${name}</button>`).join('');
 const [,title,help]=sections[state.section];$('section-kicker').textContent='TU NEGOCIO';$('section-title').textContent=title;$('section-help').textContent=help;
 $('add-record').hidden=state.section==='restaurants'||!canEdit();$('add-record').textContent='+ Agregar';
 if(state.section==='restaurants'){
  const r=b.restaurants[0];if(!r){$('records').textContent='No se encontró el negocio.';return;}
  const facts=[['Descripción',r.description],['Dirección',r.address],['Contacto',[r.phone,r.whatsapp].filter(Boolean).join(' · ')],['Métodos de pago',r.payment_methods?.join(', ')],['Servicios',r.services],['Políticas',r.business_policies],['Identificador del menú',r.slug],['Estado',r.published?'Publicado en Supabase':'Borrador']];
  $('records').innerHTML=`<div class="facts">${facts.map(([k,v])=>`<div class="fact"><b>${k}</b><span>${escapeHTML(v||'Pendiente de completar')}</span></div>`).join('')}</div>${canEdit()?'<button class="primary" data-edit="0" style="margin-top:20px">Editar información</button>':''}`;
  return;
 }
 const rows=b[state.section]||[];
 $('records').innerHTML=rows.length?`<div class="record-list">${rows.map((r,i)=>{
  let title=r.name||r.title||r.question,description=r.description||r.answer||r.content||r.note||'',pills=[];
  if(state.section==='products'){const c=b.categories.find(c=>c.id===r.category_id);pills.push(statusPill(money(r.price)),statusPill(c?.name||'Sin categoría'),statusPill(r.available?'Disponible declarado':'Agotado',!r.available));if(!r.availability_valid_until||Date.parse(r.availability_valid_until)<=Date.now())pills.push(statusPill('Stock sin verificación vigente',true));if(!r.ingredients.length||!r.allergens_verified_at)pills.push(statusPill('Información alimentaria incompleta',true));}
  if(Object.hasOwn(r,'published'))pills.push(statusPill(r.published?'Publicado':'Privado / borrador',!r.published));
  if(Object.hasOwn(r,'active'))pills.push(statusPill(r.active?'Activado':'Desactivado',!r.active));
  if(state.section==='promotions'){const expired=Date.parse(r.ends_at)<=Date.now();pills.push(statusPill(expired?'Vencida':Date.parse(r.starts_at)>Date.now()?'Empieza más adelante':'Revisar días y horario',expired));description+=`\n${formatDate(r.starts_at)} → ${formatDate(r.ends_at)}${r.price===null?'':' · '+money(r.price)}`;}
  if(state.section==='business_hours'){title=days[r.day_of_week];description=r.opens_at.slice(0,5)+' → '+r.closes_at.slice(0,5)+(r.closes_next_day?' (día siguiente)':'');}
  if(state.section==='product_pairings'){title=(b.products.find(p=>p.id===r.product_id)?.name||'Producto')+' + '+(b.products.find(p=>p.id===r.paired_product_id)?.name||'Producto');}
  const shortened=description.length>260?description.slice(0,260)+'…':description;
  return `<article class="record"><h3>${escapeHTML(title)}</h3><div class="pills">${pills.join('')}</div><p>${escapeHTML(shortened||'Sin descripción adicional.')}</p>${r.updated_at?`<p class="hint">Actualizado: ${escapeHTML(formatDate(r.updated_at))}</p>`:''}${canEdit()?`<button class="secondary" data-edit="${i}">${state.section==='product_pairings'?'Editar nota':'Editar'}</button>`:''}</article>`;
 }).join('')}</div>`:'<p class="hint">Todavía no hay registros en esta sección.</p>';
}
function formatDate(s){return new Intl.DateTimeFormat('es-PE',{dateStyle:'short',timeStyle:'short',timeZone:'America/Lima'}).format(new Date(s));}
function peruInput(value){if(!value)return '';return new Date(Date.parse(value)-5*3600000).toISOString().slice(0,16);}
function options(type){
 if(type==='categories')return state.bundle.categories.map(c=>[c.id,c.name]);
 if(type==='products'||type==='productList')return state.bundle.products.map(p=>[p.id,p.name]);
 if(type==='weekday')return days.map((d,i)=>[i,d]);
 if(type==='promotionType')return [['combo','Combo'],['happy_hour','Happy hour'],['discount','Descuento'],['2x1','2 × 1'],['scheduled','Oferta programada']];return [];
}
function openEditor(resource,row=null){
 editing={resource,row};dirty=false;$('edit-error').textContent='';$('editor-title').textContent=resource==='newBusiness'?'Crear negocio':row?'Editar '+sections[resource][0].toLowerCase():'Agregar '+sections[resource][0].toLowerCase();
 const values={...row};if(resource==='restaurants')for(const [k,v] of Object.entries(row.social_links||{}))values['social_'+k]=v;
 if(resource==='promotions')values.productIds=row?state.bundle.promotion_products.filter(x=>x.promotion_id===row.id).map(x=>x.product_id):[];
 $('form-fields').innerHTML=definitions[resource].map(f=>{
  const value=values[f.name]??f.default??'',fid='field-'+f.name,help=f.help?`<span class="field-help" id="help-${f.name}">${escapeHTML(f.help)}</span>`:'',described=f.help?`aria-describedby="help-${f.name}"`:'';
  if(f.type==='checkbox')return `<label class="check" for="${fid}"><input id="${fid}" name="${f.name}" type="checkbox" ${value===true?'checked':''}><span>${f.label}${help}</span></label>`;
  if(f.type==='days')return `<fieldset class="days"><legend>Días de aplicación</legend>${days.map((d,i)=>`<label class="check"><input type="checkbox" name="days" value="${i}" ${Array.isArray(value)&&value.includes(i)?'checked':''}><span>${d}</span></label>`).join('')}${help}</fieldset>`;
  let control,attrs=`id="${fid}" name="${f.name}" ${f.required?'required':''} ${described} ${f.max&&f.type!=='number'?`maxlength="${f.max}"`:''}`;
  if(['categories','products','promotionType','weekday','productList'].includes(f.type)){
   const opts=options(f.type);control=`<select ${attrs} ${f.type==='productList'?'multiple size="4"':''} ${resource==='product_pairings'&&row&&f.type==='products'?'disabled':''}>${['categories','products'].includes(f.type)?'<option value="">Seleccioná una opción</option>':''}${opts.map(([v,label])=>`<option value="${escapeHTML(v)}" ${(f.type==='productList'?Array.isArray(value)&&value.includes(v):String(value)===String(v))?'selected':''}>${escapeHTML(label)}</option>`).join('')}</select>`;
  }else if(['textarea','array'].includes(f.type))control=`<textarea ${attrs}>${escapeHTML(f.type==='array'?(Array.isArray(value)?value.join('\n'):''):value)}</textarea>`;
  else control=`<input ${attrs} type="${f.type}" value="${escapeHTML(f.type==='datetime-local'?peruInput(value):f.type==='time'?String(value).slice(0,5):value)}" ${f.type==='number'?`min="${f.min??0}" max="${f.max??100000}" step="${f.step??1}"`:''} ${f.type==='url'?'placeholder="https://…"':''}>`;
  return `<label for="${fid}">${f.label}${control}${help}</label>`;
 }).join('');
 $('save-record').disabled=false;$('save-record').textContent=resource==='newBusiness'?'Crear negocio':'Guardar cambios';document.body.classList.add('editing');$('editor').showModal();
}
function closeEditor(force=false){if(saving&&!force)return;if(!force&&dirty&&!confirm('Tenés cambios sin guardar. ¿Querés descartarlos?'))return;$('editor').close();document.body.classList.remove('editing');editing=null;dirty=false;}
function readValues(){const result={};for(const f of definitions[editing.resource]){
 const e=$('field-'+f.name);let value;
 if(f.type==='days')value=[...$('form-fields').querySelectorAll('input[name="days"]:checked')].map(e=>Number(e.value));
 else if(f.type==='checkbox')value=e.checked;
 else if(f.type==='productList')value=[...e.selectedOptions].map(o=>o.value);
 else if(f.type==='array')value=e.value.split('\n').map(x=>x.trim()).filter(Boolean);
 else if(f.type==='number'||f.type==='weekday')value=e.value===''&&f.nullable?null:Number(e.value);
 else if(f.type==='datetime-local')value=e.value?new Date(e.value+':00-05:00').toISOString():null;
 else if(f.type==='time')value=e.value||null;
 else value=e.value;
 result[f.name]=value;
 }
 if(editing.resource==='restaurants'){result.social_links={};for(const name of ['instagram','facebook','tiktok','website']){if(result['social_'+name])result.social_links[name]=result['social_'+name];delete result['social_'+name];}}
 return result;
}
$('login-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;button.textContent='Ingresando…';notice('');const form=new FormData(e.currentTarget);
 try{await api('login',{method:'POST',body:{email:form.get('email'),password:form.get('password')}});e.target.password.value='';setBusy(true);await loadRestaurants();}
 catch(err){notice(err.message,true)}finally{button.disabled=false;button.textContent='Ingresar';setBusy(false)}
});
$('logout').onclick=async()=>{if(state.busy||saving)return;try{await api('logout',{method:'POST',body:{}});showLogin();notice('Sesión cerrada.')}catch(err){notice(err.message,true)}};
$('restaurant-select').onchange=async()=>{if(state.busy)return;state.selected=$('restaurant-select').value;setBusy(true);try{await loadBundle()}catch(err){notice(err.message,true);$('business-content').hidden=true;}finally{setBusy(false)}};
$('new-business').onclick=()=>openEditor('newBusiness');$('add-record').onclick=()=>{if(state.section==='products'&&!state.bundle.categories.length){notice('Creá una categoría antes de agregar productos.',true);return;}openEditor(state.section)};
$('sections').onclick=e=>{const key=e.target.dataset.section;if(key&&sections[key]&&!state.busy){state.section=key;render()}};
$('records').onclick=e=>{const i=e.target.dataset.edit;if(i!==undefined&&canEdit()&&!state.busy)openEditor(state.section,state.bundle[state.section][Number(i)])};
$('form-fields').oninput=()=>dirty=true;$('form-fields').onchange=()=>dirty=true;$('close-editor').onclick=()=>closeEditor();$('cancel-editor').onclick=()=>closeEditor();$('editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor()});
$('edit-form').addEventListener('submit',async e=>{e.preventDefault();if(saving||!editing)return;saving=true;$('save-record').disabled=true;$('save-record').textContent='Guardando…';$('edit-error').textContent='';const current=editing;let saved=false;
 try{const values=readValues();let preferred=state.selected;
  if(current.resource==='newBusiness'){const created=await api('createRestaurant',{method:'POST',body:values});preferred=created.restaurant.id;}
  else await api('save',{method:'POST',body:{restaurantId:state.selected,resource:current.resource,id:current.row?.id,expectedUpdatedAt:current.row?.updated_at,values,...(current.resource==='product_pairings'&&current.row?{pairingKey:{productId:current.row.product_id,pairedProductId:current.row.paired_product_id},expectedNote:current.row.note}:{})}});
  saved=true;saving=false;closeEditor(true);setBusy(true);if(current.resource==='newBusiness')await loadRestaurants(preferred);else await loadBundle();notice('Cambios guardados en el proyecto de pruebas.');
 }catch(err){if(editing)$('edit-error').textContent=err.message;else notice((saved?'Los datos se guardaron, pero no pudimos recargar: ':'')+err.message,true);}
 finally{saving=false;setBusy(false);$('save-record').disabled=false;$('save-record').textContent='Guardar cambios';}
});
(async()=>{setBusy(true);try{const config=await api('config');if(!config.configured){$('login-form').querySelector('button[type=submit]').disabled=true;$('login-note').textContent='Este Preview todavía necesita la configuración de Supabase. Tu cuenta y contraseña no se enviarán hasta que esté listo.';return;}
 try{await api('session');await loadRestaurants()}catch(err){showLogin();if(!err.message.includes('Ingresá'))notice(err.message,true);}
 }catch(err){notice(err.message,true)}finally{setBusy(false)}})();
