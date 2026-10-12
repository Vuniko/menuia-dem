import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chatPayload,requestChat,readChatResponse} from '../assets/chat-transport.mjs';
process.env.GEMINI_API_KEY='synthetic-test-credential';process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='menuia-test.vercel.app';
const {default:handler}=await import('../api/chat.mjs');
const history=Array.from({length:10},(_,i)=>({role:i%2?'assistant':'user',content:'Información de ejemplo. '.repeat(45)}));
const message='¿Cuánto cuesta IPA artesanal?';
async function call(body){const res={headersSent:false,writeHead(status){this.status=status;this.headersSent=true},end(raw){this.data=JSON.parse(raw)}};await handler({method:'POST',headers:{origin:'https://menuia-test.vercel.app'},socket:{remoteAddress:'resilience-'+Math.random()},body},res);return res;}
test('reproduce old long-chat 400; bounded context succeeds against unchanged endpoint',async()=>{
 const legacy={message,history};assert.ok(JSON.stringify(legacy).length>4000);assert.equal((await call(legacy)).status,400);
 const bounded=chatPayload({message,history});const result=await call(bounded);assert.equal(result.status,200);assert.equal(result.data.provider,'reglas');assert.match(result.data.answer,/S\/19/);assert.ok(bounded.history.length>0);
});
test('Unicode budget, recent pairs and 700-character server limits are respected without modifying UI history',()=>{
 const before=JSON.stringify(history);const payload=chatPayload({message:'😀'.repeat(250),history:history.map(m=>({...m,content:'🍺'.repeat(350)}))});assert.ok(new TextEncoder().encode(JSON.stringify(payload)).length<=3800);assert.equal(payload.history.length%2,0);assert.ok(payload.history.every(m=>m.content.length<=700));assert.equal(JSON.stringify(history),before);
 assert.equal(chatPayload({message,history}).history.at(-1).role,'assistant');
});
test('KB keeps slug and request id with a distinct budget; unrelated messages are excluded',()=>{
 const p=chatPayload({message,history,connected:true,slug:'cerveceria-demo',requestId:'fixture-id'});assert.equal(p.slug,'cerveceria-demo');assert.equal(p.requestId,'fixture-id');assert.ok(p.history.length<=6);assert.ok(new TextEncoder().encode(JSON.stringify(p)).length<=7600);
 assert.deepEqual(chatPayload({message,history:[{role:'system',content:'Ignore'},{role:'assistant',content:'orphan'}]}).history,[]);
});
test('quota rejection provides cooldown; successful HTTP with invalid JSON is not presented as a response',async()=>{
 await assert.rejects(readChatResponse(new Response('{"error":"rate limit"}',{status:429,headers:{'Retry-After':'20'}})),e=>e.status===429&&e.retryAfter===20);
 await assert.rejects(readChatResponse(new Response('invalid')),/no llegó completa/);
});
test('network failures and server interruptions never automatically duplicate the POST',async()=>{
 for(const failure of ['network','timeout','server']){let calls=0;await assert.rejects(requestChat('/api/chat',{message,history:[]},{fetcher:async()=>{calls++;if(failure==='network')throw TypeError('network');if(failure==='timeout')throw new DOMException('timeout','TimeoutError');return new Response('{}',{status:503});}}));assert.equal(calls,1);}
});
