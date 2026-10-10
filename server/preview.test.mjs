import {test} from 'node:test';
import assert from 'node:assert/strict';
process.env.GEMINI_API_KEY='synthetic-test-credential';
process.env.VERCEL_ENV='preview';
process.env.VERCEL_URL='menuia-test.vercel.app';
const {default:chat}=await import('../api/chat.mjs');
const {default:check}=await import('../api/gemini-check.mjs');
function response(){return {statusCode:200,headersSent:false,writeHead(code,headers){this.statusCode=code;this.headers=headers;this.headersSent=true},end(body){this.body=body}}}
test('Preview: body procesado, origen exacto y reglas identificadas',async()=>{
 const res=response();await chat({headers:{origin:'https://menuia-test.vercel.app'},method:'POST',body:{message:'¿Cuánto cuesta la pizza margarita?'}},res);assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).provider,'reglas');
});
test('prueba explícita consulta Gemini incluso para un precio con regla',async()=>{
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.match(url,/generativelanguage.googleapis.com/);assert.ok(options.headers['x-goog-api-key']);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Pizza S/32.'}]}}]})}};
 try{const res=response();await check({headers:{origin:'https://menuia-test.vercel.app'},method:'POST',body:{message:'¿Cuánto cuesta la pizza margarita?'}},res);assert.equal(res.statusCode,200);assert.equal(calls,1);assert.equal(JSON.parse(res.body).provider,'gemini');assert.ok(!res.body.includes(process.env.GEMINI_API_KEY))}finally{globalThis.fetch=previous}
});
test('validación directa deshabilitada en producción y origen externo rechazado',async()=>{
 let res=response();await chat({headers:{origin:'https://evil.example'},method:'POST',body:{message:'hola'}},res);assert.equal(res.statusCode,403);
 process.env.VERCEL_ENV='production';try{res=response();await check({headers:{},method:'POST'},res);assert.equal(res.statusCode,404)}finally{process.env.VERCEL_ENV='preview'}
});
test('producción: dominio público permitido y respuesta Gemini sin respaldo Ollama',async()=>{
 const previous=globalThis.fetch;process.env.VERCEL_ENV='production';let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.match(url,/gemini-3.5-flash-lite/);const prompt=JSON.parse(options.body).systemInstruction.parts[0].text;assert.match(prompt,/Medios de pago/);assert.match(prompt,/composición ni las trazas/);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'No contamos con ese dato; consultá con el personal.'}]}}]})}};
 try{let res=response();await chat({headers:{origin:'https://menuia-dem.vercel.app'},method:'POST',body:{message:'Aceptan Yape?'}},res);assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).provider,'gemini');assert.equal(calls,1);
 globalThis.fetch=async()=>{calls++;return {ok:false,status:503}};res=response();await chat({headers:{origin:'https://menuia-dem.vercel.app'},method:'POST',body:{message:'Aceptan Yape?'}},res);assert.equal(res.statusCode,503);assert.equal(calls,2);
 }finally{globalThis.fetch=previous;process.env.VERCEL_ENV='preview'}
});
