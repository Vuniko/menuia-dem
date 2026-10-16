import {normalize,money} from '../assets/commerce-v3-model.mjs';

// Pure, server-side commercial skills. Catalog facts come only from validated published data.
const price=({p,v})=>v.priceCents??p.priceCents;
const unique=rows=>[...new Map(rows.map(row=>[row.p.id,row])).values()];
const facts=({p,v})=>({productId:p.id,variantId:v.id,name:p.name,priceCents:price({p,v}),attributes:{...v.attributes},quantity:v.stock.quantity});
function safeRows(c,rows){
 const products=new Map(c.products.map(p=>[p.id,p]));
 const variants=new Map(c.variants.map(v=>[v.id,v]));
 if(!Array.isArray(rows))return [];
 return unique(rows.flatMap(row=>{
  const p=products.get(row?.p?.id),v=variants.get(row?.v?.id);
  if(!p||!v||v.productId!==p.id||!Number.isSafeInteger(v.stock?.quantity)||v.stock.quantity<=0)return [];
  const amount=v.priceCents??p.priceCents;
  return Number.isSafeInteger(amount)&&amount>0?[{p,v}]:[];
 }));
}
export function discoverNeeds({catalog,state}){
 const missing=[];
 if(!state.category&&!state.interest&&!state.use)missing.push('categoryOrUse');
 if(state.budget===undefined)missing.push('budget');
 return {skill:'discoverNeeds',missing,nextQuestion:missing.includes('categoryOrUse')?'¿Qué tipo de producto estás buscando o para qué lo usarías?':missing.includes('budget')?'¿Hasta cuánto te gustaría gastar?':null};
}
export function retrieveCatalog({catalog,candidates,limit=4}){
 const rows=safeRows(catalog,candidates);
 return {skill:'retrieveCatalog',items:rows.slice(0,Math.max(0,Math.min(4,limit))).map(facts),total:rows.length};
}
export function recommendProducts({catalog,candidates,state,limit=3}){
 const allowed=safeRows(catalog,candidates).filter(row=>state.budget===undefined||price(row)<=state.budget);
 const rows=allowed.sort((a,b)=>price(a)-price(b)||a.p.name.localeCompare(b.p.name,'es')).slice(0,Math.max(0,Math.min(3,limit)));
 return {skill:'recommendProducts',items:rows.map(facts),total:allowed.length,reason:state.budget!==undefined?'Opciones individuales dentro del presupuesto y con existencias publicadas.':'Opciones disponibles según las preferencias indicadas.'};
}
export function compareProducts({catalog,candidates,requestedIds=[]}){
 const allowed=safeRows(catalog,candidates);
 const ids=[...new Set(requestedIds.filter(id=>typeof id==='string'))].slice(0,2);
 const rows=ids.length===2?ids.map(id=>allowed.find(x=>x.p.id===id)).filter(Boolean):allowed.slice(0,2);
 if(rows.length<2)return {skill:'compareProducts',items:rows.map(facts),complete:false,answer:'Para compararlos necesito dos productos disponibles que coincidan con tus preferencias. ¿Cuáles querés comparar?'};
 const items=rows.map(facts);
 const amounts=items.map(x=>money(x.priceCents));
 const shared=[...new Set(items.flatMap(x=>Object.keys(x.attributes)))];
 const lines=shared.map(k=>k+': '+items.map(x=>String(x.attributes[k]??'No especificado')).join(' / '));
 const answer='Comparación según el catálogo publicado: '+items[0].name+' ('+amounts[0]+') y '+items[1].name+' ('+amounts[1]+').'+(lines.length?' '+lines.join('. ')+'.':'')+' Las existencias pueden cambiar. ¿Qué característica te importa más?';
 return {skill:'compareProducts',items,complete:true,answer};
}
export function handleObjection({catalog,candidates,state,message}){
 const q=normalize(message),reference=catalog.products.find(p=>p.id===state.productId);
 if(/mas barato|muy caro|carisimo|economico/.test(q)){
  const options=safeRows(catalog,candidates).filter(x=>!reference||(x.p.categoryId===reference.categoryId&&price(x)<reference.priceCents));
  const rows=options.slice(0,3);
  return {skill:'handleObjection',type:'price',items:rows.map(facts),answer:rows.length?'Encontré alternativas más económicas disponibles en el catálogo.':'No encontré una alternativa más económica disponible con esas condiciones. Podemos cambiar alguna preferencia o el presupuesto.'};
 }
 return {skill:'handleObjection',type:'preference',items:[],answer:'Entiendo. ¿Qué cambiarías del producto: el estilo, el color o el precio?'};
}
export function resolveVariants({catalog,state={},candidates=[]}){
 const product=catalog.products.find(p=>p.id===state.productId);
 if(!product)return {skill:'resolveVariants',status:'need_product',items:[],answer:'¿De qué producto querés consultar la talla o el color?'};
 const variants=catalog.variants.filter(v=>v.productId===product.id);
 const available=variants.filter(v=>Number.isSafeInteger(v.stock?.quantity)&&v.stock.quantity>0);
 const matches=available.filter(v=>(!state.color||normalize(v.attributes?.color)===normalize(state.color))&&(!state.size||normalize(v.attributes?.talla)===normalize(state.size))&&(state.budget===undefined||(v.priceCents??product.priceCents)<=state.budget));
 const matched=safeRows(catalog,matches.map(v=>({p:product,v})));
 if(!matched.length)return {skill:'resolveVariants',status:'unavailable',items:[],answer:'No encuentro una variante disponible de '+product.name+' con esas preferencias. ¿Querés cambiar la talla o el color?'};
 const distinct=[...new Map(matched.map(({p,v})=>[v.id,facts({p,v})])).values()].slice(0,12);
 const needChoice=distinct.length>1;
 return {skill:'resolveVariants',status:needChoice?'choose_variant':'available',items:distinct,selectedVariantId:needChoice?null:distinct[0].variantId,answer:needChoice?'Encontré varias variantes disponibles de '+product.name+'. Elegí una talla y color en la ficha para continuar.':'La variante consultada de '+product.name+' figura disponible. Revisá el precio y las existencias en su ficha; pueden cambiar.'};
}
export function guideCart({catalog,state={}}){
 const product=catalog.products.find(p=>p.id===state.productId);
 if(!product)return {skill:'guideCart',status:'need_product',items:[],canAdd:false,answer:'¿Qué producto te gustaría agregar al carrito?'};
 const available=catalog.variants.filter(v=>v.productId===product.id&&Number.isSafeInteger(v.stock?.quantity)&&v.stock.quantity>0&&(!state.size||normalize(v.attributes?.talla)===normalize(state.size))&&(!state.color||normalize(v.attributes?.color)===normalize(state.color))&&(state.budget===undefined||(v.priceCents??product.priceCents)<=state.budget));
 const rows=safeRows(catalog,available.map(v=>({p:product,v})));
 if(!rows.length)return {skill:'guideCart',status:'unavailable',items:[],canAdd:false,answer:'Esa combinación no está disponible al consultar. Podemos revisar otra talla o color antes de continuar.'};
 if(rows.length!==1)return {skill:'guideCart',status:'choose_variant',items:rows.slice(0,12).map(facts),canAdd:false,answer:'¡Buena elección! Abrí la ficha de '+product.name+' y seleccioná la variante que quieras antes de añadirla al carrito.'};
 return {skill:'guideCart',status:'ready_for_product_page',items:rows.map(facts),selectedVariantId:rows[0].v.id,canAdd:false,answer:'¡Genial! La variante de '+product.name+' figura disponible. Abrí su ficha para comprobar los datos y añadirla al carrito. No se realizó ninguna compra ni reserva.'};
}
export const skillRegistry=Object.freeze({discoverNeeds,retrieveCatalog,recommendProducts,compareProducts,handleObjection,resolveVariants,guideCart});
export function executeCommercialSkill(name,ctx){
 const fn=skillRegistry[name];
 return fn?fn(ctx):null;
}
