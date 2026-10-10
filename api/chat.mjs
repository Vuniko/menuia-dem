import {handleRequest} from '../server/index.js';
export default async function handler(req,res){
 if(!['preview','production'].includes(process.env.VERCEL_ENV)){res.statusCode=404;return res.end('Deployment only')}
 req.url='/api/chat';return handleRequest(req,res);
}
