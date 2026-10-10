const {test}=require('node:test');const assert=require('node:assert/strict');const {run}=require('./evaluation.js');
const rows=Array.from({length:12},(_,i)=>({question:'Pregunta '+i,answer:'Esperada',intent:'consulta'}));
test('limita a diez preguntas, conserva expectativas y no califica texto como correcto',async()=>{
 const sent=[];const result=await run(rows,{fetcher:async(url,req)=>{sent.push(JSON.parse(req.body));return {ok:true,json:async()=>({answer:'Respuesta',provider:'reglas'})}},wait:async()=>{}});
 assert.equal(sent.length,10);assert.deepEqual(sent[0],{message:'Pregunta 0',history:[]});assert.equal(result[0].expectedAnswer,'Esperada');assert.equal(result[0].status,'PENDIENTE_REVISION');assert.equal(result[0].provider,'reglas');
});
test('errores HTTP, respuesta vacía y JSON inválido quedan visibles y el lote continúa',async()=>{
 let i=0;const result=await run(rows.slice(0,3),{wait:async()=>{},fetcher:async()=>[{ok:false,status:429,json:async()=>({error:'Límite'})},{ok:true,json:async()=>({answer:''})},{ok:false,status:502,json:async()=>{throw Error('HTML')}}][i++]});
 assert.deepEqual(result.map(r=>r.status),['ERROR','SIN_RESPUESTA','ERROR']);assert.match(result[0].error,/429/);assert.match(result[2].error,/JSON/);
});
test('cancelar conserva el resultado previo y no inicia otra pregunta',async()=>{
 const controller=new AbortController();let calls=0;const result=await run(rows,{signal:controller.signal,fetcher:async()=>{calls++;return {ok:true,json:async()=>({answer:'ok'})}},onResult:()=>controller.abort()});assert.equal(calls,1);assert.equal(result.length,1);
});
test('preguntas inválidas no llaman al backend',async()=>{
 let calls=0;const result=await run([{question:'x'.repeat(501)}],{fetcher:async()=>{calls++}});assert.equal(calls,0);assert.equal(result[0].status,'ERROR');
});
