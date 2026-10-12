export const normalize=value=>String(value||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export const money=value=>'S/ '+Number(value).toFixed(2);
export function filterProducts(products,{category='',search=''}={}){
 const query=normalize(search.trim());
 return products.filter(p=>(!category||p.categoryId===category)&&normalize(p.name).includes(query));
}
export function mentionedProducts(answer,products){
 const text=normalize(answer);
 return products.filter(p=>p.stock!=='agotado'&&new RegExp('(^|[^a-z0-9])'+normalize(p.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^a-z0-9])').test(text)).slice(0,3);
}
export function safeImage(value,origin){
 if(typeof value!=='string'||!value)return null;
 try{const url=new URL(value,origin);if(url.username||url.password)return null;
  if(url.protocol==='https:')return url.href;
  if(url.origin===origin&&url.pathname.startsWith('/assets/'))return url.href;
 }catch{}return null;
}
export function productQuestion(product){return 'Sobre el producto «'+product.name+'» de esta carta: ¿qué información y acompañamientos están confirmados?';}
export function validateMenu(data){
 if(!data||!data.business||typeof data.business.name!=='string'||!Array.isArray(data.products)||!Array.isArray(data.categories)||!Array.isArray(data.promotions))throw Error('La carta recibida no tiene el formato esperado.');
 const categories=new Set(data.categories.map(c=>c.id));
 for(const p of data.products)if(typeof p.id!=='string'||typeof p.name!=='string'||!Number.isFinite(Number(p.price))||Number(p.price)<0||!categories.has(p.categoryId))throw Error('No pudimos verificar los productos de esta carta.');
 return data;
}
