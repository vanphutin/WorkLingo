import ts from 'typescript';
import {defineConfig} from 'vitest/config';
export default defineConfig({envDir:false,plugins:[{name:'disposable-decorators',enforce:'pre',transform(code,id){if(!/\.[cm]?ts$/u.test(id))return undefined;const r=ts.transpileModule(code,{fileName:id,compilerOptions:{emitDecoratorMetadata:true,experimentalDecorators:true,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});return {code:r.outputText,map:null};}},{name:'disposable-guard',resolveId(id){if(id.endsWith('virtual:disposable-guard'))return '\0disposable-guard';},load(id){if(id!=='\0disposable-guard')return undefined;return `
import fs from 'node:fs';import net from 'node:net';import http from 'node:http';import {syncBuiltinESMExports} from 'node:module';
const read=fs.readFileSync,asyncRead=fs.promises.readFile,connect=net.Socket.prototype.connect,listen=http.Server.prototype.listen;const ports=new Set([55434,33442,33443]);http.Server.prototype.listen=function(...args){this.once('listening',()=>{const a=this.address();if(a&&typeof a==='object'){ports.add(a.port);this.once('close',()=>ports.delete(a.port));}});const result=Reflect.apply(listen,this,args);const a=this.address();if(a&&typeof a==='object')ports.add(a.port);return result;};
const denied=p=>{const n=String(p).split(String.fromCharCode(92)).join('/').split('/').pop();return n==='.env'||n.startsWith('.env.');};
fs.readFileSync=function(p,...args){if(denied(p))throw Error('DISPOSABLE_ENV_READ_DENIED');return Reflect.apply(read,fs,[p,...args]);};
fs.promises.readFile=async function(p,...args){if(denied(p))throw Error('DISPOSABLE_ENV_READ_DENIED');return Reflect.apply(asyncRead,fs.promises,[p,...args]);};
process.loadEnvFile=()=>{throw Error('DISPOSABLE_ENV_READ_DENIED');};
net.Socket.prototype.connect=function(...args){const a=Array.isArray(args[0])?args[0]:args;const o=typeof a[0]==='object'?a[0]:{port:a[0],host:a[1]};if(!['127.0.0.1','::1','localhost'].includes(o.host)||!ports.has(Number(o.port)))throw Error('DISPOSABLE_OUTBOUND_DENIED');return Reflect.apply(connect,this,args);};
globalThis.fetch=()=>{throw Error('DISPOSABLE_PROVIDER_DENIED');};syncBuiltinESMExports();
`;}}],test:{environment:'node',fileParallelism:false,maxWorkers:1,setupFiles:['virtual:disposable-guard'],include:['test/beginner-pilot/finalization-browser-bootstrap.spec.ts'],testTimeout:14400000,hookTimeout:180000}});
