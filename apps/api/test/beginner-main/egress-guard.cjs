'use strict';
/* global require, module, process, Buffer, URL */
/* eslint-disable @typescript-eslint/no-require-imports -- Node --require preloads must be CommonJS. */
// Reviewed-process safeguards, not an OS sandbox or separate security principal.
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),net=require('node:net'),url=require('node:url');
function allowNetwork(host,port){return ['127.0.0.1','localhost','::1','[::1]'].includes(String(host))&&[55432,47771,47772].includes(Number(port));}
function checkFile(value){
 if(typeof value==='number'||value===undefined)return;
 const file=value instanceof URL?url.fileURLToPath(value):Buffer.isBuffer(value)?value.toString():String(value);
 const full=path.resolve(file),backup=process.env.WORKLINGO_BEGINNER_BACKUP_ROOT;
 if(/^\.env(?:$|\.)/i.test(path.basename(full)))throw Error('MAIN_FILE_EGRESS');
 if(backup){const root=path.resolve(backup),r=path.relative(root,full),parent=path.relative(full,root);if(r===''||(!r.startsWith('..')&&!path.isAbsolute(r))||parent===''||(!parent.startsWith('..')&&!path.isAbsolute(parent)))throw Error('MAIN_FILE_EGRESS');}
}
for(const name of ['open','openSync','readFile','readFileSync','createReadStream','writeFile','writeFileSync','appendFile','appendFileSync','unlink','unlinkSync','rm','rmSync','rmdir','rmdirSync']){const original=fs[name];if(original)fs[name]=function(...args){checkFile(args[0]);return original.apply(this,args);};}
for(const name of ['copyFile','copyFileSync','rename','renameSync']){const original=fs[name];if(original)fs[name]=function(...args){checkFile(args[0]);checkFile(args[1]);return original.apply(this,args);};}
for(const name of ['open','readFile','writeFile','appendFile','unlink','rm','rmdir']){const original=fsp[name];if(original)fsp[name]=function(...args){checkFile(args[0]);return original.apply(this,args);};}
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...raw){const args=Array.isArray(raw[0])?raw[0]:raw,o=args[0];const host=o&&typeof o==='object'?o.host??'127.0.0.1':typeof args[1]==='string'?args[1]:'127.0.0.1',port=o&&typeof o==='object'?o.port:o;if(o&&typeof o==='object'&&o.path||!allowNetwork(host,port))throw Error('MAIN_NETWORK_EGRESS');return connect.apply(this,raw);};
const fetch=globalThis.fetch;
if(fetch)globalThis.fetch=async function(input,init){const u=new URL(typeof input==='string'?input:input instanceof URL?input:input.url);if(!allowNetwork(u.hostname,u.port||(['https:'].includes(u.protocol)?443:80))||!['http:','https:'].includes(u.protocol))throw Error('MAIN_NETWORK_EGRESS');return fetch(input,init);};
require('node:module').syncBuiltinESMExports();
module.exports={allowNetwork};
