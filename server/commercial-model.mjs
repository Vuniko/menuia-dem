// Diagnostics deliberately exclude prompts, model text, keys, URLs and user data.
const reasons=new Set(['STOP','MAX_TOKENS','SAFETY','RECITATION','OTHER','BLOCKLIST','PROHIBITED_CONTENT','SPII','MALFORMED_FUNCTION_CALL']);
export function modelFailure(code,{upstreamStatus=0,finishReason=null,retryAfter=0}={}){
 const status=code==='MODEL_RATE_LIMIT'?429:['MODEL_JSON','MODEL_SELECTION','MODEL_TRUNCATED','MODEL_BLOCKED'].includes(code)?502:503;
 return Object.assign(new Error('No pudimos completar la consulta al modelo. Puedes reintentar.'),{status,code,upstreamStatus,finishReason:reasons.has(finishReason)?finishReason:null,retryAfter});
}
export function upstreamFailure(response){
 const status=response.status;
 const raw=Number(response.headers.get('Retry-After'));
 const retryAfter=status===429?Number.isFinite(raw)&&raw>0?Math.min(120,Math.ceil(raw)):60:0;
 return modelFailure(status===429?'MODEL_RATE_LIMIT':[400,401,403,404].includes(status)?'MODEL_CONFIG':'MODEL_UPSTREAM',{upstreamStatus:status,retryAfter});
}
export function parseModelResponse(data,context){
 const candidate=data?.candidates?.[0],reason=candidate?.finishReason;
 if(reason==='MAX_TOKENS')throw modelFailure('MODEL_TRUNCATED',{finishReason:reason});
 if(data?.promptFeedback?.blockReason||reason&&reason!=='STOP')throw modelFailure('MODEL_BLOCKED',{finishReason:reason});
 let result;
 try{result=JSON.parse((candidate?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join(''));}catch{throw modelFailure('MODEL_JSON',{finishReason:reason});}
 if(!result||!['discover','recommend','compare','general','unknown'].includes(result.intent)||!Array.isArray(result.productIds)||result.productIds.length>4||result.productIds.some(id=>!context.some(p=>p.id===id)))throw modelFailure('MODEL_SELECTION',{finishReason:reason});
 return result;
}
export function diagnosticEvent(error,{requestId,elapsedMs,stage}){
 return {event:'commercial_failure',requestId,stage,code:error.code||'REQUEST_FAILED',status:error.status||503,upstreamStatus:Number.isInteger(error.upstreamStatus)?error.upstreamStatus:0,finishReason:reasons.has(error.finishReason)?error.finishReason:null,elapsedMs:Math.max(0,Math.round(elapsedMs))};
}
