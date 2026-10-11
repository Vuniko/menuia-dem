import {buildKnowledge,answerKnowledge} from './knowledge.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const fail=(status,message)=>{const e=Error(message);e.status=status;throw e;};
export function trainingJobs(rows){
 if(!Array.isArray(rows)||rows.length<1||rows.length>10)fail(400,'Elegí de 1 a 10 preguntas.');
 return rows.map(r=>{if(!r||typeof r.question!=='string'||!r.question.trim()||r.question.length>500||typeof(r.answer||'')!=='string'||(r.answer||'').length>2000||typeof(r.category||'')!=='string'||(r.category||'').length>100)fail(400,'Revisá preguntas, expectativas y categorías.');return{question:r.question.trim(),expected_answer:r.answer||'',category:r.category||''};});
}
export async function trainingAction({action,method,body,url,restaurantId,role,supabase,query,respond,env,fetcher,bundle}){
 const read=async(table,params)=>supabase(query(table,{restaurant_id:'eq.'+restaurantId,...params}));
 const write=async(table,params,values)=>supabase(query(table,{restaurant_id:'eq.'+restaurantId,...params}),{method:'PATCH',body:values,representation:true});
 const rpc=(name,values)=>supabase('/rest/v1/rpc/'+name,{method:'POST',body:values});
 if(action==='trainingBank'&&method==='GET'){const rows=await read('training_question_banks',{select:'rows,previous_rows,updated_at',limit:'1'});respond(200,{bank:rows[0]||{rows:[],previous_rows:[],updated_at:null}});return;}
 if(action==='trainingBankSave'&&method==='POST'){
  if(!['owner','editor'].includes(role))fail(403,'Tu acceso es de solo lectura.');
  if(!Array.isArray(body.rows)||body.rows.length>5000||Buffer.byteLength(JSON.stringify(body.rows))>1800000)fail(400,'El banco admite hasta 5000 preguntas y 1,8 MB. Exportá antes de dividirlo.');
  for(const r of body.rows)if(!r||Array.isArray(r)||typeof r!=='object'||typeof r.question!=='string'||r.question.length>500||typeof(r.answer||'')!=='string'||(r.answer||'').length>10000)fail(400,'Revisá las preguntas y respuestas del banco.');
  if(body.expectedUpdatedAt!==null&&(typeof body.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(body.expectedUpdatedAt))))fail(400,'Versión del banco inválida.');
  const bank=await rpc('kb_save_training_bank',{r_id:restaurantId,bank_rows:body.rows,expected_updated_at:body.expectedUpdatedAt});respond(200,{bank});return;
 }
 if(action==='trainingList'&&method==='GET'){respond(200,{runs:await read('training_runs',{select:'id,status,question_count,created_at,started_at,completed_at',order:'created_at.desc',limit:'50'})});return;}
 const runId=method==='GET'?url.searchParams.get('runId'):body.runId;
 if(action==='trainingStart'&&method==='POST'){
  if(!['owner','editor'].includes(role))fail(403,'Solo propietarios y editores pueden evaluar.');
  if(!uuid(body.requestId))fail(400,'Identificador de evaluación inválido.');const questions=trainingJobs(body.questions);
  const knowledge=buildKnowledge(bundle,restaurantId);
  const run=await rpc('kb_start_training',{r_id:restaurantId,key_id:body.requestId,snapshot:{knowledge,questions},questions});respond(201,{run});return;
 }
 if(!uuid(runId))fail(400,'Evaluación inválida.');
 const runs=await read('training_runs',{id:'eq.'+runId,select:'*',limit:'1'});const run=runs[0];if(!run)fail(404,'No se encontró la evaluación de este negocio.');
 if(action==='trainingRead'&&method==='GET'){respond(200,{run,results:await read('training_results',{run_id:'eq.'+runId,select:'*',order:'ordinal.asc',limit:'10'})});return;}
 if(!['owner','editor'].includes(role))fail(403,'Tu acceso es de solo lectura.');
 if(action==='trainingCancel'&&method==='POST'){if(['pending','running'].includes(run.status))await write('training_runs',{id:'eq.'+runId},{status:'cancelled',completed_at:new Date().toISOString()});respond(200,{ok:true});return;}
 if(!Number.isInteger(body.ordinal)||body.ordinal<1||body.ordinal>run.question_count)fail(400,'Pregunta inválida.');
 const results=await read('training_results',{run_id:'eq.'+runId,ordinal:'eq.'+body.ordinal,select:'*',limit:'1'});const record=results[0];if(!record)fail(404,'No se encontró la pregunta.');
 if(action==='trainingReview'&&method==='POST'){
  if(!record.answer||record.error_code==='running'||!['pass','fail','review'].includes(body.verdict))fail(400,'Solo se revisan respuestas completas.');
  for(const key of ['reason','suggestedCorrection'])if(typeof(body[key]||'')!=='string'||(body[key]||'').length>2000)fail(400,'Revisión demasiado larga.');
  const rows=await write('training_results',{id:'eq.'+record.id},{verdict:body.verdict,reason:body.reason||'',suggested_correction:body.suggestedCorrection||''});respond(200,{result:rows[0]});return;
 }
 if(action!=='trainingQuestion'||method!=='POST')fail(404,'No encontrado.');
 if(record.answer||record.provider||['error','cancelled'].includes(record.verdict)){respond(200,{result:record});return;}
 const claimed=await rpc('kb_claim_training',{r_id:restaurantId,run_id:runId,question_ordinal:body.ordinal});if(claimed!==true)fail(409,'Esta pregunta ya está en curso, la evaluación venció o fue cancelada. Consultá el historial; no la enviaremos de nuevo.');
 const started=Date.now();let values;
 try{
  const knowledge=run.knowledge_snapshot?.knowledge;if(!knowledge||knowledge.restaurantId!==restaurantId)throw Error('Snapshot inválido');
  const answer=await answerKnowledge({knowledge,message:record.question,history:[],env,fetcher,reserve:async()=>{const ok=await rpc('kb_reserve_assistant',{r_id:restaurantId,request_id:record.id});if(ok!==true)fail(429,'Cupo o intervalo de Gemini alcanzado.');}});
  if(!answer.answer?.trim()||answer.answer.length>10000)throw Error('Respuesta vacía o demasiado larga');
  values={answer:answer.answer,provider:answer.provider,model:answer.model,verdict:'review',error_code:null,reason:'Pendiente de revisión humana.',latency_ms:Date.now()-started};
 }catch(e){values={answer:'',provider:null,model:null,verdict:'error',error_code:e.status===429?'quota':'assistant_error',reason:e.status===429?'Cupo o intervalo de Gemini alcanzado.':'No se pudo completar la respuesta; no se reintentó automáticamente.',latency_ms:Date.now()-started};}
 const saved=await rpc('kb_finish_training',{r_id:restaurantId,run_id:runId,question_ordinal:body.ordinal,result_values:values});respond(200,{result:saved});
}
