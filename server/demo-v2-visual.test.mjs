// Explicit local-only visual fixture. No network, credentials or real AI.
// Start: node server/demo-v2-visual.test.mjs --visual
import http from 'node:http';
import {readFile} from 'node:fs/promises';
if(process.argv.includes('--visual')){
 const root=new URL('../',import.meta.url),sample=JSON.parse(await readFile(new URL('assets/demo-menu.json',root),'utf8'));
 const types={'.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.html':'text/html'};
 http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://local');const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(url.pathname==='/api/chat'||url.pathname==='/api/kb-menu'){
   if(req.method==='GET'&&url.pathname==='/api/kb-menu'&&url.searchParams.get('slug')!=='cerveceria-demo')return json(404,{error:'Fixture: menú ficticio no encontrado. No se sustituyen los datos.'});
   if(req.method==='GET')return json(200,{...sample,business:{name:'Fixture visual · Cervecería MenuIA',description:'Datos ficticios locales para validar la interfaz.'},products:sample.products.map(p=>({...p,stock:p.id==='demo-5'?'agotado':'por confirmar'})),promotions:[],checkedAt:new Date().toISOString()});
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8000)return json(413,{error:'Fixture: cuerpo excesivo'});}const body=JSON.parse(raw);
   if(body.message.includes('error QA'))return json(503,{error:'Error simulado para validar reintento; no se llamó a Gemini.'});
   return json(200,{answer:'Respuesta simulada del fixture local: podés consultar Papas de la casa (S/16) y Limonada natural (S/10). Son los precios de la carta ilustrativa.',provider:'fixture'});
  }
  let path=url.pathname==='/'?'index.html':url.pathname==='/menu/'?'menu/index.html':url.pathname.slice(1);
  if(path.includes('..')||!['index.html','menu/index.html'].includes(path)&&!path.startsWith('assets/')&&!path.startsWith('admin/')&&!path.startsWith('training-lab/')){res.writeHead(404);return res.end();}
  try{let bytes=await readFile(new URL(path,root));const ext=path.slice(path.lastIndexOf('.'));if(ext==='.html')bytes=Buffer.from(bytes.toString().replace('DEMO · DATOS DE EJEMPLO','FIXTURE LOCAL · SIN IA REAL'));res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}
 }).listen(8813,'127.0.0.1',()=>console.log('Fixture local con respuestas identificadas como simuladas: http://127.0.0.1:8813/'));
}
