import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCatalog,groundedAnswer} from './commercial.mjs';
import {demonstrationCatalog} from './demonstration-catalog.mjs';
const catalog=publicCatalog(demonstrationCatalog(),'menuia-demo');
test('comparison displays actual newline, not literal backslash n',()=>{
 const first=groundedAnswer(catalog,'Audífonos inalámbricos y Parlante portátil por S/200');
 const response=groundedAnswer(catalog,'Compara ambos',[],null,first.memory);
 assert.equal(response.products.length,2);
 assert.ok(response.answer.includes('ficticios.\nPodemos comparar'),JSON.stringify(response.answer));
 assert.ok(!response.answer.includes('ficticios.\\\\n'),JSON.stringify(response.answer));
});
test('comparison with gift advice answers the question without invented product properties',()=>{
 let r=groundedAnswer(catalog,'Tengo 200 soles para comprarle un regalo a mi hermano');
 r=groundedAnswer(catalog,'A mi hermano le encanta escuchar música',[],null,r.memory);
 const comparison=groundedAnswer(catalog,'¿Cuál es la diferencia entre los audífonos y el parlante? ¿Cuál me recomendás para mi hermano?',[],null,r.memory);
 assert.equal(comparison.products.length,2);
 assert.match(comparison.answer,/hermano/i);
 assert.match(comparison.answer,/escuchar música para sí mismo/i);
 assert.match(comparison.answer,/compartir música/i);
 assert.match(comparison.answer,/159\.00/);
 assert.match(comparison.answer,/189\.00/);
 assert.doesNotMatch(comparison.answer,/batería de|cancelación activa|bluetooth 5/i);
});
test('generic comparisons still ask which characteristic matters',()=>{
 const r=groundedAnswer(catalog,'Audífonos inalámbricos y Parlante portátil por S/200');
 const x=groundedAnswer(catalog,'Compara ambos',[],null,r.memory);
 assert.match(x.answer,/qué característica te importa más/i);
});
