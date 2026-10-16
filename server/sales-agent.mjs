import {normalize,money} from '../assets/commerce-v3-model.mjs';

// Memory contains preferences, never authoritative catalog facts or model instructions.
export function salesContext(c,message,history=[],productId=null,memory=null){
 const state={slug:c.business.slug};
 if(memory?.slug===state.slug){
  if(Number.isSafeInteger(memory.budget)&&memory.budget>=0&&memory.budget<=100000000)state.budget=memory.budget;
  if(c.categories.some(x=>x.id===memory.category))state.category=memory.category;
  for(const k of ['color','size','recipient','use','style'])if(typeof memory[k]==='string'&&memory[k].length<=40)state[k]=memory[k];
  if(c.products.some(p=>p.id===memory.productId))state.productId=memory.productId;
  if(['budget','interest','product','preference','color','style'].includes(memory.pending))state.pending=memory.pending;
  for(const key of ['shownProductIds','excludedProductIds'])if(Array.isArray(memory[key]))state[key]=[...new Set(memory[key].filter(id=>c.products.some(p=>p.id===id)))].slice(0,4);
  if(Array.isArray(memory.excludedColors))state.excludedColors=memory.excludedColors.filter(x=>typeof x==='string'&&x.length<=30).slice(0,3);
 }
 const read=raw=>{
  const q=normalize(raw);
  if(/empezar de nuevo|otra busqueda|olvida mis preferencias/.test(q))for(const k of Object.keys(state))if(k!=='slug')delete state[k];
  const budget=/(?:s\/\s*|presupuesto\s*(?:de\s*)?|hasta\s+|menos de\s+|por\s+)(\d+(?:[.,]\d{1,2})?)/.exec(q)||/(\d+(?:[.,]\d{1,2})?)\s*soles/.exec(q);
  if(budget)state.budget=Math.round(Number(budget[1].replace(',','.'))*100);
  if(state.pending==='budget'&&/^\d{1,6}(?:[.,]\d{1,2})?$/.test(q))state.budget=Math.round(Number(q.replace(',','.'))*100);
  if(/sin limite|sin presupuesto/.test(q))delete state.budget;
  const category=/zapatilla|calzado/.test(q)?'zapatillas':/tecnologia|laptop|tablet|audifono|teclado|mouse|parlante/.test(q)?'tecnologia':/ropa|polo|camisa|casaca|vestido|pantalon/.test(q)?'ropa':null;
  if(category){if(state.category&&state.category!==category){for(const key of ['productId','color','size','use','shownProductIds'])delete state[key];}state.category=category;}
  const color=/\b(negro|negra|blanco|blanca|azul|gris|rojo|roja|verde|arena|beige)\b/.exec(q);
  if(color){const value=color[1].replace(/negra/,'negro').replace(/blanca/,'blanco').replace(/roja/,'rojo');if(new RegExp('\\b(?:no(?:\\s+me\\s+gusta)?|sin|menos|excepto)\\s+(?:(?:el|en)\\s+)?'+color[1]+'\\b').test(q)){state.excludedColors=[...new Set([...(state.excludedColors||[]),value])].slice(-3);if(state.color===value)delete state.color;}else{state.color=value;state.excludedColors=state.excludedColors?.filter(x=>x!==value);}}
  const size=/\b(?:talla|talle)\s*:?\s+(xxl|xl|xs|s|m|l|\d{2})\b/.exec(q);if(size)state.size=size[1];
  if(/cualquier color/.test(q)){delete state.color;delete state.excludedColors;}
  if(/cualquier talla|cualquier talle/.test(q))delete state.size;
  const recipient=/\b(?:para\s+mi\s+)(hermano|hermana|madre|padre|pareja|amigo|amiga|hijo|hija)\b/.exec(q);if(recipient)state.recipient=recipient[1];
  const use=/\b(correr|trabajo|estudiar|viajar|deporte|diario)\b/.exec(q);if(use)state.use=use[1];
  const style=/\b(casual|informal|formal|deportivo|minimalista)\b/.exec(q);if(style)state.style=style[1];
  if(/musica|escuchar|canciones/.test(q)&&!category){state.use='música';state.category='tecnologia';delete state.productId;delete state.size;}
  if(/otro tipo de producto|otra categoria/.test(q))for(const key of ['category','productId','color','size','use','shownProductIds'])delete state[key];
  const ordinal=/\b(primero|primer|segundo|tercero|ultimo)\b/.exec(q);
  if(ordinal&&state.shownProductIds?.length){const i=ordinal[1]==='segundo'?1:ordinal[1]==='tercero'?2:ordinal[1]==='ultimo'?state.shownProductIds.length-1:0;const p=c.products.find(p=>p.id===state.shownProductIds[i]);if(p){state.productId=p.id;state.category=p.categoryId;}}
  const named=c.products.filter(p=>q.includes(normalize(p.name)));if(named.length===1){state.productId=named[0].id;state.category=named[0].categoryId;}
  if(named.length===1&&state.use==='música'&&!/audifono|parlante|musica|sonido/.test(normalize(named[0].name+' '+named[0].description)))delete state.use;
  if(/no me gusta|no me convence/.test(q)&&!color&&state.productId)state.excludedProductIds=[...new Set([...(state.excludedProductIds||[]),state.productId])].slice(-4);
  if(named.length===1&&!/no me gusta|no me convence/.test(q))state.excludedProductIds=state.excludedProductIds?.filter(id=>id!==named[0].id);
  if(named.length>1&&/compar|diferencia|versus|\bvs\b/.test(q)){delete state.category;delete state.productId;}
 };
 // Only reconstruct from user turns. Assistant prose and foreign names cannot supply facts.
 if(!memory)for(const m of history)if(m.role==='user')read(m.content);
 if(productId)state.productId=productId;
 read(message);
 return state;
}
const price=(p,v)=>v.priceCents??p.priceCents;
export function salesCandidates(c,state,message){
 const q=normalize(message),reference=c.products.find(p=>p.id===state.productId);
 const cheaper=/mas barato|muy caro|carisimo|economico/.test(q);
 const terms=[...new Set(c.products.flatMap(p=>normalize(p.name).split(/\W+/)))].filter(t=>t.length>3&&new RegExp('\\b'+t+'\\b').test(q)&&!['negro','blanco','verde','arena','beige'].includes(t));
 return c.products.flatMap(p=>{
  if(state.excludedProductIds?.includes(p.id))return [];
  if(state.use==='música'&&!terms.length&&!/compar|versus|\bvs\b/.test(q)&&!/audifono|parlante|musica|sonido/.test(normalize(p.name+' '+p.description)))return [];
  if(terms.length&&!terms.some(t=>normalize(p.name).split(/\W+/).includes(t)))return [];
  if(state.category&&p.categoryId!==state.category)return [];
  if(cheaper&&reference&&p.categoryId!==reference.categoryId)return [];
  const variants=c.variants.filter(v=>v.productId===p.id&&v.stock.quantity>0&&
   (state.budget===undefined||price(p,v)<=state.budget)&&
   (!cheaper||!reference||price(p,v)<reference.priceCents)&&
   (!state.color||normalize(v.attributes.color).replace(/negra/,'negro').replace(/blanca/,'blanco').replace(/roja/,'rojo')===state.color)&&
   (!state.size||normalize(v.attributes.talla)===state.size));
  const allowed=variants.filter(v=>!state.excludedColors?.includes(normalize(v.attributes.color).replace(/negra/,'negro').replace(/blanca/,'blanco').replace(/roja/,'rojo')));
  if(!allowed.length)return [];
  allowed.sort((a,b)=>price(p,a)-price(p,b));return [{p,v:allowed[0]}];
 }).sort((a,b)=>price(a.p,a.v)-price(b.p,b.v));
}
export function salesReply(c,message,state,{intent,productIds=[]}={}){
 const q=normalize(message),all=c.products.filter(p=>q.includes(normalize(p.name)));
 const policy=/pago|garantia|devoluc|envio|delivery|entrega|descuento|promocion|pedido|reserva|compralo/.test(q);
 const response=(answer,choices=[])=>{if(choices.length){state.shownProductIds=choices.map(x=>x.p.id);state.pending='product';}return {answer:(c.isDemonstration?'Demostración: precios y stock ficticios.\n':'')+answer,products:[...new Set(choices.map(x=>x.p.id))],variantIds:choices.map(x=>x.v.id),memory:state,checkedAt:c.checkedAt};};
 const ask=(answer,pending)=>{state.pending=pending;return response(answer);};
 if(policy)return response('No tenemos información confirmada de esa condición comercial en este catálogo. Puedo ayudarte a elegir y luego consultar esos detalles con la tienda. Esta vista no confirma pedidos ni procesa pagos.');
 if(/ignora|system prompt|api.key|secret|otra tienda|otro negocio|instrucciones internas/.test(q))return response('Soy el asesor virtual de esta tienda. Puedo orientarte con su catálogo publicado. ¿Qué tipo de producto buscas?');
 if(/^(?:muchas )?gracias[!. ]*$/.test(q))return response('¡Con gusto! Si quieres, podemos comparar opciones antes de que elijas.');
 if(/no me gusta|no me convence/.test(q)&&!/\b(negro|negra|blanco|blanca|azul|gris|rojo|roja|verde|arena|beige)\b/.test(q))return ask('Entiendo. ¿Qué cambiarías: el estilo, el color o el precio? Buscaré otra opción con eso en cuenta.','preference');
 if(state.pending==='preference'&&/^(?:el )?precio$/.test(q))return ask('¿Cuál sería un precio cómodo para ti?','budget');
 if(state.pending==='preference'&&/^(?:el )?color$/.test(q))return ask('¿Qué color prefieres?','color');
 if(state.pending==='preference'&&/^(?:el )?estilo$/.test(q))return ask('¿Buscas algo casual, formal o deportivo?','style');
 if(/que es el algodon|que significa algodon|que es bluetooth|como elegir/.test(q))return response(/bluetooth/.test(q)?'Como orientación general, Bluetooth permite conectar dispositivos cercanos sin cable. Que un producto lo incluya debe constar en su ficha. ¿Qué equipo estás considerando?':'Como orientación general, conviene elegir según el uso, la comodidad y el presupuesto. Las características concretas solo puedo confirmarlas cuando figuran en la ficha. ¿Qué producto te interesa?');
 const candidates=salesCandidates(c,state,message);
 const compare=intent==='compare'||/compar|diferencia|\bversus\b|\bvs\b/.test(q);
 const follow=/este|esta|ese|esa|talla|talle|color|cuanto|precio|cuesta|stock|disponib|\ben negro\b|primero|primer|segundo|tercero|ultimo|me quedo|me llevo|lo quiero/.test(q);
 const reference=c.products.find(p=>p.id===state.productId);
 const browsing=/catalogo|que tienen|que hay|productos|recomiend|muestrame/.test(q);
 if(!state.category&&!state.use&&!all.length&&!browsing&&!compare&&!reference){
  if(state.budget===undefined)return ask((state.pending?'':('¡Hola! Soy el asesor virtual de '+c.business.name+'. '))+(state.recipient?'Para el regalo de tu '+state.recipient+', ':'')+'¿Con qué presupuesto te gustaría empezar?','budget');
  return ask('Con hasta '+money(state.budget)+(state.recipient?' para tu '+state.recipient:'')+', podemos afinar la búsqueda. '+(state.recipient?'¿Qué le gusta o qué tipo de producto tienes en mente?':'¿Qué tipo de producto buscas o para qué lo usarías?'),'interest');
 }
 if(follow&&!reference&&state.shownProductIds?.length>1&&!all.length)return ask('¿A cuál te refieres: '+state.shownProductIds.map(id=>c.products.find(p=>p.id===id)?.name).filter(Boolean).join(' o ')+'?','product');
 let choices=[];
 const compareIds=all.length>1?all.map(p=>p.id):/ambos|esas opciones|esos dos|los dos/.test(q)?state.shownProductIds?.slice(0,2)||[]:[];
 if(compare&&compareIds.length>1){
  choices=candidates.filter(x=>compareIds.includes(x.p.id)).slice(0,4);
 }else if((all.length||follow)&&reference&&!/mas barato|muy caro|economico/.test(q)){
  choices=candidates.filter(x=>x.p.id===reference.id);
  if(!choices.length){
   const variants=c.variants.filter(v=>v.productId===reference.id);
   return response('Para '+reference.name+' no encuentro una variante disponible que cumpla tus preferencias. '+(variants.every(v=>v.stock.quantity===0)?'Figura agotado al consultar. ':'')+'¿Quieres cambiar el color, la talla o buscar otra opción?');
  }
 }else if(productIds.length)choices=productIds.flatMap(id=>candidates.filter(x=>x.p.id===id)).filter((x,i,arr)=>arr.findIndex(y=>y.p.id===x.p.id)===i).slice(0,3);
 else if(intent!=='discover'&&(state.category||state.budget!==undefined||/catalogo|que tienen|que hay|productos|mas barato|muy caro/.test(q)))choices=candidates.slice(0,3);
 if(!choices.length){
  if(intent==='discover'&&candidates.length){if(state.budget===undefined)return ask('¿Hasta cuánto te gustaría gastar?','budget');return ask('¿Cuál te interesa: '+candidates.slice(0,3).map(x=>x.p.name).join(', ')+'?','product');}
  if(compare)return response('¿Qué dos productos te gustaría comparar? Dime sus nombres para revisar sus precios y variantes.');
  if(state.category||state.budget!==undefined||state.color||state.size)return response('No encontré opciones disponibles con esas preferencias. ¿Podemos cambiar el presupuesto o el tipo de producto?');
  if(/gracias/.test(q))return response('¡Con gusto! Si quieres, podemos comparar opciones antes de que elijas.');
  if(/algodon|bluetooth|como elegir|que conviene|que significa/.test(q))return response('Como orientación general, conviene elegir según el uso, la comodidad y el presupuesto. Las características concretas solo puedo confirmarlas cuando figuran en la ficha. ¿Qué producto te interesa?');
  return response('¡Hola! Soy el asesor virtual de '+c.business.name+'. '+(state.recipient?'Busquemos un regalo para tu '+state.recipient+'. ':'')+'¿Qué tipo de producto buscas y cuánto te gustaría gastar?');
 }
 const facts=choices.map(({p,v})=>p.name+' — '+money(price(p,v))+'. '+Object.entries(v.attributes).map(([k,value])=>k+': '+value+'.').join(' ')+' '+(v.stock.quantity>0?v.stock.quantity+' unidades al consultar.':'Agotado al consultar.'));
 const intro=compare?'Podemos compararlos por precio y variantes publicadas:':/muy caro|mas barato|economico/.test(q)?'Estas opciones cuestan menos que la anterior:':follow&&reference?'Esto es lo publicado para '+reference.name+':':state.recipient?'Para tu '+state.recipient+', estas opciones encajan con lo que me cuentas:':'Estas opciones coinciden con lo que buscas:';
 if(choices.length===1)state.productId=choices[0].p.id;
 else delete state.productId;
 let next=compare?'¿Qué te importa más para elegir?':/me quedo|me llevo|lo quiero/.test(q)?'Puedes abrir su ficha para revisar la variante y añadirla a tu selección; esta vista no confirma pedidos.':follow&&reference?'Puedes abrir la ficha para revisar esa combinación.':!state.use?'¿Para qué lo usarías?':'¿Cuál de estas opciones te interesa?';
 return response(intro+'\n'+facts.join('\n')+'\n'+(!follow&&state.budget!==undefined?'Los precios individuales respetan tu presupuesto. ':'')+next+' Las existencias pueden cambiar.',choices);
}
