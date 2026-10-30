import {spawn,spawnSync} from 'node:child_process';import {randomBytes,randomUUID,createHash} from 'node:crypto';import * as fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
export const ID='worklingo-r12b-finalization-20261030',ROOT='C:/Users/ASUS/AppData/Local/Temp/'+ID;
export const IMAGE='postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24';
const repo=path.resolve(__dirname,'../../../..'),volume=ID+'-pgdata';
export function assertRuntimeUrl(raw:string){const u=new URL(raw);if(u.protocol!=='postgresql:'||u.hostname!=='127.0.0.1'||u.port!=='55434'||u.username!=='wl_finalization'||!u.password||u.pathname!=='/worklingo_finalization'||u.hash||u.search!=='?schema=public')throw Error('FINALIZATION_DSN_REQUIRED');}
export function assertOwned(name:string,label:string,token:string){if(!token||![ID,volume].includes(name)||label!==token)throw Error('FINALIZATION_OWNERSHIP');}
export const isOwnedStop=(token:string,contents:string)=>!!token&&contents.trim()===token;
export function cleanupOwnedResources(token:string,containerCreated:boolean,volumeCreated:boolean,run:(args:string[])=>string){
 if(containerCreated)assertOwned(ID,run(['container','inspect',ID,'--format','{{index .Config.Labels "worklingo.owner"}}']),token);
 if(volumeCreated)assertOwned(volume,run(['volume','inspect',volume,'--format','{{index .Labels "worklingo.owner"}}']),token);
 if(containerCreated){run(['stop',ID]);run(['rm',ID]);}if(volumeCreated)run(['volume','rm',volume]);
}
export function runtimeEnvironment():Record<string,string>{const e:Record<string,string>={NODE_ENV:'test',WORKLINGO_BEGINNER_ISOLATED_TEST:'1',JOB_WORKER_ENABLED:'false',WORKLINGO_LANGUAGE_EVALUATION_PROVIDER:'fake',WORKLINGO_STT_PROVIDER:'fake',WORKLINGO_TTS_PROVIDER:'fake-tts',AI_ROUTING_ENABLED:'false',AI_FALLBACK_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1',PRISMA_HIDE_UPDATE_MESSAGE:'1'};for(const k of ['SystemRoot','WINDIR','PATH','Path','TEMP','TMP','LOCALAPPDATA'])if(process.env[k])e[k]=process.env[k]!;return e;}
const digest=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const statePath=path.join(ROOT,'artifacts','owner.json');
const delay=(n:number)=>new Promise(r=>setTimeout(r,n));
function directory(p:string){const full=path.resolve(p),root=path.resolve(ROOT);if(full!==root&&!full.startsWith(root+path.sep))throw Error('FINALIZATION_PATH');let cursor=full;while(cursor!==path.dirname(cursor)){if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw Error('FINALIZATION_REPARSE');cursor=path.dirname(cursor);}fs.mkdirSync(full,{recursive:true});return full;}
function docker(args:string[],extra:Record<string,string>={}){const r=spawnSync('docker',['--context','desktop-linux',...args],{env:{...runtimeEnvironment(),...extra},encoding:'utf8',timeout:120000,windowsHide:true});if(r.status!==0)throw Error('FINALIZATION_DOCKER_'+args[0]);return r.stdout.trim();}
export async function startRuntime(){
 if(fs.existsSync(statePath))throw Error('FINALIZATION_EXISTING_OWNER');
 const scope=path.join(repo,'mandate/reports/2026-10-30-r12b-finalization-scope.json');if(digest(scope)!=='66838c08b5380887e5d95e2f187b1d1429f95b25def52db69694b0dc72d6940c')throw Error('FINALIZATION_SCOPE');
 for(const p of ['db','storage','frontend','logs','artifacts'])directory(path.join(ROOT,p));
 const token=randomUUID(),password=randomBytes(32).toString('hex'),secret=randomBytes(32).toString('hex'),url=`postgresql://wl_finalization:${password}@127.0.0.1:55434/worklingo_finalization?schema=public`;assertRuntimeUrl(url);
 if(fs.existsSync(path.join(ROOT,'artifacts','launch-manifest.json'))||fs.existsSync(path.join(ROOT,'artifacts','stop.request')))throw Error('FINALIZATION_STALE_RUNTIME_ARTIFACT');
 if(docker(['container','ls','-a','--filter','name=^/'+ID+'$','--format','{{.Names}}'])||docker(['volume','ls','--filter','name=^'+volume+'$','--format','{{.Name}}']))throw Error('FINALIZATION_EXISTING_RESOURCE');
 let volumeCreated=false,containerCreated=false;const children:ReturnType<typeof spawn>[]=[];
 try{
 docker(['image','inspect',IMAGE]);docker(['volume','create','--label','worklingo.owner='+token,volume]);volumeCreated=true;docker(['run','--pull=never','-d','--name',ID,'--label','worklingo.owner='+token,'--publish','127.0.0.1:55434:5432','--mount','type=volume,src='+volume+',dst=/var/lib/postgresql/data','--env','POSTGRES_PASSWORD','--env','POSTGRES_USER=wl_finalization','--env','POSTGRES_DB=worklingo_finalization',IMAGE],{POSTGRES_PASSWORD:password});containerCreated=true;
 fs.writeFileSync(statePath,JSON.stringify({token,container:ID,volume,apiPid:null,webPid:null}),{flag:'wx',mode:0o600});
 let ready=false;for(let i=0;i<60;i++){const r=spawnSync('docker',['--context','desktop-linux','exec',ID,'pg_isready','-U','wl_finalization','-d','worklingo_finalization'],{env:runtimeEnvironment(),encoding:'utf8',windowsHide:true});if(r.status===0){ready=true;break;}await delay(500);}if(!ready)throw Error('FINALIZATION_DB_TIMEOUT');
 const snapshot=directory(path.join(ROOT,'db','migration-snapshot'));fs.copyFileSync(path.join(repo,'apps/api/prisma/schema.prisma'),path.join(snapshot,'schema.prisma'));fs.cpSync(path.join(repo,'apps/api/prisma/migrations'),path.join(snapshot,'migrations'),{recursive:true});
 const migrationManifest:Record<string,string>={};for(const n of fs.readdirSync(path.join(snapshot,'migrations'))){const p=path.join(snapshot,'migrations',n);if(fs.statSync(p).isDirectory())migrationManifest[n]=digest(path.join(p,'migration.sql'));}if(Object.keys(migrationManifest).length!==47)throw Error('FINALIZATION_MIGRATION_COUNT');
 fs.writeFileSync(path.join(ROOT,'artifacts','migration-manifest.json'),JSON.stringify(migrationManifest,null,2));
 const req=createRequire(path.join(repo,'apps/api/package.json')),config=path.join(snapshot,'prisma.config.ts');fs.writeFileSync(config,'module.exports=require('+JSON.stringify(req.resolve('prisma/config'))+').defineConfig('+JSON.stringify({schema:path.join(snapshot,'schema.prisma'),migrations:{path:path.join(snapshot,'migrations')}})+');');
 const env={...runtimeEnvironment(),DATABASE_URL:url,TEST_DATABASE_URL:url,SESSION_SECRET:secret,WORKLINGO_DATA_DIR:path.join(ROOT,'storage'),WL_FINALIZATION_RUNTIME:'1'};
 const migration=spawnSync(process.execPath,[req.resolve('prisma/build/index.js'),'migrate','deploy','--config',config],{cwd:snapshot,env,encoding:'utf8',timeout:180000,windowsHide:true});fs.writeFileSync(path.join(ROOT,'logs','migration.txt'),(migration.stdout+'\n'+migration.stderr).replaceAll(url,'[PRIVATE_DSN]').replaceAll(password,'[PRIVATE_SECRET]'));if(migration.status!==0)throw Error('FINALIZATION_MIGRATION_FAILED');
 // Tracked-only frontend snapshot avoids all repository environment files.
 const frontend=path.join(ROOT,'frontend'),files=spawnSync('git',['ls-files'],{cwd:repo,env:runtimeEnvironment(),encoding:'utf8'});if(files.status!==0)throw Error('FINALIZATION_SOURCE_LIST');const hashes:Record<string,string>={};
 for(const f of files.stdout.trim().split('\n')){if(!(['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.base.json','apps/web/package.json','apps/web/next.config.ts','apps/web/tsconfig.json','apps/web/next-env.d.ts'].includes(f)||f.startsWith('packages/')||f.startsWith('apps/web/src/'))||/(^|\/)\.env(?:\.|$)/u.test(f))continue;const src=path.join(repo,f),dest=path.join(frontend,f);if(fs.lstatSync(src).isSymbolicLink())throw Error('FINALIZATION_SOURCE_LINK');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);hashes[f]=digest(dest);}
 for(const d of ['','apps/web','packages/contracts','packages/content-format','packages/test-fixtures']){const src=path.join(repo,d,'node_modules'),dest=path.join(frontend,d,'node_modules');if(fs.existsSync(src)&&!fs.existsSync(dest))fs.symlinkSync(src,dest,'junction');}
 fs.writeFileSync(path.join(ROOT,'artifacts','frontend-manifest.json'),JSON.stringify(hashes,null,2));
 const guard=path.join(ROOT,'frontend','no-env.cjs');fs.writeFileSync(guard,"const fs=require('fs');const r=fs.readFileSync;fs.readFileSync=function(p,...a){if(/(^|[\\\\/])\\.env(?:\\.[^\\\\/]*)?$/.test(String(p)))throw Error('FINALIZATION_ENV_DENIED');return Reflect.apply(r,fs,[p,...a]);};process.loadEnvFile=()=>{throw Error('FINALIZATION_ENV_DENIED')};");
 const launch=(args:string[],cwd:string,childEnv:Record<string,string>,log:string)=>{const fd=fs.openSync(path.join(ROOT,'logs',log),'a');const p=spawn(process.execPath,args,{cwd,env:childEnv,stdio:['ignore',fd,fd],windowsHide:true});children.push(p);fs.closeSync(fd);p.unref();return p.pid;};
 const apiPid=launch([req.resolve('vitest/vitest.mjs'),'run','--config','test/beginner-pilot/finalization-browser.config.ts'],path.join(repo,'apps/api'),env,'api.txt');fs.writeFileSync(statePath,JSON.stringify({token,container:ID,volume,apiPid,webPid:null}));
 for(let i=0;i<180&&!fs.existsSync(path.join(ROOT,'artifacts','launch-manifest.json'));i++)await delay(500);if(!fs.existsSync(path.join(ROOT,'artifacts','launch-manifest.json')))throw Error('FINALIZATION_API_TIMEOUT');
 const webReq=createRequire(path.join(repo,'apps/web/package.json')),webEnv={...runtimeEnvironment(),NODE_ENV:'development',WORKLINGO_API_URL:'http://127.0.0.1:33442'};
 const webPid=launch(['--require',guard,webReq.resolve('next/dist/bin/next'),'dev','--webpack','-H','127.0.0.1','-p','33443'],path.join(frontend,'apps/web'),webEnv,'web.txt');fs.writeFileSync(statePath,JSON.stringify({token,container:ID,volume,apiPid,webPid}));
 console.log(JSON.stringify({status:'API_READY_WEB_STARTING',url:'http://127.0.0.1:33443',manifest:path.join(ROOT,'artifacts','launch-manifest.json')}));
 while(!fs.existsSync(path.join(ROOT,'artifacts','stop.request'))||!isOwnedStop(token,fs.readFileSync(path.join(ROOT,'artifacts','stop.request'),'utf8')))await delay(1000);
 }finally{
  fs.writeFileSync(path.join(ROOT,'artifacts','stop.request'),token);await delay(1500);
  for(const child of children)if(child.exitCode===null)child.kill();
  cleanupOwnedResources(token,containerCreated,volumeCreated,docker);fs.writeFileSync(path.join(ROOT,'artifacts','cleanup.json'),JSON.stringify({token,containerRemoved:containerCreated,volumeRemoved:volumeCreated,cooperativeApiStop:true}));
 }
}
export async function stopRuntime(){const s=JSON.parse(fs.readFileSync(statePath,'utf8'));for(const kind of ['container','volume']){const name=kind==='container'?ID:volume;const label=docker([kind,'inspect',name,'--format',kind==='container'?'{{index .Config.Labels "worklingo.owner"}}':'{{index .Labels "worklingo.owner"}}']);assertOwned(name,label,s.token);}fs.writeFileSync(path.join(ROOT,'artifacts','stop.request'),s.token);console.log('STOP_REQUESTED; API will close cooperatively; Web remains until named-process verification');}
if(require.main===module){const cmd=process.argv[2];(cmd==='start'?startRuntime():cmd==='stop'?stopRuntime():Promise.resolve(console.log(JSON.stringify({owned:fs.existsSync(statePath),manifest:fs.existsSync(path.join(ROOT,'artifacts','launch-manifest.json'))})))).catch(()=>{console.error('FINALIZATION_RUNTIME_FAILED; sanitized local logs retained; no fallback');process.exitCode=1;});}
