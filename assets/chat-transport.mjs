export class ChatFailure extends Error{
 constructor(message,{status=0,retryAfter=0}={}){super(message);this.name='ChatFailure';this.status=status;this.retryAfter=retryAfter;}
}
export function chatPayload({message,history=[],connected=false,slug,requestId}){
 if(typeof message!=='string'||!message.trim()||message.length>500)throw new ChatFailure('Escribí una pregunta de hasta 500 caracteres.');
 const entries=history.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,700).replace(/[\uD800-\uDBFF]$/,'')}));
 const pairs=[];for(let i=0;i<entries.length-1;i++)if(entries[i].role==='user'&&entries[i+1].role==='assistant'){pairs.push(entries[i],entries[i+1]);i++;}
 const payload=connected?{message,history:pairs.slice(-6),slug,requestId}:{message,history:pairs.slice(-10)};
 const budget=connected?7600:3800;
 while(new TextEncoder().encode(JSON.stringify(payload)).length>budget&&payload.history.length)payload.history.splice(0,2);
 if(new TextEncoder().encode(JSON.stringify(payload)).length>budget)throw new ChatFailure('La consulta es demasiado grande. Probá una pregunta más corta.');
 return payload;
}
export async function readChatResponse(response){
 let data;try{data=await response.json();}catch{data=null;}
 if(!response.ok){
  const status=response.status;
  if(status===429){const seconds=Number(response.headers.get('Retry-After'));throw new ChatFailure('Hiciste varias consultas seguidas. Esperá un minuto para continuar; tu pregunta está guardada.',{status,retryAfter:Number.isFinite(seconds)&&seconds>0?Math.min(seconds,120):60});}
  const message=status>=500?'El asistente tuvo una interrupción temporal. Tu pregunta sigue aquí; podés reintentar.':status===400?'No pudimos enviar esta pregunta. Podés editarla y volver a intentar.':status===401||status===403?'No pudimos autorizar la consulta. Actualizá esta página y volvé a intentar.':'No pudimos completar la consulta. Tu pregunta sigue aquí.';
  throw new ChatFailure(message,{status});
 }
 if(typeof data?.answer!=='string'||!data.answer.trim())throw new ChatFailure('La respuesta no llegó completa. Tu pregunta sigue aquí; podés reintentar.');
 return data;
}
export async function requestChat(url,payload,{fetcher=fetch,timeoutMs=55000}={}){
 // One request only: an ambiguous network failure may already have consumed
 // Gemini tokens. The user decides when to retry; never duplicate a POST.
 try{return await readChatResponse(await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeoutMs)}));}
 catch(error){if(error instanceof ChatFailure)throw error;throw new ChatFailure(['TimeoutError','AbortError'].includes(error.name)?'La respuesta tardó demasiado. Tu pregunta sigue aquí; podés reintentar.':'La conexión se interrumpió. Revisá tu Internet; tu pregunta sigue aquí.');}
}
