(function(root){
 'use strict';
 const aliases={question:['pregunta','question','consulta','texto','input','variante_peruana','pregunta_usuario'],answer:['respuesta','answer','expected_answer','respuesta_correcta','respuesta_esperada','expected'],intent:['intencion','intent','intent_key','intencion_esperada','expected_intent'],category:['categoria','category','seccion'],variant:['variante','variant','tipo_variante','tipo','tipo_prueba']};
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[\s-]+/g,'_');
 function parse(text,sep){
  text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],field='',state='start',line=1,start=1;
  const finish=()=>{row.push(field);if(row.some(x=>x.trim()))rows.push({cells:row,line:start});row=[];field='';state='start'};
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(state==='quoted'){
    if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else state='closed'}else{field+=c;if(c==='\n'||c==='\r'&&text[i+1]!=='\n')line++}continue;
   }
   if(c===sep){row.push(field);field='';state='start';continue}
   if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;finish();line++;start=line;continue}
   if(c==='"'){if(state!=='start')throw Error('Comilla inesperada en línea '+line);state='quoted';continue}
   if(state==='closed')throw Error('Texto después de comillas en línea '+line);
   field+=c;state='plain';
  }
  if(state==='quoted')throw Error('Comillas sin cerrar en línea '+start);finish();return rows;
 }
 function delimiter(text){let quoted=false,counts={',':0,';':0,'\t':0};for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"')i++;else quoted=!quoted}else if(!quoted){if(c==='\n'||c==='\r')break;if(c in counts)counts[c]++}}return Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]}
 function read(text,source=''){
  const rows=parse(text,delimiter(text));if(rows.length<2)throw Error('Faltan encabezados o registros');
  const headers=rows.shift().cells,heads=headers.map(norm);if(heads.some(x=>!x))throw Error('Encabezado vacío');if(new Set(heads).size!==heads.length)throw Error('Encabezados duplicados');
  const indices={};for(const [key,names] of Object.entries(aliases)){const matches=heads.map((h,i)=>names.includes(h)?i:-1).filter(i=>i>=0);if(matches.length>1)throw Error('Columnas ambiguas para '+key);indices[key]=matches[0]??-1}
  if(indices.question<0)throw Error('No se encontró columna de pregunta');
  const exported=['question','answer','intent','category','variant','source','sourceRow','reviewStatus'].every(h=>headers.includes(h));
  return rows.map(({cells,line})=>{if(cells.length!==headers.length)throw Error('Línea '+line+': '+cells.length+' columnas; se esperaban '+headers.length);const original=Object.fromEntries(headers.map((h,i)=>[h,cells[i]]));const item={source,sourceRow:line,original};for(const [key,i] of Object.entries(indices))item[key]=i<0?'':cells[i].trim();if(exported){item.original=Object.fromEntries(headers.flatMap((h,i)=>h.startsWith('original:')?[[h.slice(9),cells[i]]]:[]));item.source=original.source||source;item.sourceRow=Number(original.sourceRow)||line;item.reviewStatus=original.reviewStatus==='revisada'?'revisada':'pendiente'}return item});
 }
 const complete=r=>['question','answer','intent','category'].every(k=>String(r[k]??'').trim());
 const fingerprint=r=>JSON.stringify(['question','answer','intent','category','variant'].map(k=>r[k]??'').concat(Object.entries(r.original??{}).filter(([k])=>!Object.values(aliases).some(a=>a.includes(norm(k)))).sort(([a],[b])=>a.localeCompare(b))));
 const cell=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
 function exportCSV(data){const keys=['question','answer','intent','category','variant','source','sourceRow','reviewStatus'];const extras=[...new Set(data.flatMap(r=>Object.keys(r.original??{})))];const headers=keys.concat(extras.map(k=>'original:'+k));return '\uFEFF'+[headers.map(cell).join(','),...data.map(r=>keys.map(k=>cell(r[k])).concat(extras.map(k=>cell(r.original?.[k]))).join(','))].join('\r\n')}
 const api={norm,parse,read,complete,fingerprint,exportCSV};if(typeof module!=='undefined')module.exports=api;else root.MenuIACSV=api;
})(globalThis);
