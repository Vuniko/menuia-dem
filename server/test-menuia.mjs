import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./index.js',import.meta.url),'utf8');
const from=source.indexOf('const products=');
const to=source.indexOf('const recent=',from);
if(from<0||to<0)throw Error('No se encontraron las funciones de la carta');
const code=source.slice(from,to)+'\n globalThis.menuia={products,productAnswer,beerFollowup,spanishFallback,cleanAnswer};';
const context=vm.createContext({});
vm.runInContext(code,context,{timeout:2000});
const {products,productAnswer,beerFollowup,spanishFallback,cleanAnswer}=context.menuia;
let passed=0,failed=0;
const errors=[];
function check(name,run){try{run();passed++;console.log('OK  '+name)}catch(e){failed++;errors.push(name+': '+e.message);console.log('FAIL '+name+' — '+e.message)}}
const names=['hamburguesa clásica','papas de la casa','pizza margarita','alitas BBQ','IPA artesanal','Golden Ale','Stout','Red Ale','limonada natural','maracuyá frozen','chicha morada','ginger ale'];
for(let i=0;i<products.length;i++){
 const [name,price,,ingredients]=products[i];
 check('Ingredientes: '+name,()=>{const a=productAnswer('¿Qué tiene '+name+'?');assert.ok(a?.includes('S/'+price));const expected=[['carne','cheddar','lechuga','tomate'],['papas','salsa'],['masa','tomate','mozzarella','albahaca'],['pollo','BBQ'],['amarg','cítric'],['rubia','ligera'],['oscura','café','cacao'],['ámbar','caramelo'],['limón','agua','hielo'],['maracuyá','hielo'],['maíz morado','especias'],['jengibre']][i];for(const term of expected)assert.ok(a?.toLocaleLowerCase('es').includes(term.toLocaleLowerCase('es')),name+' no menciona '+term+': '+a)});
 check('Precio: '+name,()=>{const a=productAnswer('¿Cuánto cuesta '+name+'?');assert.ok(a?.includes('S/'+price))});
}
const history=[{role:'user',content:'¿Qué tiene la hamburguesa clásica?'},{role:'assistant',content:'Hamburguesa clásica — S/28. Carne de res, cheddar, pan, lechuga, tomate.'}];
check('Memoria: tiene queso',()=>assert.match(productAnswer('¿Tiene queso?',history),/Sí.*queso/i));
check('Memoria: precio',()=>assert.match(productAnswer('¿Cuánto cuesta?',history),/S\/28/));
check('Memoria: alérgenos',()=>assert.match(productAnswer('¿Tiene gluten?',history),/personal/i));
check('No inventar picante',()=>assert.match(productAnswer('¿La hamburguesa clásica es picante?'),/no está especificado/i));
check('Suave en contexto',()=>assert.match(beerFollowup('una suave',[{role:'assistant',content:'¿Cerveza suave o intensa?'}]),/Golden Ale.*S\/17/));
check('Quiero una intensa',()=>assert.match(beerFollowup('quiero una intensa',[]),/IPA artesanal.*S\/19/));
check('Quiero cerveza amarga',()=>assert.match(beerFollowup('quiero una cerveza amarga',[]),/IPA artesanal/));
check('Cerveza más barata',()=>assert.match(beerFollowup('la más barata',[{role:'assistant',content:'Tenemos cervezas'}]),/Golden Ale/));
check('Fallback español',()=>assert.match(spanishFallback('hola'),/Hola/));
check('Filtro razonamiento',()=>assert.ok(!cleanAnswer('Okay, the user said hello. I need to respond.','hola').includes('Okay')));
console.log('\nRESULTADO: '+passed+' aprobadas, '+failed+' fallidas, '+(passed+failed)+' pruebas');
if(errors.length){console.log('\nERRORES:\n'+errors.join('\n'));process.exitCode=1}
