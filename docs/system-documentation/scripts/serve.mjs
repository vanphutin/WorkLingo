import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { bundleMermaid } from './vendor.mjs';
const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=process.argv[2]==='dist' ? path.join(home,'dist') : home;
if (directory===home) await bundleMermaid(home);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const requestedPort=Number(process.env.DOCS_PORT??4173);
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    let pathname=decodeURIComponent(url.pathname);
    // Also support a nested static host prefix for QA.
    pathname=pathname.replace(/^\/atlas\//,'/');
    if(pathname==='/') pathname='/index.html';
    if (!/^\/(index\.html|favicon\.svg|src\/[^.][\w./-]+|vendor\/[\w./-]+|data\/system\.json|reports\/[\w.-]+\.md)$/.test(pathname)) {res.writeHead(404);res.end('Not found');return;}
    const file=path.resolve(directory,'.'+pathname);
    if (!file.startsWith(directory+path.sep) || pathname.includes('..')) {res.writeHead(403);res.end('Forbidden');return;}
    const body=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'text/plain','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
});
server.listen(requestedPort,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${server.address().port}/ (${directory})`));
