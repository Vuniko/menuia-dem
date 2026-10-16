// Gemini can supply an optional short, personable opening. Only catalog code can
// assert product facts, prices, availability, policies or cart actions.
import {normalize} from '../assets/commerce-v3-model.mjs';

export function safeGeminiOpening(value,catalog){
 if(typeof value!=='string')return null;
 const s=value.trim();
 if(s.length<6||s.length>115||/\n|\r|[0-9$€]|https?:|www\.|[<>\\{}\[\]#*]/i.test(s))return null;
 if(!/^[\p{L}\p{M}\s¡!¿?.,;:'’—-]+$/u.test(s))return null;
 const q=normalize(s);
 if(/\b(precio|soles|stock|disponib|oferta|promocion|descuento|garantia|envio|delivery|entrega|pago|reserva|comprado|pedido|gratis|agotado|cantidad|unidades|aseguro|confirmado|confirmada|humano|persona real|instruccion|sistema|api|clave|token)\b/.test(q))return null;
 if((catalog?.products||[]).some(p=>q.includes(normalize(p.name))))return null;
 // Short acknowledgement, not an extra question competing with the sales planner.
 if(s.includes('?')||s.includes('¿'))return null;
 return s;
}

export function withNaturalOpening(base,opening,{isDemonstration=false}={}){
 if(!opening)return base;
 const prefix=isDemonstration?'Demostración: precios y stock ficticios.\n':'';
 const body=isDemonstration&&base.startsWith(prefix)?base.slice(prefix.length):base;
 return prefix+opening+'\n'+body;
}
