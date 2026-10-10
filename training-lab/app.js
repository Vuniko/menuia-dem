'use strict';
const {norm,read,complete,fingerprint,exportCSV}=MenuIACSV;
const $=id=>document.getElementById(id);
let data=[],page=0,importing=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function filtered(){const q=norm($('search').value),cat=$('filter').value,state=$('state-filter').value;return data.filter(r=>(!cat||r.category===cat)&&(!state||(state==='incomplete'?!complete(r):r.reviewStatus===state))&&(!q||norm([r.question,r.answer,r.intent,r.category,r.variant,r.source].join(' ')).includes(q)))}
function render(){
 const cats=[...new Set(data.map(r=>r.category).filter(Boolean))].sort();
 $('total').textContent=data.length;$('valid').textContent=data.filter(complete).length;$('review').textContent=data.filter(r=>r.reviewStatus!=='revisada').length;$('categories').textContent=cats.length;
 const selected=$('filter').value;$('filter').innerHTML='<option value="">Todas las categorías</option>'+cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');$('filter').value=cats.includes(selected)?selected:'';
 const counts=new Map();for(const r of data){const label=r.category||'Sin categoría';counts.set(label,(counts.get(label)||0)+1)}$('category-summary').innerHTML=[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([c,n])=>'<span class="pill">'+esc(c)+': '+n+'</span>').join(' ')||'Todavía no hay preguntas.';
 const list=filtered(),pages=Math.max(1,Math.ceil(list.length/25));page=Math.min(page,pages-1);
 $('rows').innerHTML=list.slice(page*25,page*25+25).map((r,i)=>'<tr><td>'+((page*25)+i+1)+'</td><td>'+esc(r.question)+'<br><small>'+esc(r.source)+' · línea '+r.sourceRow+'</small></td><td>'+esc(r.intent)+'</td><td>'+esc(r.category)+'</td><td>'+esc(r.answer)+'</td><td><span class="pill">'+(complete(r)?'Completa':'Incompleta')+'</span><br><label>Revisión<select data-review="'+data.indexOf(r)+'" aria-label="Estado de revisión de pregunta '+((page*25)+i+1)+'"><option value="pendiente"'+(r.reviewStatus==='pendiente'?' selected':'')+'>Pendiente</option><option value="revisada"'+(r.reviewStatus==='revisada'?' selected':'')+'>Revisada</option></select></label></td></tr>').join('');
 $('pageinfo').textContent=list.length+' resultados · Página '+(page+1)+' de '+pages;$('prev').disabled=page===0;$('next').disabled=page>=pages-1;
}
$('import').onclick=async()=>{
 if(importing)return;const files=[...$('files').files];if(!files.length){$('status').textContent='Seleccioná al menos un CSV.';return}
 importing=true;for(const id of ['import','sample','clear'])$(id).disabled=true;
 let added=0,duplicates=0,errors=[];const known=new Set(data.map(fingerprint));
 try{for(const file of files){try{const rows=read(await file.text(),file.name);for(const r of rows){const key=fingerprint(r);if(known.has(key)){duplicates++;continue}known.add(key);data.push({...r,reviewStatus:r.reviewStatus||'pendiente'});added++}}catch(e){errors.push(file.name+': '+e.message)}}page=0;render();$('status').textContent='Importados '+added+' registros; '+duplicates+' duplicados omitidos. '+errors.join(' | ')}finally{importing=false;for(const id of ['import','sample','clear'])$(id).disabled=false}
};
$('sample').onclick=()=>{data=read('pregunta,respuesta,intencion,categoria,variante\n"Causa, ¿qué chelitas tienen?",Consultar la carta vigente,consultar_cervezas,bebidas,jerga\n¿Hay promos hoy?,Verificar promociones vigentes,consultar_promociones,promociones,dificil\ncuanto ta la pizza,,,comida,error\n¿Cuánto cuesta la pizza margarita?,S/32,consultar_precio,conexión,demo\n¿Qué tiene la hamburguesa clásica?,Carne y cheddar,consultar_ingredientes,conexión,demo','Ejemplo').map(r=>({...r,reviewStatus:'pendiente'}));page=0;render();$('status').textContent='Ejemplo cargado (datos demostrativos). La categoría conexión permite probar las reglas sin consultar modelos.'};
$('clear').onclick=()=>{data=[];page=0;render();$('status').textContent='Banco limpiado.'};
for(const id of ['search','filter','state-filter'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;render()});
$('rows').onchange=e=>{const i=e.target.dataset.review;if(i!==undefined&&data[Number(i)]){data[Number(i)].reviewStatus=e.target.value;render()}};
$('prev').onclick=()=>{page--;render()};$('next').onclick=()=>{page++;render()};
$('export').onclick=()=>{if(!data.length){$('status').textContent='No hay registros para exportar.';return}const url=URL.createObjectURL(new Blob([exportCSV(data)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='menuia-training-normalizado.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
render();

let evaluationController=null,evaluationResults=[];
const backendAvailable=location.pathname.startsWith('/training-lab/');
$('evaluate').disabled=!backendAvailable;
$('connection-status').textContent=backendAvailable?'Las preguntas se enviarán al backend que sirve este laboratorio.':'Para evaluar, iniciá el backend y abrí http://127.0.0.1:8787/training-lab/. Esta vista permite importar y revisar CSV.';
function renderResults(){
 $('evaluation-results').innerHTML=evaluationResults.map(r=>'<tr><td>'+esc(r.question)+'</td><td>'+esc(r.expectedAnswer)+'</td><td>'+esc(r.answer)+'</td><td>'+esc(r.status)+(r.error?'<br>'+esc(r.error):'')+'</td><td>'+esc(r.provider||'—')+(r.model?'<br>'+esc(r.model):'')+(r.responseSource==='respaldo'?'<br>Respuesta de respaldo':'')+'</td><td>'+r.ms+' ms</td></tr>').join('');
 $('export-results').disabled=!evaluationResults.length;
}
$('evaluate').onclick=async()=>{
 if(evaluationController||importing||!backendAvailable)return;const jobs=filtered().slice(0,10);if(!jobs.length){$('evaluation-status').textContent='Importá preguntas o cargá un ejemplo antes de evaluar.';return}
 evaluationController=new AbortController();evaluationResults=[];renderResults();
 for(const id of ['import','sample','clear','evaluate','gemini-check'])$(id).disabled=true;$('cancel-evaluation').disabled=false;
 $('evaluation-status').textContent='Evaluando 0 de '+jobs.length+'. Hay una pausa entre preguntas para respetar los límites.';
 try{await MenuIAEvaluation.run(jobs,{signal:evaluationController.signal,onResult:(record,n)=>{evaluationResults.push(record);renderResults();$('evaluation-status').textContent='Evaluadas '+n+' de '+jobs.length;}});
  $('evaluation-status').textContent=(evaluationController.signal.aborted?'Evaluación cancelada. ':'Evaluación terminada. ')+evaluationResults.length+' resultados; '+evaluationResults.filter(r=>r.status==='ERROR').length+' errores. Las respuestas requieren revisión humana.';
 }catch{ $('evaluation-status').textContent='No se pudo completar la evaluación. Podés exportar los resultados obtenidos.'; }
 finally{evaluationController=null;for(const id of ['import','sample','clear','evaluate','gemini-check'])$(id).disabled=false;$('cancel-evaluation').disabled=true;}
};
$('cancel-evaluation').onclick=()=>evaluationController?.abort();
$('export-results').onclick=()=>{
 const report={date:new Date().toISOString(),endpoint:location.origin+'/api/chat',notice:'No mide precisión ni modifica el modelo. Resultados pendientes de revisión humana.',results:evaluationResults};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='menuia-evaluacion.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('gemini-check').disabled=!backendAvailable;
$('gemini-check').onclick=async()=>{
 if(evaluationController)return;$('gemini-check').disabled=true;$('evaluate').disabled=true;
 $('gemini-status').textContent='Consultando Gemini directamente…';
 try{const [result]=await MenuIAEvaluation.run([{question:'¿Qué me recomendás si tengo S/40 y no quiero alcohol?',answer:'Una recomendación según la carta, dentro de S/40.'}],{endpoint:'/api/gemini-check'});
  $('gemini-status').textContent=result.provider==='gemini'&&result.answer?'Gemini respondió ('+result.model+', '+result.ms+' ms). '+result.answer:'Gemini no se pudo validar: '+(result.error||result.status);
 }catch{$('gemini-status').textContent='No se pudo validar Gemini.'}finally{$('gemini-check').disabled=false;$('evaluate').disabled=false}
};
