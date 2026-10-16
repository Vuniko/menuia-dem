import {normalize,money} from '../assets/commerce-v3-model.mjs';

// Pure, server-side commercial skills. Catalog facts come only from validated published data.
const price=({p,v})=>v.priceCents??p.priceCents;
const unique=rows=>[...new Map(rows.map(row=>[row.p.id,row])).values()];
const facts=({p,v})=>({productId:p.id,variantId:v.id,name:p.name,priceCents:price({p,v}),attributes:{...v.attributes},quantity:v.stock.quantity});
function safeRows(c,rows){
 const ids=new Set(c.products.map(p=>p.id));
 const validVariants=new Map(c.variants.map(v=>[v.id,v]));
 return unique(rows.filter(({p,v})=>ids.has(p.id)&&validVariants.get(v.id)?.productId===p.id&&Number.isInteger(v.stock?.quantity)&&v.stock.quantity>0&&Number.isInteger(price({p,v}))&&price({p,v})>0));
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
export const skillRegistry=Object.freeze({discoverNeeds,retrieveCatalog,recommendProducts,compareProducts,handleObjection});
export function executeCommercialSkill(name,ctx){
 const fn=skillRegistry[name];
 return fn?fn(ctx):null;
}
