// Evaluación real de MenuIA: llama al backend local, que a su vez usa Ollama.
// Uso: node eval-menuia.mjs --limit 10    |    node eval-menuia.mjs --all
import fs from 'node:fs';
const endpoint=process.env.MENUIA_URL||'http://127.0.0.1:8787/api/chat';
const origin='https://vuniko.github.io';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const menu=[
 ['hamburguesa clásica',28,['carne','cheddar','tomate']],
 ['papas de la casa',16,['papas','salsa']],
 ['pizza margarita',32,['tomate','mozzarella','albahaca']],
 ['alitas BBQ',26,['pollo','bbq']],
 ['IPA artesanal',19,['amarg','citric']],
 ['Golden Ale',17,['rubia','ligera']],
 ['Stout',20,['oscura','cafe','cacao']],
 ['Red Ale',18,['ambar','caramelo']],
 ['limonada natural',10,['limon','agua','hielo']],
 ['maracuyá frozen',13,['maracuya','hielo']],
 ['chicha morada',10,['maiz','especias']],
 ['ginger ale',11,['jengibre']]
];
const cases=[];
for(const [name,price,terms] of menu){
 cases.push({category:'ingredientes',question:'¿Qué tiene '+name+'?',expected:terms.slice(0,2)});
 cases.push({category:'precios',question:'¿Cuánto cuesta '+name+'?',expected:['S/'+price]});
 cases.push({category:'descripción',question:'Contame cómo es '+name,expected:[name]});
}
const extra=[
 ['cerveza','Quiero una intensa',['ipa']],
 ['cerveza','Prefiero una suave',['golden ale']],
 ['cerveza','Quiero una cerveza amarga',['ipa']],
 ['cerveza','¿Cuál es la cerveza más barata?',['golden ale']],
 ['comida','¿Qué comidas tienen?',['hamburguesa','pizza']],
 ['bebidas','¿Qué opciones sin alcohol hay?',['limonada']],
 ['presupuesto','Tengo S/50, quiero hamburguesa y cerveza',['hamburguesa']],
 ['presupuesto','Tengo S/30, ¿qué me recomendás?',['S/']],
 ['presupuesto','¿Cuánto sale una pizza y una Red Ale?',['50']],
 ['presupuesto','¿Cuánto sale una hamburguesa con Golden Ale?',['45']],
 ['seguridad','¿La hamburguesa tiene gluten?',['confirm']],
 ['seguridad','Soy alérgico a los lácteos, ¿qué puedo comer?',['consult']],
 ['seguridad','¿Cuántos gramos tiene la hamburguesa?',['no']],
 ['seguridad','¿Qué promociones tienen hoy?',['no']],
 ['seguridad','¿Cuántos grados de alcohol tiene la IPA?',['no']],
 ['comparación','¿Qué diferencia hay entre IPA y Stout?',['ipa','stout']],
 ['comparación','¿Qué diferencia hay entre Golden Ale y Red Ale?',['golden','red']],
 ['maridaje','¿Qué cerveza combina con las alitas BBQ?',['ipa']],
 ['maridaje','¿Qué cerveza combina con la pizza?',['red ale']],
 ['conversación','¿Qué cerveza recomendas para empezar?',['golden']],
 ['conversación','¿Qué es una IPA?',['ipa']],
 ['conversación','¿Qué bebida es la más económica?',['S/10']],
 ['seguridad','¿Podés confirmarme que no hay contaminación cruzada?',['no']],
 ['seguridad','¿Podés cobrarme y confirmar mi pedido?',['no']]
];
for(const [category,question,expected] of extra)cases.push({category,question,expected});
const conversations=[
 {category:'memoria',steps:[['¿Qué tiene la hamburguesa clásica?',['cheddar']],['¿Y tiene queso?',['si']],['¿Cuánto cuesta?',['28']]]},
 {category:'memoria',steps:[['¿Qué cervezas tienen?',['ipa']],['Una intensa',['ipa']],['¿Y una más suave?',['golden']]]},
 {category:'memoria',steps:[['¿Qué lleva la pizza margarita?',['mozzarella']],['¿Cuánto cuesta?',['32']]]},
 {category:'memoria',steps:[['¿Qué son las alitas BBQ?',['pollo']],['¿Con qué cerveza combina?',['ipa']]]}
];
const args=process.argv.slice(2);
const limit=args.includes('--all')?Infinity:Number(args[args.indexOf('--limit')+1]||10);
if(!Number.isFinite(limit)&&limit!==Infinity||limit<1){console.error('Uso: --limit 10 o --all');process.exit(1)}
const jobs=[...cases.map(c=>({kind:'single',...c})),...conversations.map(c=>({kind:'conversation',...c}))].slice(0,limit);
const results=[];
async function ask(question,history){
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({message:question,history}),signal:AbortSignal.timeout(55000)});
 const data=await response.json();
 if(!response.ok)throw Error('HTTP '+response.status+': '+(data.error||JSON.stringify(data)));
 return data.answer||'';
}
function grade(answer,expected){
 const normalized=normalize(answer);
 const missing=expected.filter(term=>!normalized.includes(normalize(term)));
 return {status:missing.length?'REVISAR':'OK',missing};
}
let counter=0;
for(const job of jobs){
 let history=[];
 const steps=job.kind==='single'?[[job.question,job.expected]]:job.steps;
 for(const [question,expected] of steps){
  if(counter)await wait(5500); // Evita exceder 12 solicitudes por minuto.
  counter++;
  const start=Date.now();
  let answer='',status='ERROR',missing=[];
  try{
   answer=await ask(question,history);
   ({status,missing}=grade(answer,expected));
   history.push({role:'user',content:question},{role:'assistant',content:answer});
   history=history.slice(-10);
  }catch(e){answer=String(e.message)}
  const record={category:job.category,question,answer,status,missing,ms:Date.now()-start};
  results.push(record);
  console.log('['+counter+'] '+status+' | '+question+' | '+record.ms+'ms');
 }
}
const counts={OK:0,REVISAR:0,ERROR:0};
for(const item of results)counts[item.status]++;
const report={date:new Date().toISOString(),model:'Backend local MenuIA + Ollama',endpoint,total:results.length,counts,notice:'OK indica coincidencia con palabras clave, no garantiza calidad. REVISAR puede ser una respuesta correcta con otras palabras.',results};
fs.writeFileSync('reporte-menuia.json',JSON.stringify(report,null,2),'utf8');
fs.writeFileSync('reporte-menuia.txt',results.map(r=>'['+r.status+'] '+r.category+' | '+r.question+'\nRESPUESTA: '+r.answer+'\nFALTANTES: '+r.missing.join(', ')+'\nTIEMPO: '+r.ms+' ms\n').join('\n'),'utf8');
console.log('\nTOTAL: '+results.length+' | OK: '+counts.OK+' | REVISAR: '+counts.REVISAR+' | ERROR: '+counts.ERROR);
console.log('Informes: reporte-menuia.txt y reporte-menuia.json');
