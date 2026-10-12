import {filterProducts,mentionedProducts,money,safeImage,productQuestion,validateMenu,localAssistantOrigin} from './menu-model.mjs';
const $=id=>document.getElementById(id),connected=document.body.dataset.source==='knowledge';
const slug=new URLSearchParams(location.search).get('negocio')||'cerveceria-demo';
const state={menu:null,category:'',search:'',view:'home',history:[],busy:false,loading:false,lastQuestion:'',detail:null,error:false};
const suggestions=[...$('suggestions').querySelectorAll('button')];
let dialogReturn=null,chatReturn=null,detailFromChat=false;
let chatOrigin=location.origin;
const create=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
if(connected){$('demo-label').textContent='DEMO · DATOS DE PRUEBA';$('connected-link').hidden=true;}
// Preserve the existing optional local backend setting; never use it in hosted
// Preview/Production or for the business-scoped Knowledge Base route.
if(!connected&&!location.hostname.endsWith('.vercel.app')){
 let saved='';try{saved=localStorage.getItem('menuia_ai_endpoint')||'';}catch{}
 chatOrigin=localAssistantOrigin(saved)||location.origin;
 const details=create('details',undefined,'local-connection'),summary=create('summary','Configurar asistente local'),label=create('label','Dirección HTTPS del servidor de prueba'),input=create('input'),save=create('button','Guardar conexión','secondary'),reset=create('button','Usar servidor de esta página','text-button'),status=create('p');
 input.type='url';input.id='local-endpoint';input.value=saved;input.placeholder='https://…';label.htmlFor=input.id;save.type='button';reset.type='button';status.setAttribute('role','status');
 save.onclick=()=>{const origin=localAssistantOrigin(input.value.trim());if(!origin){status.textContent='Ingresá una dirección HTTPS sin rutas, credenciales ni parámetros.';return;}try{localStorage.setItem('menuia_ai_endpoint',origin);chatOrigin=origin;status.textContent='Conexión guardada. Las nuevas preguntas utilizarán este servidor.';}catch{status.textContent='El navegador no permitió guardar la conexión.';}};
 reset.onclick=()=>{try{localStorage.removeItem('menuia_ai_endpoint');}catch{}chatOrigin=location.origin;input.value='';state.history=[];status.textContent='Usaremos el servidor de esta página.';};
 details.append(summary,label,input,save,reset,status);document.querySelector('.chat-compose').prepend(details);
}
const icons={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',menu:'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',promos:'M3 3h8l10 10-8 8L3 11zM7 7h.01',chat:'M4 4h16v12H9l-5 5zM8 9h8M8 12h5'};
for(const slot of document.querySelectorAll('[data-icon]')){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',icons[slot.dataset.icon]);svg.append(path);slot.append(svg);}

function image(product,{label=true,eager=false}={}){
 const wrap=create('div',undefined,'product-photo');const src=safeImage(product.image,location.origin);
 const placeholder=()=>wrap.replaceChildren(create('div','Fotografía no disponible','photo-placeholder'));
 if(src){const img=create('img');img.src=src;img.alt=product.name;img.width=600;img.height=400;img.loading=eager?'eager':'lazy';img.decoding='async';img.onerror=placeholder;wrap.append(img);}else placeholder();
 if(label&&state.menu?.demo)wrap.append(create('span','FOTO ILUSTRATIVA','photo-label'));
 return wrap;
}
const stockLabel=p=>!connected?'Carta de ejemplo':p.stock==='agotado'?'Agotado':p.stock==='verificado'?'Disponibilidad verificada en la demo':'Disponibilidad por confirmar';
function productCard(product){
 const card=create('article',undefined,'product-card'),button=create('button',undefined,'product-open');button.type='button';button.setAttribute('aria-label','Ver '+product.name+', '+money(product.price));button.dataset.productId=product.id;
 const body=create('div',undefined,'product-body');body.append(create('span',state.menu.categories.find(c=>c.id===product.categoryId)?.name||'Carta','card-category'));
 const meta=create('div',undefined,'product-meta');meta.append(create('h3',product.name),create('span',money(product.price),'product-price'));
 const fullDescription=String(product.description||'').replace(/^PRODUCTO FICTICIO DE DEMOSTRACIÓN\.\s*/,'');
 const description=fullDescription.length>120?fullDescription.slice(0,117)+'…':fullDescription;
 const footer=create('div',undefined,'card-footer');footer.append(create('span',stockLabel(product)),create('span','Ver detalles ↗'));
 body.append(meta,create('p',description,'product-description'),footer);button.append(image(product),body);button.onclick=()=>openDetail(product.id);card.append(button);return card;
}
function renderMenu(){
 if(!state.menu)return;
 $('categories').replaceChildren();for(const category of [{id:'',name:'Todo'},...state.menu.categories]){const b=create('button',category.name);b.type='button';b.setAttribute('aria-pressed',String(state.category===category.id));b.onclick=()=>{state.category=category.id;renderMenu();};$('categories').append(b);}
 const products=filterProducts(state.menu.products,{category:state.category,search:state.search});$('products').replaceChildren(...products.map(productCard));$('empty-menu').hidden=products.length>0;
 $('results-count').textContent=products.length+' '+(products.length===1?'producto':'productos')+(state.search?' para «'+state.search+'»':' en la carta');
}
function renderPromotions(){
 $('promotions').replaceChildren();$('empty-promos').hidden=state.menu.promotions.length>0;
 for(const offer of state.menu.promotions){const card=create('article',undefined,'offer-card');card.append(create('p','OFERTA VIGENTE','eyebrow'),create('h2',offer.title),create('p',String(offer.description||'').replace(/^PROMOCIÓN FICTICIA DE PRUEBAS\.\s*/,'')));
  if(offer.price!==null&&offer.price!==undefined)card.append(create('strong',money(offer.price),'product-price'));
  if(offer.conditions)card.append(create('p',offer.conditions));
  if(offer.starts_at&&offer.ends_at){const format=s=>new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'}).format(new Date(s));card.append(create('p',format(offer.starts_at)+' — '+format(offer.ends_at)));}else card.append(create('p','Vigente al consultar esta carta. Las fechas exactas no se incluyen en esta vista.'));
  $('promotions').append(card);
 }
}
function render(){
 const menu=state.menu;document.title=menu.business.name+' · MenuIA';$('business-name').textContent=menu.business.name;
 $('business-logo').textContent=menu.business.name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
 $('business-description').textContent=menu.business.description||'Explorá la información publicada de esta carta.';
 $('source-note').textContent=connected?'Negocio ficticio de pruebas · información consultada al cargar la carta.':'Establecimiento ficticio · carta y precios ilustrativos.';
 $('demo-label').textContent=connected?'DEMO · DATOS DE PRUEBA':'DEMO · DATOS DE EJEMPLO';
 $('chat-context').textContent=menu.business.name+' · '+(connected?'carta de prueba conectada':'carta ilustrativa');
 $('connected-link').hidden=connected;
 const photo=menu.products.find(p=>safeImage(p.image,location.origin));if(photo){$('hero-image').hidden=false;$('hero-image').src=safeImage(photo.image,location.origin);$('hero-image').alt=photo.name;}else{$('hero-image').hidden=true;$('hero-caption').textContent='Fotografía no disponible';}
 $('hero-image').onerror=()=>{$('hero-image').hidden=true;$('hero-caption').textContent='Fotografía no disponible';};
 $('featured').replaceChildren(...menu.products.slice(0,3).map(productCard));
 renderMenu();renderPromotions();
 $('page-status').textContent=connected?'Carta de prueba · consultada a las '+new Date(menu.checkedAt).toLocaleTimeString('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit'}):'Una experiencia de demostración. Precios e información ilustrativos.';
}
async function readResponse(response){let data;try{data=await response.json();}catch{throw Error('No pudimos leer la respuesta. Volvé a intentar.');}if(!response.ok)throw Error(data.error||'No pudimos completar la consulta.');return data;}
async function load(){
 if(state.loading)return;state.loading=true;state.error=false;document.body.classList.add('loading');$('main').setAttribute('aria-busy','true');$('load-error').hidden=true;$('refresh-menu').disabled=true;$('page-status').textContent='Cargando carta…';
 if(!state.menu)for(const view of ['home','menu','promos'])$(view+'-view').hidden=true;
 try{
  const url=connected?'/api/kb-menu?'+new URLSearchParams({slug}):'/assets/demo-menu.json';
  const data=await readResponse(await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store'}));state.menu=validateMenu(data);if(state.category&&!data.categories.some(c=>c.id===state.category))state.category='';render();showView(state.view,{updateHash:false,focus:false});
 }catch(error){state.menu=null;state.error=true;$('load-error-message').textContent=error.message;$('load-error').hidden=false;$('page-status').textContent='Carta no disponible. No se sustituyeron los datos por ejemplos.';for(const view of ['home','menu','promos'])$(view+'-view').hidden=true;$('featured').replaceChildren();$('products').replaceChildren();}
 finally{state.loading=false;document.body.classList.remove('loading');$('main').setAttribute('aria-busy','false');$('refresh-menu').disabled=false;}
}
function showView(view,{updateHash=true,focus=true}={}){
 if(view==='chat'){openChat();return;}
 if(!['home','menu','promos'].includes(view))view='home';state.view=view;
 for(const name of ['home','menu','promos'])$(name+'-view').hidden=name!==view||state.error;
 for(const b of document.querySelectorAll('[data-view]')){if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 if(updateHash){history.replaceState(null,'',view==='home'?'#inicio':view==='menu'?'#carta':'#promos');window.scrollTo({top:0,behavior:'instant'});}if(focus)$('main').focus({preventScroll:true});
}
function openDetail(id){
 const product=state.menu?.products.find(p=>p.id===id);if(!product)return;
 // Native dialogs provide keyboard trapping and background inertness.
 detailFromChat=$('chat').open;dialogReturn=document.activeElement;if(detailFromChat)$('chat').close();state.detail=product;
 $('detail-photo').replaceChildren(image(product));$('detail-name').textContent=product.name;$('detail-price').textContent=money(product.price);$('detail-description').textContent=product.description||'';$('detail-category').textContent=state.menu.categories.find(c=>c.id===product.categoryId)?.name||'';$('detail-stock').textContent=stockLabel(product);$('detail-extra').replaceChildren();
 for(const [title,content] of [['Ingredientes declarados',product.ingredients?.join('\n')],['Alérgenos declarados',product.allergens?.join(', ')],['Información adicional',product.warning]])if(content){const section=create('section',undefined,'detail-extra');section.append(create('h3',title),create('p',content));$('detail-extra').append(section);}
 $('product-detail').showModal();document.body.classList.add('dialog-open');$('close-detail').focus();
}
function closeDetail({restore=true}={}){$('product-detail').close();state.detail=null;if(restore&&detailFromChat)$('chat').showModal();else document.body.classList.remove('dialog-open');detailFromChat=false;dialogReturn?.focus?.({preventScroll:true});}
function openChat({preserveReturn=false}={}){
 if($('chat').open)return;
 if(!preserveReturn)chatReturn=document.activeElement;
 if(!$('messages').children.length){const welcome=create('div',undefined,'chat-welcome');welcome.append(create('div','✦','spark'),create('h3','¿Qué te provoca hoy?'),create('p','Una cerveza suave, algo para compartir o una opción para tu presupuesto. Contame y exploremos esta carta.'));$('messages').append(welcome);}
 $('chat').showModal();document.body.classList.add('dialog-open');viewport();$('close-chat').focus();
}
function closeChat(){$('chat').close();document.body.classList.remove('dialog-open');chatReturn?.focus?.({preventScroll:true});}
function bubble(text,role){const p=create('div',text,'bubble '+role);$('messages').append(p);scrollMessages();}
function scrollMessages(){$('messages').scrollTop=$('messages').scrollHeight;}
async function ask(raw,{retry=false}={}){
 const message=raw.trim();if(!message||state.busy)return;
 if(!state.menu){bubble('La carta todavía no está disponible. Volvé a cargarla antes de consultar.','error');return;}
 if(message.length>500){$('chat-status').textContent='La pregunta admite hasta 500 caracteres.';return;}
 state.busy=true;state.lastQuestion=message;$('send').disabled=true;$('retry-chat').hidden=true;for(const b of suggestions)b.disabled=true;$('chat-form').setAttribute('aria-busy','true');$('chat-status').dataset.busy='true';$('chat-status').textContent='MenuIA está respondiendo…';
 if(!retry)bubble(message,'user');$('question').value='';
 try{
  const payload=connected?{message,history:state.history.slice(-6),slug,requestId:crypto.randomUUID()}:{message,history:state.history.slice(-10)};
  const result=await readResponse(await fetch(connected?'/api/kb-menu':chatOrigin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(55000)}));
  if(typeof result.answer!=='string'||!result.answer.trim())throw Error('El asistente no devolvió una respuesta.');
  bubble(result.answer,'assistant');
  const provenance=result.provider==='gemini'?'Respuesta con Gemini':result.provider==='fixture'?'Respuesta simulada · fixture local':result.responseSource==='respaldo'?'Respuesta de respaldo del servidor':result.provider==='ollama'?'Respuesta con IA local':'Respuesta basada en la carta';
  $('messages').append(create('span',provenance+' · '+(connected?'datos de prueba':'carta ilustrativa'),'response-source'));
  const mentioned=mentionedProducts(result.answer,state.menu.products);if(mentioned.length){$('messages').append(create('p','Productos mencionados en esta respuesta','small-label'));const cards=create('div',undefined,'response-products');cards.append(...mentioned.map(productCard));$('messages').append(cards);}
  state.history.push({role:'user',content:message},{role:'assistant',content:result.answer});state.history=state.history.slice(-10);$('chat-status').textContent=provenance+'.';scrollMessages();
 }catch(error){bubble(error.name==='TimeoutError'?'La consulta tardó demasiado. Podés volver a intentar.':error.message,'error');$('retry-chat').hidden=false;$('chat-status').textContent='No se completó la consulta. No mostramos una respuesta simulada como si fuera Gemini.';}
 finally{state.busy=false;$('send').disabled=false;for(const b of suggestions)b.disabled=false;$('chat-form').setAttribute('aria-busy','false');$('chat-status').dataset.busy='false';}
}
function viewport(){const v=window.visualViewport;document.documentElement.style.setProperty('--visual-height',(v?.height||innerHeight)+'px');document.documentElement.style.setProperty('--visual-top',(v?.offsetTop||0)+'px');document.body.classList.toggle('keyboard-open',document.activeElement===$('question')&&innerHeight-(v?.height||innerHeight)>120);}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>showView(b.dataset.view);
$('menu-search').oninput=e=>{state.search=e.target.value;renderMenu();};$('clear-filters').onclick=()=>{state.category='';state.search='';$('menu-search').value='';renderMenu();};
$('refresh-menu').onclick=load;$('retry-load').onclick=load;
$('close-detail').onclick=closeDetail;$('product-detail').addEventListener('cancel',e=>{e.preventDefault();closeDetail();});$('close-chat').onclick=closeChat;$('chat').addEventListener('cancel',e=>{e.preventDefault();closeChat();});
$('ask-product').onclick=()=>{const product=state.detail;if(!product)return;const question=productQuestion(product),fromChat=detailFromChat;closeDetail({restore:false});openChat({preserveReturn:fromChat});ask(question);};
$('chat-form').onsubmit=e=>{e.preventDefault();ask($('question').value);};$('retry-chat').onclick=()=>ask(state.lastQuestion,{retry:true});for(const b of suggestions)b.onclick=()=>ask(b.textContent);
window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);$('question').addEventListener('focus',viewport);$('question').addEventListener('blur',viewport);
function hashView(){const hash=location.hash;showView(hash==='#carta'?'menu':hash==='#promos'?'promos':'home',{updateHash:false,focus:false});}window.addEventListener('hashchange',hashView);hashView();viewport();load();
