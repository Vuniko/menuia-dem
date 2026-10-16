import {normalize} from '../assets/commerce-v3-model.mjs';
import {salesContext,salesCandidates,salesReply} from './sales-agent.mjs';
import {executeCommercialSkill} from './commercial-skills.mjs';

/**
 * MenuIA Sales Orchestrator V2: trusted routing plan, no side effects.
 * It does not call Gemini or use client-supplied product facts.
 * All catalog entries must already have passed the publicCatalog validator.
 */
export function classifySalesIntent(message,state={}){
 const q=normalize(String(message||''));
 if(/\b(pago|garantia|devoluc|envio|delivery|entrega|descuento|promocion|pedido|reserva)\b/.test(q))return 'policy';
 if(/compar|\b(diferencia|versus|vs)\b/.test(q))return 'compare';
 if(/\b(mas barato|muy caro|carisimo|economico|no me convence|no me gusta)\b/.test(q))return 'objection';
 if(/\b(me lo llevo|me quedo|agregar al carrito|comprarlo|lo quiero)\b/.test(q))return 'cart_help';
 if(/\b(talla|talle|color|stock|disponib|negro|negra|blanco|blanca|azul|rojo|roja|verde)\b/.test(q)&&state.productId)return 'variant';
 if(/\b(precio|cuanto cuesta|que incluye|detalles)\b/.test(q)&&state.productId)return 'product_detail';
 if(/\b(recomiend|suger|opciones|alternativas|presupuesto|soles|hasta s\/)\b/.test(q))return 'recommend';
 if(/\b(catalogo|productos|zapatillas|ropa|tecnologia|camisa|polo)\b/.test(q))return 'browse';
 if(/\b(que es|que significa|como elegir)\b/.test(q))return 'general';
 if(/^(hola|buenas|buen dia|quiero comprar algo|busco algo|ayudame|no se que comprar)[.! ]*$/.test(q)||!state.category&&!state.productId&&!state.budget)return 'discovery';
 return 'recommend';
}
const SKILLS=Object.freeze({
 policy:'answerStorePolicies',compare:'compareProducts',objection:'handleObjection',
 cart_help:'guideCart',variant:'resolveVariants',product_detail:'retrieveCatalog',
 recommend:'recommendProducts',browse:'retrieveCatalog',general:'answerGeneral',
 discovery:'discoverNeeds'
});
export function createSalesPlan(c,message,history=[],productId=null,memory=null){
 if(!c||!c.business||!Array.isArray(c.products)||!Array.isArray(c.variants))throw new TypeError('Catálogo comercial inválido');
 const state=salesContext(c,message,history,productId,memory);
 const intent=classifySalesIntent(message,state);
 const skill=SKILLS[intent];
 const requestedIds=(()=>{const names=c.products.filter(p=>normalize(message).includes(normalize(p.name)));if(names.length>=2)return names.map(p=>p.id);return Array.isArray(state.shownProductIds)&&/ambos|esas opciones|esos dos|los dos/.test(normalize(message))?state.shownProductIds.slice(0,2):[];})();
 // When comparing two named products, colors mentioned in their names are not a global filter.
 const candidateState=skill==='compareProducts'&&requestedIds.length>=2?{...state,color:undefined,size:undefined}:state;
 const eligible=salesCandidates(c,candidateState,message);
 const skillResult=executeCommercialSkill(skill,{catalog:c,message,state,candidates:eligible,requestedIds});
 return {intent,skill,state,eligible,skillResult};
}
export function respondWithSalesPlan(c,message,plan){
 if(!plan||!plan.state||!SKILLS[plan.intent])throw new TypeError('Plan comercial inválido');
 const base=salesReply(c,message,plan.state);
 if(plan.intent==='compare'&&plan.skillResult?.complete){
  const items=plan.skillResult.items;
  plan.state.shownProductIds=items.map(x=>x.productId);
  return {...base,answer:(c.isDemonstration?'Demostración: precios y stock ficticios.\\n':'')+plan.skillResult.answer,products:items.map(x=>x.productId),variantIds:items.map(x=>x.variantId),memory:plan.state,provider:'catalog'};
 }
 return {...base,provider:'catalog'};
}
