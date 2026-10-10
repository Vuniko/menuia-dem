// MenuIA Training Lab - evaluador CSV. Node.js >=20, sin dependencias externas.
// Uso: node server/eval-training-csv.mjs training-lab/datos.csv --limit 10
import fs from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2);
const files=args.filter((a,i)=>!a.startsWith('--')&&args[i-1]!=='--limit'&&args[i-1]!=='--url'&&args[i-1]!=='--delay'&&args[i-1]!=='--provider');
const option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
const limit=Number(option('--limit','10')),delay=Number(option('--delay','5500'));
const provider=option('--provider',process.env.MENUIA_EVAL_PROVIDER||'menuia');
const model=process.env.GEMINI_MODEL||'gemini-2.5-flash-lite';
const endpoint=provider==='gemini'?'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent':option('--url',process.env.MENUIA_URL||'http://127.0.0.1:8787/api/chat');
if(!['menuia','gemini'].includes(provider))throw Error('Proveedor inválido');
if(provider==='gemini'&&!process.env.GEMINI_API_KEY)throw Error('Falta GEMINI_API_KEY en el entorno (no la pegues en el código)');
if(!files.length||!Number.isInteger(limit)||limit<1||!Number.isFinite(delay)||delay<0){console.error('Uso: node server/eval-training-csv.mjs archivo.csv [otro.csv] --limit 10 [--url URL] [--delay 5500]');process.exit(1)}
function parse(text,sep){const rows=[];let row=[],field='',quoted=false;text=text.replace(/^\uFEFF/,'');for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(!quoted&&c===sep){row.push(field);field=''}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field=''}else field+=c}if(quoted)throw Error('Comillas CSV sin cerrar');row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows}
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[\s-]+/g,'_');
function readCSV(text,source){const first=text.split(/\r?\n/)[0];const sep=[';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];const rows=parse(text,sep),heads=(rows.shift()||[]).map(normalize);const aliases={question:['pregunta','question','consulta','texto','input','variante_peruana','pregunta_usuario'],answer:['respuesta','answer','expected_answer','respuesta_correcta','respuesta_esperada','expected'],intent:['intencion','intent','intent_key','intencion_esperada','expected_intent'],category:['categoria','category','seccion']};const getIndex=k=>heads.findIndex(h=>aliases[k].includes(h));if(getIndex('question')<0)throw Error(source+': falta columna pregunta/question');return rows.map((row,i)=>{const get=k=>{const j=getIndex(k);return j<0?'':(row[j]||'').trim()};return {source,row:i+2,question:get('question'),expectedAnswer:get('answer'),expectedIntent:get('intent'),category:get('category')}}).filter(r=>r.question)}
const jobs=[];for(const file of files){jobs.push(...readCSV(await fs.readFile(file,'utf8'),path.basename(file)))}
const selected=jobs.slice(0,limit);if(!selected.length)throw Error('Sin preguntas para evaluar');
console.log('Preguntas cargadas:',jobs.length,'| seleccionadas:',selected.length);
const results=[];
for(const job of selected){if(results.length&&delay)await new Promise(r=>setTimeout(r,delay));const start=Date.now();let answer='',status='ERROR',error='';
try{const gemini=provider==='gemini';
const prompt='Sos MenuIA, asistente de un bar peruano. Respondé en español peruano claro. No se te proporcionó una carta verificada: nunca inventes precios, disponibilidad, promociones, ingredientes ni seguridad sobre alérgenos. Cuando falten datos, pedí la carta vigente o sugerí confirmar con el personal. Pregunta del cliente: '+job.question;
const response=await fetch(endpoint,{method:'POST',headers:gemini?{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY}:{'Content-Type':'application/json',Origin:'https://vuniko.github.io'},body:JSON.stringify(gemini?{contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2}}:{message:job.question,history:[]}),signal:AbortSignal.timeout(55000)});
const body=await response.json();if(!response.ok)throw Error('HTTP '+response.status+' '+(body.error?.message||body.error||''));
answer=gemini?String(body.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||''):String(body.answer||'');status=answer?'PENDIENTE_REVISION':'SIN_RESPUESTA'}catch(e){error=String(e.message)}const result={...job,answer,status,error,ms:Date.now()-start};results.push(result);console.log('['+results.length+'/'+selected.length+'] '+status+' | '+job.question)}
const report={date:new Date().toISOString(),provider,model:provider==='gemini'?model:null,endpoint,totalImported:jobs.length,totalEvaluated:results.length,note:'PENDIENTE_REVISION no significa respuesta correcta. La intención y exactitud requieren revisión humana o evaluador semántico adicional.',results};
await fs.mkdir('training-lab/reports',{recursive:true});const filename='training-lab/reports/evaluacion-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';await fs.writeFile(filename,JSON.stringify(report,null,2));console.log('Reporte:',filename);
