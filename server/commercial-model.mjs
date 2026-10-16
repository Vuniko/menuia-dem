// Diagnostics deliberately exclude prompts, model text, keys, URLs and user data.
const reasons=new Set(['STOP','MAX_TOKENS','SAFETY','RECITATION','OTHER','BLOCKLIST','PROHIBITED_CONTENT','SPII','MALFORMED_FUNCTION_CALL']);
export const transientModelCodes=new Set(['MODEL_UPSTREAM','MODEL_RATE_LIMIT','MODEL_TIMEOUT','MODEL_NETWORK']);
export async function requestModel(url,options,{fetcher=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),random=Math.random,onAttempt=()=>{}}={}){
 for(let attempt=1;attempt<=2;attempt++){
  let response;
  try{response=await fetcher(url,options);}catch(error){throw Object.assign(modelFailure(['TimeoutError','AbortError'].includes(error.name)?'MODEL_TIMEOUT':'MODEL_NETWORK'),{attempts:attempt});}
  if(response.ok)return {response,attempts:attempt};
  const error=Object.assign(upstreamFailure(response),{attempts:attempt});
  try{onAttempt({attempt,code:error.code,upstreamStatus:response.status});}catch{}
  // Retry only explicit transient HTTP failures, never an ambiguous network error.
  const retrySeconds=Number(response.headers.get('Retry-After'))||0;
  if(attempt===2||![408,500,502,503,504].includes(response.status)||retrySeconds>2)throw error;
  await response.body?.cancel();
  await sleep(Math.max(retrySeconds*1000,500+Math.floor(random()*500)));
 }
}
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
