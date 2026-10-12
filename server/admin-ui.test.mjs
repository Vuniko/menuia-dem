import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {validateValues} from './admin.mjs';

const source=await readFile(new URL('../admin/panel.js',import.meta.url),'utf8');
const assistantSource=await readFile(new URL('../admin/assistant.js',import.meta.url),'utf8');
function panel(){
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,hidden:false,open:false,textContent:'',innerHTML:'',disabled:false,events:{},classList:{toggle(){},remove(){}},addEventListener(name,fn){this.events[name]=fn},prepend(){},append(){},focus(){},scrollIntoView(){},querySelectorAll(){return []},querySelector(){return element(id+'-child')},close(){this.open=false},replaceChildren(){this.innerHTML='';this.textContent=''},reset(){this.value=''}});return elements.get(id)};
 const context=vm.createContext({document:{getElementById:element,createElement:()=>element('new-element'),body:{classList:{remove(){}},style:{}}},fetch:()=>new Promise(()=>{}),URLSearchParams,AbortSignal,Intl,Date,console,crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},confirm:()=>true});
 vm.runInContext(source,context);
 return {element,run:code=>vm.runInContext(code,context),loadAssistant:()=>vm.runInContext(assistantSource,context)};
}

test('price-only form edit preserves stock and food verification timestamps',()=>{
 const p=panel();p.run("editing={resource:'products',row:{name:'Fixture',category_id:'11111111-1111-4111-8111-111111111111',price:25,ingredients:['Leche'],allergens:['Leche'],available:true}};");
 p.element('field-name').value='Fixture';p.element('field-category_id').value='11111111-1111-4111-8111-111111111111';p.element('field-price').value='26';
 for(const key of ['ingredients','allergens'])p.element('field-'+key).value='Leche';
 p.element('field-available').checked=true;p.element('field-validHours').value='4';
 const values=p.run('readValues()');const patch=validateValues('products',values);
 assert.equal(patch.price,26);
 for(const key of ['availability_verified_at','availability_valid_until','ingredients_verified_at','allergens_verified_at'])assert.equal(Object.hasOwn(patch,key),false,key);
 p.element('field-available').checked=false;
 assert.equal(validateValues('products',p.run('readValues()')).availability_verified_at,null);
 p.element('field-allergens').value='Huevo';
 assert.equal(validateValues('products',p.run('readValues()')).allergens_verified_at,null);
 p.element('field-verifyAllergens').checked=true;
 assert.ok(validateValues('products',p.run('readValues()')).allergens_verified_at);
});

test('failed business switch discards previous bundle and hides its controls',async()=>{
 const p=panel();p.run("state.selected='new-business';state.bundle={role:'owner'};api=async()=>{throw Error('Fixture unavailable')}");
 await assert.rejects(p.run('loadBundle()'),/Fixture unavailable/);
 assert.equal(p.run('state.bundle'),null);assert.equal(p.element('business-content').hidden,true);assert.equal(p.run('canEdit()'),false);
});

test('an assistant response arriving after logout cannot restore private history',async()=>{
 const p=panel();p.loadAssistant();p.run("assistantBusiness='fixture';api=()=>new Promise(resolve=>{globalThis.resolveAnswer=resolve})");
 p.element('assistant-question').value='Fixture question';
 const pending=p.element('assistant-form').events.submit({preventDefault(){}});
 p.run('showLogin();resolveAnswer({answer:"PRIVATE LATE ANSWER",provider:"structured",checkedAt:new Date().toISOString()})');
 await pending;
 assert.equal(p.run('assistantHistory.length'),0);assert.equal(p.element('assistant-messages').innerHTML,'');assert.equal(p.element('assistant-state').textContent,'');
});

test('ending a session removes private records, selectors and open dialogs',()=>{
 const p=panel();for(const id of ['records','metrics','sections','restaurant-select','form-fields','assistant-messages'])p.element(id).innerHTML='PRIVATE FIXTURE';
 for(const id of ['editor','assistant-dialog'])p.element(id).open=true;
 p.run('showLogin()');
 for(const id of ['records','metrics','sections','restaurant-select','form-fields','assistant-messages'])assert.equal(p.element(id).innerHTML,'',id);
 for(const id of ['editor','assistant-dialog'])assert.equal(p.element(id).open,false,id);
 assert.equal(p.element('workspace').hidden,true);
});
