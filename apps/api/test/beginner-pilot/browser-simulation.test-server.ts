import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {BrowserSimulation} from './browser-simulation.js';
export function startSimulationServer(port=33311){
 if(port!==33311&&port!==0)throw Error('OWNED_PORT_REQUIRED');
 const simulation=new BrowserSimulation();
 const server=createServer(async(req,res)=>{try{
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'')){res.writeHead(403).end();return;}
  const url=new URL(req.url??'/','http://127.0.0.1'),namespace=(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('WL_SIMULATION_ONLY='))?.slice('WL_SIMULATION_ONLY='.length)??'';
  const chunks:Buffer[]=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>2*1024*1024){res.writeHead(413).end();return;}chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);let body:Record<string,unknown>={};
  if(bytes.length){if(req.headers['content-type']?.startsWith('multipart/form-data')){const form=await new Response(bytes,{headers:{'content-type':req.headers['content-type']}}).formData();for(const [key,value] of form.entries()){if(key==='audio'&&typeof value!=='string'){body.audioBytes=value.size;body.audioSha256=createHash('sha256').update(Buffer.from(await value.arrayBuffer())).digest('hex');}else if(typeof value==='string')body[key]=value;}}else body=JSON.parse(bytes.toString());}
  const result=await simulation.handle(req.method??'GET',url.pathname,namespace,body);res.writeHead(result.status,{'content-type':'application/json','cache-control':'no-store',...result.headers});res.end(Buffer.isBuffer(result.body)?result.body:JSON.stringify(result.body));
 }catch{res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({code:'SIMULATION_REQUEST_INVALID',message:'Invalid synthetic request'}));}});
 server.listen(port,'127.0.0.1');return {server,simulation};
}
if(process.argv[1]?.endsWith('browser-simulation.test-server.ts')){const {server,simulation}=startSimulationServer();server.once('listening',()=>console.log(JSON.stringify({provenance:'SYNTHETIC_BROWSER_TESTING',api:'http://127.0.0.1:33311',frontend:'http://127.0.0.1:33310',manifest:simulation.manifest()})));}

