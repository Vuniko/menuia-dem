import {handleRequest} from '../server/index.js';
export default async function handler(req,res){
 if(process.env.VERCEL_ENV!=='preview'){res.statusCode=404;return res.end('Preview only')}
 req.url='/api/gemini-check';return handleRequest(req,res,{forceGemini:true});
}
