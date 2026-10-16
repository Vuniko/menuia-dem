import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('../assets/commerce-v3-demo.json',import.meta.url),'utf8'));
export const DEMO_SLUG='menuia-demo';
export function demonstrationCatalog(){
 const business={id:'00000000-0000-4000-8000-000000000001',slug:DEMO_SLUG,name:'MenuIA · Tienda de demostración',description:'DEMOSTRACIÓN: productos, precios, fotos y existencias ficticios. No se realizan compras ni reservas.',contact:''};
 const categories={ropa:'ropa',calzado:'zapatillas',tecnologia:'tecnologia'};
 const products=fixture.variants.map((v,i)=>{const p=fixture.products.find(p=>p.id===v.productId);return {id:'00000000-0000-4000-8001-'+String(i+1).padStart(12,'0'),business_id:business.id,name:p.name,description:'PRODUCTO DE DEMOSTRACIÓN. '+p.description,category:categories[p.categoryId]||'otros',sku:'DEMO-'+(i+1),size:String(v.attributes?.talla||''),color:String(v.attributes?.color||''),price_cents:v.priceCents??p.priceCents,stock:v.stock.quantity||0,image_url:p.images[0]||'',published:true};});
 return {business,products,isDemonstration:true};
}
