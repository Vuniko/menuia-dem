import {normalize} from '../assets/commerce-v3-model.mjs';
import {salesContext,salesCandidates,salesReply} from './sales-agent.mjs';

/**
 * MenuIA Sales Orchestrator V2: trusted routing plan, no side effects.
 * It does not call Gemini or use client-supplied product facts.
 * All catalog entries must already have passed the publicCatalog validator.
 */
export function classifySalesIntent(message,state={}){
 const q=normalize(String(message||''));
 if(/\b(pago|garantia|devoluc|envio|delivery|entrega|descuento|promocion|pedido|reserva)\b/.test(q))return 'policy';
 if(/\b(compar|diferencia|versus|vs)\b/.test(q))return 'compare';
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
 const eligible=salesCandidates(c,state,message);
 return {intent,skill:SKILLS[intent],state,eligible};
}
export function respondWithSalesPlan(c,message,plan){
 if(!plan||!plan.state||!SKILLS[plan.intent])throw new TypeError('Plan comercial inválido');
 return {...salesReply(c,message,plan.state),provider:'catalog'};
}
