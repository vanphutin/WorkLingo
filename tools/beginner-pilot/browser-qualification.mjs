/** Owned synthetic loopback environment. Never loads project .env or a database. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

export function assertDependencyLink(link,target){
 try{if(!fs.lstatSync(link).isSymbolicLink()||path.resolve(fs.realpathSync(link)).toLowerCase()!==path.resolve(fs.realpathSync(target)).toLowerCase())throw Error();}
 catch{throw Error('SNAPSHOT_DEPENDENCY');}
}
export function assertSnapshotSource(repository,directory,revision,files){
 const listing=execFileSync('git',['ls-tree','-r',revision,'--',...files],{cwd:repository,encoding:'utf8'}).trim().split('\n');
 const seen=new Set();
 for(const line of listing){const match=line.match(/^100644 blob ([a-f0-9]+)\t(.+)$/u);if(!match)throw Error('SNAPSHOT_SOURCE_MODE');
  const [,oid,file]=match,location=path.join(directory,file);seen.add(file);
  if(fs.lstatSync(location).isSymbolicLink())throw Error('SNAPSHOT_SOURCE_REPARSE');
  const bytes=fs.readFileSync(location),actual=createHash(oid.length===40?'sha1':'sha256').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(actual===oid)continue;
  // Next generates this declaration when starting its dev server. Only its exact known transformation is allowed.
  if(file==='apps/web/next-env.d.ts'){
   const original=execFileSync('git',['show',revision+':'+file],{cwd:repository,encoding:'utf8'});
   if(bytes.toString()===original.replaceAll('./.next/types/','./.next/dev/types/'))continue;
  }
  throw Error('SNAPSHOT_SOURCE_DRIFT:'+file);
 }
 if(files.some(file=>!seen.has(file)))throw Error('SNAPSHOT_SOURCE_MISSING');
 return true;
}

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base='C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001';
const snapshot=path.join(base,'frontend-snapshot');
const harness=path.join(base,'harness');
const ref='a4685e7cd42d8dbbe949b9d5d1e8429d8bb1694c';
const web=path.join(snapshot,'apps/web');
const cleanEnv=Object.fromEntries(['SystemRoot','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','APPDATA','LOCALAPPDATA','USERPROFILE'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
Object.assign(cleanEnv,{NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',WORKLINGO_API_URL:'http://127.0.0.1:33311',WORKLINGO_LANGUAGE_EVALUATION_PROVIDER:'fake',WORKLINGO_STT_PROVIDER:'fake',WORKLINGO_TTS_PROVIDER:'fake-tts',JOB_WORKER_ENABLED:'false'});

function main(){
if(!['start','resume'].includes(process.argv[2]))throw Error('Usage: node tools/beginner-pilot/browser-qualification.mjs start|resume');
const reuse=process.argv[2]==='resume';
if(fs.existsSync(snapshot)&&!reuse)throw Error('SNAPSHOT_EXISTS: preserve evidence; use explicit resume after inspection');
if(reuse&&JSON.parse(fs.readFileSync(path.join(harness,'runtime.json'),'utf8')).sourceRef!==ref)throw Error('SNAPSHOT_REF_MISMATCH');
fs.mkdirSync(harness,{recursive:true});
const tracked=execFileSync('git',['ls-tree','-r','--name-only',ref],{cwd:repo,encoding:'utf8'}).trim().split('\n');
const rootFiles=new Set(['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.base.json']);
const selectedFiles=tracked.filter(file=>(rootFiles.has(file)||file.startsWith('packages/')||file.startsWith('apps/web/src/')||['apps/web/package.json','apps/web/next.config.ts','apps/web/tsconfig.json','apps/web/next-env.d.ts'].includes(file))&&!/(^|\/)\.env(?:\.|$)/u.test(file)&&!file.includes('/node_modules/'));
for(const file of reuse?[]:tracked){
 const selected=rootFiles.has(file)||file.startsWith('packages/')||file.startsWith('apps/web/src/')||['apps/web/package.json','apps/web/next.config.ts','apps/web/tsconfig.json','apps/web/next-env.d.ts'].includes(file);
 if(!selected||/(^|\/)\.env(?:\.|$)/u.test(file)||file.includes('/node_modules/'))continue;
 const dest=path.join(snapshot,file);fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,execFileSync('git',['show',ref+':'+file],{cwd:repo,maxBuffer:32*1024*1024}));
}
function inspectSources(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 if(entry.name==='node_modules'){
  const rel=path.relative(snapshot,dir).replaceAll('\\','/');
  if(!['','apps/web','packages/contracts','packages/content-format','packages/test-fixtures'].includes(rel))throw Error('SNAPSHOT_UNEXPECTED_DEPENDENCY');
  assertDependencyLink(path.join(dir,entry.name),path.join(repo,rel,'node_modules'));continue;
 }
 if(entry.name==='.next'){if(entry.isSymbolicLink()||!entry.isDirectory())throw Error('SNAPSHOT_BUILD_REPARSE');continue;}
 if(/^\.env(?:\.|$)/u.test(entry.name)||entry.isSymbolicLink())throw Error('SNAPSHOT_UNSAFE_ENTRY');
 if(entry.isFile()&&!selectedFiles.includes(path.relative(snapshot,path.join(dir,entry.name)).replaceAll('\\','/')))throw Error('SNAPSHOT_UNEXPECTED_SOURCE');
 if(entry.isDirectory())inspectSources(path.join(dir,entry.name));
}}
inspectSources(snapshot);
for(const dir of ['','apps/web','packages/contracts','packages/content-format','packages/test-fixtures']){
 const source=path.join(repo,dir,'node_modules'),dest=path.join(snapshot,dir,'node_modules');
 if(fs.existsSync(source)&&!fs.existsSync(dest))fs.symlinkSync(source,dest,'junction');
 if(fs.existsSync(source))assertDependencyLink(dest,source);
}
assertSnapshotSource(repo,snapshot,ref,selectedFiles);
fs.mkdirSync(path.join(base,'screenshots'),{recursive:true});
const req=createRequire(path.join(repo,'apps/api/package.json'));
const nextReq=createRequire(path.join(repo,'apps/web/package.json'));
const children=[];
function launch(name,args,cwd){
 const log=fs.openSync(path.join(harness,name+'.log'),'a');
 const child=spawn(process.execPath,args,{cwd,env:cleanEnv,stdio:['ignore',log,log],windowsHide:true});
 children.push(child);child.on('exit',code=>{console.log(name+' exit '+code);for(const other of children)if(other!==child)other.kill();process.exitCode=code??1;});
 return child;
}
const api=launch('api',[req.resolve('tsx/cli'),path.join(repo,'apps/api/test/beginner-pilot/browser-simulation.test-server.ts'),'--port','33311','--frontend','http://127.0.0.1:33310'],path.join(repo,'apps/api'));
const frontend=launch('frontend',[nextReq.resolve('next/dist/bin/next'),'dev','--webpack','-H','127.0.0.1','-p','33310'],web);
fs.writeFileSync(path.join(harness,'runtime.json'),JSON.stringify({classification:'SYNTHETIC_BROWSER_TESTING',sourceRef:ref,apiPid:api.pid,frontendPid:frontend.pid,api:'http://127.0.0.1:33311',frontend:'http://127.0.0.1:33310',envFilesLoaded:false,database:false,realProviderCalls:0},null,2));
console.log('Owned synthetic frontend http://127.0.0.1:33310; logs '+harness);
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{for(const child of children)child.kill();});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
