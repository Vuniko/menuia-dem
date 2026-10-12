export function promotionSummary(offer,products){
 if(!offer||offer.active===false||!Array.isArray(offer.items)||!offer.items.length||!Number.isFinite(offer.price)||offer.price<0)return null;
 let originalCents=0,alcoholic=false;
 for(const item of offer.items){const p=products.find(p=>(Array.isArray(p)?p[0]:p.name)===item.name);
  if(!p||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20)return null;
  const cost=Number(Array.isArray(p)?p[1]:p.price);if(!Number.isFinite(cost)||cost<0)return null;
  originalCents+=Math.round(cost*100)*item.quantity;const category=Array.isArray(p)?p[2]:p.categoryId;alcoholic||=['cerveza','beer'].includes(category);
 }
 const promotionalCents=Math.round(offer.price*100);if(promotionalCents>=originalCents)return null;
 return {...offer,originalTotal:originalCents/100,savings:(originalCents-promotionalCents)/100,alcoholic};
}
export function promotionLine(offer){return offer.title+': '+offer.items.map(i=>i.quantity+' '+i.name).join(' + ')+'. Precio del combo S/ '+offer.price.toFixed(2)+' (precio normal S/ '+offer.originalTotal.toFixed(2)+', ahorro S/ '+offer.savings.toFixed(2)+'). '+offer.conditions;}
