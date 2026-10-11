import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createAdminHandler} from './admin.mjs';
const port=Number(process.env.ADMIN_PORT||8810);
const handler=createAdminHandler({env:{...process.env,ADMIN_LOCAL_ORIGIN:'http://127.0.0.1:'+port}});
const files={'/admin/':'index.html','/admin/index.html':'index.html','/admin/panel.js':'panel.js','/admin/panel.css':'panel.css'};
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path==='/api/kb-admin')return handler(req,res);
 if(req.method==='GET'&&files[path]){try{const data=await readFile(new URL('../admin/'+files[path],import.meta.url));res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});return res.end(data);}catch{res.writeHead(500);return res.end('No se pudo abrir el panel.');}}
 res.writeHead(404);res.end('No encontrado.');
}).listen(port,'127.0.0.1',()=>console.log('Panel MenuIA: http://127.0.0.1:'+port+'/admin/'));
