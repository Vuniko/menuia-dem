import {promotionSummary,promotionLine} from '../assets/promotion-model.mjs';
const normal=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const price=n=>'S/ '+Number(n).toFixed(2);
const continuation=q=>/^(?:y )?(?:cuanto (?:cuesta|sale|vale|ahorro)|que incluye|que trae|tiene alcohol|esa promo|ese combo|otra\b|mas barat|sin alcohol)/.test(q.replace(/^[¿¡\s]+|[?!¡¿\s]+$/g,''));
function promotionContext(history,promotions){
 const lastUser=normal(history.filter(m=>m.role==='user').at(-1)?.content);
 if(continuation(lastUser)){
  const answer=normal(history.filter(m=>m.role==='assistant').at(-1)?.content),matches=promotions.filter(p=>answer.includes(normal(p.title)));
  if(matches.length===1)return matches;
  if(matches.length>1)return [];
 }
 for(const message of history.filter(m=>m.role==='user').slice(-10).reverse()){
  const text=normal(message.content),matches=promotions.filter(p=>text.includes(normal(p.title)));
  if(matches.length)return matches.length===1?matches:[];
  if(!continuation(text))break;
 }
 return [];
}
export function budgetOptions(products,amount,{category='',alcohol=''}={}){
 const ceiling=Math.round(amount*100),rows=products.map(([name,cost,type])=>({name,cost:Math.round(cost*100),type}));
 if(category)return rows.filter(p=>(category==='bebidas'?['cerveza','sin alcohol'].includes(p.type):p.type===category)&&p.cost<=ceiling).sort((a,b)=>a.cost-b.cost).map(p=>({items:[p],total:p.cost}));
 const foods=rows.filter(p=>p.type==='comida'),drinks=rows.filter(p=>p.type==='cerveza'||p.type==='sin alcohol').filter(p=>!alcohol||p.type===alcohol);
 const choices=[];
 for(const food of foods)for(const drink of drinks)if(food.cost+drink.cost<=ceiling)choices.push({items:[food,drink],total:food.cost+drink.cost});
 if(!choices.length)for(const item of rows.filter(p=>!category||p.type===category))if(item.cost<=ceiling)choices.push({items:[item],total:item.cost});
 choices.sort((a,b)=>b.total-a.total);
 const selected=[];for(const choice of choices)if(!selected.some(c=>c.items[0].name===choice.items[0].name)){selected.push(choice);if(selected.length===2)break;}
 return selected;
}
export function menuAnswer(question,products,{promotions=[],history=[]}={}){
 const q=normal(question).replace(/^[¿¡\s]+|[?!¡¿\s]+$/g,'').trim(),line=([name,cost,,description])=>'• '+name+' — '+price(cost)+(description?'. '+description+'.':'');
 if(/alerg|celiac|gluten|lactosa|vegetar|vegano|sin (?:queso|leche|azucar|carne|cebolla)/.test(q))return null;
 const hasBeer=/cervez|birras?/.test(q),hasFood=/comidas?|platos?|comer/.test(q),hasDrinks=/sin alcohol|bebidas no alcoholicas|refrescos/.test(q);
 const ageContext=normal(question+' '+history.filter(m=>m.role==='user').map(m=>m.content).join(' '));
 const minor=/menor de edad|menor de 18|soy menor\b|tengo (?:[0-9]|1[0-7]) anos/.test(ageContext);
 const offers=promotions.map(p=>promotionSummary(p,products)).filter(Boolean).filter(p=>(!minor||!p.alcoholic)&&(!hasDrinks||hasBeer||!p.alcoholic)&&(!hasBeer||hasDrinks||minor||p.alcoholic));
 const budget=q.match(/s\s*\/\s*(\d+(?:[.,]\d{1,2})?)/)||q.match(/(?:tengo|presupuesto(?: de)?|hasta|menos de|con|por)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:soles)?/);
 const amount=budget?Number(budget[1].replace(',','.')):null;
 const named=promotions.filter(p=>q.includes(normal(p.title)));
 const followup=!named.length&&continuation(q);
 const context=followup?promotionContext(history,promotions):[];
 const selected=named.length?named:context;
 if(context.length===1&&/otra\b|mas barat|sin alcohol/.test(q)){
  const current=promotionSummary(context[0],products);
  const alternatives=offers.filter(p=>p.id!==context[0].id&&(amount===null||p.price<=amount)&&(!/mas barat/.test(q)||current&&p.price<current.price));
  return alternatives.length?'Podés elegir otra promoción de ejemplo:\n'+alternatives.map(p=>promotionLine(p)).join('\n'):'No hay otra promoción registrada que cumpla esa selección. Podemos explorar los productos de la carta.';
 }
 if(selected.length===1){
  const offer=offers.find(p=>p.id===selected[0].id);
  if(!offer)return 'Esa promoción no cumple tu selección o restricción. Podemos buscar una opción sin alcohol o productos de la carta.';
  if(amount!==null&&offer.price>amount)return offer.title+' cuesta '+price(offer.price)+', supera tu presupuesto de '+price(amount)+'. Podemos buscar una opción dentro de ese monto.';
  if(/cuanto ahorro/.test(q))return offer.title+': ahorrás '+price(offer.savings)+'. El combo cuesta '+price(offer.price)+'; por separado, '+price(offer.originalTotal)+'.';
  if(/cuanto (?:cuesta|sale|vale)/.test(q))return offer.title+' cuesta '+price(offer.price)+' por combo. Precio normal '+price(offer.originalTotal)+'; ahorro '+price(offer.savings)+'.';
  if(followup&&/que incluye|que trae/.test(q))return offer.title+' incluye '+offer.items.map(i=>i.quantity+' '+i.name).join(' + ')+'. Total '+price(offer.price)+'.';
  if(/tiene alcohol/.test(q))return offer.title+': '+(offer.alcoholic?'sí, incluye cerveza con alcohol, solo para mayores de 18 años.':'no, es un combo sin alcohol.');
  return promotionLine(offer)+' '+offer.validityLabel+'\n'+(offer.alcoholic?'Incluye cerveza con alcohol, solo para mayores de 18 años.':'Es un combo sin alcohol.');
 }
 if(/promo|ofertas?|descuentos?|happy hour|2x1|(?:que|hay|tienen|mostrar|muestr).*combos?/.test(q)){
  const fits=offers.filter(p=>amount===null||p.price<=amount);
  if(!fits.length)return promotions.length?'No hay promociones de ejemplo que cumplan esa selección o presupuesto. Podemos buscar productos de la carta que sí encajen.':'No hay promociones verificadas en esta carta de ejemplo. Los precios de los productos son los que aparecen en la carta; consultá con el personal antes de pedir.';
  const special=/happy hour|2x1/.test(q)?'No hay happy hour ni 2x1 registrados. ':minor?'Te muestro las opciones sin alcohol. ':'';
  return special+'Tenemos '+fits.length+' promociones de ejemplo:\n'+fits.map(p=>'• '+promotionLine(p)+' '+p.validityLabel).join('\n')+'\n¿Querés conocer alguno de los productos del combo?';
 }
 if(minor&&hasBeer&&!hasDrinks)return 'Para menores solo puedo recomendar opciones sin alcohol de esta carta:\n'+products.filter(p=>p[2]==='sin alcohol').map(line).join('\n');
 const listIntent=/todas?|todos|opciones|lista|carta|menu|mostrar|mostra|muestr|hay|tienen|tienes|tenes|venden|ofrece|manejan|disponibles|precios/.test(q)||/^(?:que |cuales? )?(?:cervezas?|birras?|comidas|platos|bebidas|refrescos)[?¿!\s]*$/.test(q);
 const advice=/recomend|prefier|busco|quiero|suave|ligera|intensa|amarga|fuerte/.test(q);
 if(/cervezas?\s+(?:sin alcohol|no alcoholicas)/.test(q))return 'No hay cervezas sin alcohol registradas en esta carta de ejemplo. Las bebidas sin alcohol son:\n'+products.filter(p=>p[2]==='sin alcohol').map(line).join('\n');
 if(budget&&!/cuesta|cuestan|vale|precio de|cuanto sale/.test(q)){
  if(!Number.isFinite(amount)||amount>100000)return null;
  const categoryOnly=!hasFood&&!/pedir|combin|combo|acompan/.test(q);
  const fitPromos=offers.filter(p=>p.price<=amount&&(!categoryOnly||!hasBeer&&!hasDrinks||p.items.every(i=>{const row=products.find(p=>p[0]===i.name);return hasBeer&&hasDrinks?['cerveza','sin alcohol'].includes(row[2]):hasBeer?row[2]==='cerveza':row[2]==='sin alcohol';})));
  if(fitPromos.length)return 'Con '+price(amount)+' también podés aprovechar estas promociones de ejemplo:\n'+fitPromos.map(p=>'• '+promotionLine(p)+' Te quedan '+price(amount-p.price)+'.').join('\n')+'\nPrecios por combo, no acumulables; confirmá disponibilidad con el personal.';
  const choices=budgetOptions(products,amount,{category:categoryOnly?(hasBeer&&hasDrinks?'bebidas':hasBeer?'cerveza':hasDrinks?'sin alcohol':''):'',alcohol:minor||hasDrinks&&!hasBeer?'sin alcohol':hasBeer&&!hasDrinks?'cerveza':''});
  if(!choices.length){const eligible=products.filter(p=>!categoryOnly||(!hasBeer&&!hasDrinks)||(hasBeer&&p[2]==='cerveza')||(hasDrinks&&p[2]==='sin alcohol'));const cheapest=[...eligible].sort((a,b)=>a[1]-b[1])[0];return 'No hay una opción dentro de '+price(amount)+' en esta carta de ejemplo. La opción más económica registrada en esa selección es '+cheapest[0]+' a '+price(cheapest[1])+'.';}
  return 'Dentro de '+price(amount)+' podés elegir:\n'+choices.map(c=>'• '+c.items.map(p=>p.name+' ('+price(p.cost/100)+')').join(' + ')+'. Total '+price(c.total/100)+'; te quedan '+price((Math.round(amount*100)-c.total)/100)+'.').join('\n')+'\nPrecios de la carta de ejemplo; confirmá disponibilidad con el personal.';
 }
 if(listIntent&&(!advice||/todas?|todos|opciones|lista|carta|menu/.test(q))){
  const category=hasBeer&&hasDrinks?'bebidas':hasDrinks?'sin alcohol':hasBeer?'cerveza':hasFood?'comida':/carta|menu|que (?:hay|tienen)/.test(q)?'all':null;
  if(category){const rows=products.filter(p=>category==='all'||(category==='bebidas'?['cerveza','sin alcohol'].includes(p[2]):p[2]===category));return 'En la carta de ejemplo hay '+rows.length+' '+(category==='cerveza'?'opciones de cerveza':category==='sin alcohol'?'bebidas sin alcohol':category==='comida'?'opciones de comida':'productos')+':\n'+rows.map(line).join('\n')+'\n¿Cuál te gustaría conocer mejor?';}
 }
 return null;
}
