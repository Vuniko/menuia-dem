(function(root){
 'use strict';
 const sleep=(ms,signal)=>new Promise((resolve,reject)=>{if(signal?.aborted)return reject(new Error('Cancelado'));const cancel=()=>{clearTimeout(timer);reject(new Error('Cancelado'))};const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve()},ms);signal?.addEventListener('abort',cancel,{once:true})});
 async function run(rows,{endpoint='/api/chat',signal,onResult=()=>{},delay=5500,fetcher=fetch,wait=sleep}={}){
  const results=[];for(const row of rows.slice(0,10)){
   if(signal?.aborted)break;if(results.length){try{await wait(delay,signal)}catch{break}}if(signal?.aborted)break;
   const started=Date.now();let record={question:row.question,expectedAnswer:row.answer||'',expectedIntent:row.intent||'',category:row.category||'',source:row.source||'',sourceRow:row.sourceRow,status:'ERROR',answer:'',error:'',provider:null,model:null};
   try{
    if(!row.question?.trim()||row.question.length>500)throw Error('Pregunta vacía o de más de 500 caracteres');
    const controller=new AbortController();const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});const timeout=setTimeout(()=>controller.abort(),55000);
    try{const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:row.question,history:[]}),signal:controller.signal});let body;try{body=await response.json()}catch{throw Error('El servidor no devolvió JSON (HTTP '+response.status+')')}
     if(!response.ok)throw Error('HTTP '+response.status+': '+(body.error||'No se pudo consultar la IA'));
     record.answer=typeof body.answer==='string'?body.answer:'';record.provider=body.provider||'no informado';record.model=body.model||null;record.responseSource=body.responseSource||null;record.status=record.answer.trim()?'PENDIENTE_REVISION':'SIN_RESPUESTA';
    }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel)}
   }catch(e){record.error=signal?.aborted?'Cancelado':e.name==='AbortError'?'Tiempo de espera agotado':String(e.message);if(signal?.aborted)record.status='CANCELADO'}
   record.ms=Date.now()-started;results.push(record);onResult(record,results.length);if(signal?.aborted)break;
  }return results;
 }
 const api={run};if(typeof module!=='undefined')module.exports=api;else root.MenuIAEvaluation=api;
})(globalThis);
