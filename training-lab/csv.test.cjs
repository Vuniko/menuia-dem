const {test}=require('node:test');
const assert=require('node:assert/strict');
const csv=require('./csv.js');
test('BOM, delimitadores y campos multilínea conservan valores y línea física',()=>{
 for(const sep of [',',';','\t']){
  const rows=csv.read('\uFEFFpregunta'+sep+'respuesta'+sep+'nota\r\n"causa, qué hay"'+sep+'"uno\r\ndos"'+sep+'"dijo ""hola"""\r\n\r\notra'+sep+'ok'+sep+'fin');
  assert.equal(rows[0].answer,'uno\r\ndos');assert.equal(rows[0].original.nota,'dijo "hola"');assert.equal(rows[1].sourceRow,5);
 }
});
test('rechaza columnas desalineadas, ambiguas, vacías y comillas inválidas',()=>{
 for(const text of ['pregunta,respuesta\nhola','pregunta,respuesta\nhola,ok,extra','pregunta,question\nhola,hola','pregunta,\nhola,ok','pregunta,pregúnta\nhola,ok','pregunta\n"sin cerrar','pregunta\n"hola"texto','pregunta\nhol"a'])assert.throws(()=>csv.read(text));
});
test('exportar y reimportar conserva campos adicionales, revisión y procedencia',()=>{
 const rows=csv.read('pregunta,respuesta,intencion,categoria,variante,id,nota\ncausa,ok,saludo,general,jerga,42,detalle','banco.csv');rows[0].reviewStatus='revisada';
 const restored=csv.read(csv.exportCSV(rows),'export.csv');assert.deepEqual(restored,rows);
 assert.equal(csv.fingerprint(restored[0]),csv.fingerprint(rows[0]));
 assert.equal(csv.exportCSV(restored),csv.exportCSV(rows));
});
test('duplicados exactos no confunden respuestas o identificadores diferentes',()=>{
 const rows=csv.read('pregunta,respuesta,id\nhola,ok,1\nhola,ok,1\nhola,otro,1\nhola,ok,2');assert.equal(new Set(rows.map(csv.fingerprint)).size,3);assert.equal(csv.complete(rows[0]),false);
});
