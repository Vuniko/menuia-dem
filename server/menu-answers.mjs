const normal=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const price=n=>'S/ '+Number(n).toFixed(2);
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
export function menuAnswer(question,products){
 const q=normal(question).replace(/^[¿¡\s]+|[?!¡¿\s]+$/g,'').trim(),line=([name,cost,,description])=>'• '+name+' — '+price(cost)+(description?'. '+description+'.':'');
 if(/alerg|celiac|gluten|lactosa|vegetar|vegano|sin (?:queso|leche|azucar|carne|cebolla)/.test(q))return null;
 const hasBeer=/cervez|birras?/.test(q),hasFood=/comidas?|platos?|comer/.test(q),hasDrinks=/sin alcohol|bebidas no alcoholicas|refrescos/.test(q);
 const listIntent=/todas?|todos|opciones|lista|carta|menu|mostrar|mostra|muestr|hay|tienen|tienes|tenes|venden|ofrece|manejan|disponibles|precios/.test(q)||/^(?:que |cuales? )?(?:cervezas?|birras?|comidas|platos|bebidas|refrescos)[?¿!\s]*$/.test(q);
 const advice=/recomend|prefier|busco|quiero|suave|ligera|intensa|amarga|fuerte/.test(q);
 if(/cervezas?\s+(?:sin alcohol|no alcoholicas)/.test(q))return 'No hay cervezas sin alcohol registradas en esta carta de ejemplo. Las bebidas sin alcohol son:\n'+products.filter(p=>p[2]==='sin alcohol').map(line).join('\n');
 const budget=q.match(/s\s*\/\s*(\d+(?:[.,]\d{1,2})?)|(?:tengo|presupuesto(?: de)?|hasta|menos de|con|por)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:soles)?/);
 if(budget&&!/cuesta|cuestan|vale|precio de|cuanto sale/.test(q)){
  const amount=Number((budget[1]||budget[2]).replace(',','.'));if(!Number.isFinite(amount)||amount>100000)return null;
  const categoryOnly=!hasFood&&!/pedir|combin|combo|acompan/.test(q);
  const choices=budgetOptions(products,amount,{category:categoryOnly?(hasBeer&&hasDrinks?'bebidas':hasBeer?'cerveza':hasDrinks?'sin alcohol':''):'',alcohol:hasDrinks&&!hasBeer?'sin alcohol':hasBeer&&!hasDrinks?'cerveza':''});
  if(!choices.length){const cheapest=[...products].sort((a,b)=>a[1]-b[1])[0];return 'No hay una opción dentro de '+price(amount)+' en esta carta de ejemplo. La opción más económica registrada es '+cheapest[0]+' a '+price(cheapest[1])+'.';}
  return 'Dentro de '+price(amount)+' podés elegir:\n'+choices.map(c=>'• '+c.items.map(p=>p.name+' ('+price(p.cost/100)+')').join(' + ')+'. Total '+price(c.total/100)+'; te quedan '+price((Math.round(amount*100)-c.total)/100)+'.').join('\n')+'\nPrecios de la carta de ejemplo; confirmá disponibilidad con el personal.';
 }
 if(listIntent&&(!advice||/todas?|todos|opciones|lista|carta|menu/.test(q))){
  const category=hasBeer&&hasDrinks?'bebidas':hasDrinks?'sin alcohol':hasBeer?'cerveza':hasFood?'comida':/carta|menu|que (?:hay|tienen)/.test(q)?'all':null;
  if(category){const rows=products.filter(p=>category==='all'||(category==='bebidas'?['cerveza','sin alcohol'].includes(p[2]):p[2]===category));return 'En la carta de ejemplo hay '+rows.length+' '+(category==='cerveza'?'opciones de cerveza':category==='sin alcohol'?'bebidas sin alcohol':category==='comida'?'opciones de comida':'productos')+':\n'+rows.map(line).join('\n')+'\n¿Cuál te gustaría conocer mejor?';}
 }
 return null;
}
