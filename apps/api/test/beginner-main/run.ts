import {verifyWindow,type RunWindow} from './environment.js';
import {execFileSync,spawn,type ChildProcess} from 'node:child_process';
import {createReadStream,createWriteStream,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,statSync,writeFileSync,copyFileSync,symlinkSync,unlinkSync,rmdirSync,realpathSync} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
import {readMainScope,verifySourceBoundary,verifyContainer,verifyAudit,verifyMainPreflight,makePhaseReceipt,evidenceRoot,sha256,lfHash,mainChildEnvironment,mainPermissionInput,type MainScope,type MainAction,type PhaseReceipt,type MainEvidence,type ContainerProof} from './environment.js';
import {createMainBackup,type BackupIO,type BackupFile,type BackupReceipt} from './backup.js';
import {hashBeginnerRecord} from '../../src/beginner/domain/beginner-environment-preflight.js';
import {beginnerMainBinding} from '@worklingo/contracts';
import {newRunLedger,fileLedgerStore,guardedFixtureClient,createMainFixtures,cleanupMainFixtures,type FixtureDescriptor,type LedgerStore} from './fixtures.js';
import {PrismaService} from '../../src/common/database/prisma.service.js';

export const sqlIdentifier=(v:string):string=>'"'+v.replaceAll('"','""')+'"';
export const sqlLiteral=(v:string):string=>"'"+v.replaceAll("'","''")+"'";
export function verifyPasswordLogging(s:Record<string,string|undefined>):void{
 const rate=s.log_statement_sample_rate,transactionRate=s.log_transaction_sample_rate;
 const samplingDisabled=typeof rate==='string'&&Number.isFinite(Number(rate))&&(s.log_min_duration_sample==='-1'||Number(rate)===0);
 if(s.log_statement!=='none'||s.log_min_duration_statement!=='-1'||s.log_duration!=='off'||!samplingDisabled||transactionRate===undefined||Number(transactionRate)!==0||s.password_encryption!=='scram-sha-256'||s.shared_preload_libraries!==''||s.debug_print_parse!=='off'||s.debug_print_rewritten!=='off'||s.debug_print_plan!=='off'||s.log_min_error_statement!=='panic')throw Error('MAIN_PASSWORD_LOGGING');
}
function operatorEnvironment():NodeJS.ProcessEnv{
 const env:NodeJS.ProcessEnv={};for(const k of ['SystemRoot','WINDIR','PATH','Path','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[k])env[k]=process.env[k];return env;
}
export function mainCommandBudget(window:RunWindow,phase:'test'|'cleanup',now=Date.now()):number{
 verifyWindow(window,phase,now);return Date.parse(window.deadline)-(phase==='test'?30*60*1000:0)-now;
}
export interface ProcessIntent {label:string;pid?:number;binary?:string;startedAt:string;state:'intent'|'running'|'closed'}
export function assertRecoveryShutdown(processes:readonly ProcessIntent[]):void{
 // PID alone is not ownership proof after a crash (PID reuse and descendants).
 // Do not guess or kill: any unconfirmed launch quarantines DB/file cleanup.
 if(processes.some(p=>p.state!=='closed'))throw Error('MAIN_PROCESS_RECOVERY_QUARANTINE');
}
function docker(scope:MainScope,args:string[],input?:string|Buffer,window?:RunWindow):Buffer{
 try{return execFileSync('docker',['--context',scope.environment.docker.context,...args],{input,env:operatorEnvironment(),windowsHide:true,maxBuffer:16*1024*1024,timeout:window?Math.min(60000,mainCommandBudget(window,'cleanup')):60000,stdio:['pipe','pipe','pipe']});}
 catch{throw Error('MAIN_DOCKER_COMMAND_FAILED');}
}
export interface BootstrapSqlPort {query<T>(statement:string,write?:boolean):T}
export function bootstrapPort(scope:MainScope,window:RunWindow):BootstrapSqlPort{
 return {query<T>(statement:string,write=false):T{
  verifyWindow(window,'cleanup');
  const identityGuard=write?`DO $identity$ BEGIN IF current_database()<>'worklingo' OR (SELECT oid::text FROM pg_database WHERE datname=current_database())<>'16384' OR (SELECT system_identifier::text FROM pg_control_system())<>'7692646346822291490' OR EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid() AND usename<>${sqlLiteral(scope.runtimeRole.name)} AND application_name<>${sqlLiteral('wl-main-'+scope.environment.runId)}) THEN RAISE EXCEPTION 'MAIN_IDENTITY_OR_FOREIGN_CLIENT'; END IF; END $identity$; `:'';
  const remaining=mainCommandBudget(window,'cleanup');if(remaining<1000)throw Error('MAIN_WINDOW_EXPIRED');
  const sql='BEGIN '+(write?'':'READ ONLY')+"; SET LOCAL application_name = 'wl-main-"+scope.environment.runId+"'; SET LOCAL TIME ZONE 'UTC'; SET LOCAL statement_timeout = '"+Math.min(30000,remaining-500)+"ms'; SET LOCAL lock_timeout = '1500ms'; "+identityGuard+statement+'; COMMIT;';
  const output=docker(scope,['exec','-i','--user','postgres',scope.environment.docker.id,'/usr/local/bin/psql','-X','-w','-qAt','-v','ON_ERROR_STOP=1','-h','/var/run/postgresql','-p','5432','-U','worklingo','-d','worklingo','-f','-'],sql,window).toString('utf8').trim();
  if(!output)return undefined as T;
  try{return JSON.parse(output) as T;}catch{throw Error('MAIN_SQL_OUTPUT_SHAPE');}
 }};
}
export function collectMainIdentity(scope:MainScope,port:BootstrapSqlPort):MainEvidence{
 const row=port.query<MainEvidence>(`SELECT json_build_object('database',current_database(),'databaseOid',(SELECT oid::text FROM pg_database WHERE datname=current_database()),'systemIdentifier',(SELECT system_identifier::text FROM pg_control_system()),'clusterName',current_setting('cluster_name'),'role',current_user,'roleOid',(SELECT oid::text FROM pg_roles WHERE rolname=current_user),'foreignClients',(SELECT count(*)::int FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid() AND usename<>${sqlLiteral(scope.runtimeRole.name)} AND application_name<>${sqlLiteral('wl-main-'+scope.environment.runId)}))`);
 const evidence={...row,phase:'audit' as const,host:scope.environment.database.host,port:scope.environment.database.port};verifyMainPreflight(scope,evidence);return evidence;
}
export interface TableDigest {schema:string;table:string;count:string;digest:string}
export function collectTableDigests(scope:MainScope,port:BootstrapSqlPort):TableDigest[]{
 const tables=port.query<string[]>(`SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'`);
 if(tables.length!==97||tables.some(t=>!scope.dataPreservation.tableCounts.some(v=>v.table===t)))throw Error('MAIN_TABLE_DRIFT');
 const unions=tables.map(t=>`SELECT 'public' AS schema,${sqlLiteral(t)} AS "table",count(*)::text AS count,encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex'),'' ORDER BY encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex')),''),'UTF8')),'hex') AS digest FROM public.${sqlIdentifier(t)} r`).join(' UNION ALL ');
 return port.query<TableDigest[]>('SELECT json_agg(x ORDER BY x.table) FROM ('+unions+') x');
}
function inspectContainer(scope:MainScope):ContainerProof{
 const d=scope.environment.docker,rows=JSON.parse(docker(scope,['inspect',d.id]).toString('utf8')) as ContainerProof[];
 const active=docker(scope,['ps','-q','--no-trunc','--filter','volume='+d.volume]).toString('utf8').trim().split(/\s+/u).filter(Boolean);
 const c=rows[0];if(!c)throw Error('MAIN_CONTAINER_IDENTITY');verifyContainer(scope,c,active);return c;
}
interface PrivateAclProof {owner:string;protected:boolean;rules:Array<{sid:string;type:string;rights:string}>}
export function readPrivateDirectoryAcl(dir:string,run:(binary:string,args:string[],options:{env:NodeJS.ProcessEnv;encoding:'utf8';windowsHide:boolean})=>string=(binary,args,options)=>execFileSync(binary,args,options)):PrivateAclProof{
 const escaped=dir.replaceAll("'","''"),env=operatorEnvironment();
 const command=`$ErrorActionPreference='Stop'; $a=Get-Acl -LiteralPath '${escaped}'; [pscustomobject]@{owner=$a.GetOwner([System.Security.Principal.SecurityIdentifier]).Value;protected=$a.AreAccessRulesProtected;rules=@($a.Access|ForEach-Object{[pscustomobject]@{sid=$_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value;type=$_.AccessControlType.ToString();rights=$_.FileSystemRights.ToString()}})}|ConvertTo-Json -Depth 5 -Compress`;
 try{return JSON.parse(run(path.join(env.SystemRoot!,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',command],{env,encoding:'utf8',windowsHide:true})) as PrivateAclProof;}catch{throw Error('MAIN_ACL_PROBE_FAILED');}
}
function preparePrivateDirectories(scope:MainScope,receipt:(data:unknown)=>void):void{
 const sid=scope.environment.operatorSid;
 const current=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true});if(!current.includes(sid))throw Error('MAIN_OPERATOR_IDENTITY');
 for(const dir of scope.environment.filesystem.newDirectories){
  if(existsSync(dir))throw Error('MAIN_PATH_EXISTS');
  let p=path.dirname(dir);while(true){if(lstatSync(p).isSymbolicLink())throw Error('MAIN_PATH_REPARSE');const next=path.dirname(p);if(next===p)break;p=next;}
  mkdirSync(dir);receipt({createdDirectory:dir});
  // Only the just-created object is touched. The owner is explicitly ASUS, even under an elevated token.
  execFileSync('icacls',[dir,'/setowner','*'+sid],{windowsHide:true,stdio:'pipe'});
  execFileSync('icacls',[dir,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F','*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'],{windowsHide:true,stdio:'pipe'});
  const proof=readPrivateDirectoryAcl(dir);
  if(proof.owner!==sid||!proof.protected||proof.rules.length!==3||proof.rules.some(r=>![sid,'S-1-5-18','S-1-5-32-544'].includes(r.sid)||r.type!=='Allow'||r.rights!=='FullControl'))throw Error('MAIN_PRIVATE_ACL');receipt({directory:dir,acl:proof});
 }
}
function auditMigrations(scope:MainScope,port:BootstrapSqlPort):unknown{
 const root=path.join(scope.baseline.worktree,'apps/api/prisma/migrations');
 const expected=scope.baseline.sourceFiles.filter(f=>f.path.startsWith('apps/api/prisma/migrations/')&&f.path.endsWith('/migration.sql'));
 if(expected.length!==47||readdirSync(root).filter(n=>existsSync(path.join(root,n,'migration.sql'))).length!==47)throw Error('MAIN_MIGRATION_LIST');
 const rows=port.query<Array<{name:string;checksum:string;finished:boolean;rolledBack:boolean}>>(`SELECT json_agg(json_build_object('name',migration_name,'checksum',checksum,'finished',finished_at IS NOT NULL,'rolledBack',rolled_back_at IS NOT NULL) ORDER BY migration_name,started_at) FROM public._prisma_migrations`);
 const applied=rows.filter(r=>r.finished&&!r.rolledBack),unknown=rows.filter(r=>!r.finished&&!r.rolledBack);
 const allowedMismatch=new Set(['20261006000100_mastery_events_and_records','20261011000100_increment_5b_curriculum_admin','20261015000200_ielts_flow_v3']);
 const mismatch=applied.filter(r=>sha256(readFileSync(path.join(root,r.name,'migration.sql')))!==r.checksum).map(r=>r.name);
 if(rows.length!==51||applied.length!==47||unknown.length||rows.filter(r=>r.rolledBack).length!==4||applied.some(r=>!expected.some(e=>e.path.endsWith('/'+r.name+'/migration.sql')))||mismatch.length!==3||mismatch.some(n=>!allowedMismatch.has(n)))throw Error('MAIN_MIGRATION_DRIFT');
 return {lockedFiles:48,applied:47,rolledBack:4,pending:0,checksumMismatch:mismatch,checksumCause:'UNKNOWN'};
}
async function fileHash(file:string):Promise<string>{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk as Buffer);return hash.digest('hex');}
function nativeBackupIO(scope:MainScope,window:RunWindow):BackupIO{
 const inspect=async(file:string):Promise<BackupFile>=>({path:file,bytes:statSync(file).size,sha256:await fileHash(file),exitCode:0});
 const stream=async(binary:string,args:string[],file:string):Promise<BackupFile>=>{
  const signal=AbortSignal.timeout(mainCommandBudget(window,'test'));
  const child=spawn('docker',['--context',scope.environment.docker.context,'exec','--user','postgres',scope.environment.docker.id,'/usr/local/bin/'+binary,...args],{signal,env:operatorEnvironment(),windowsHide:true,stdio:['ignore','pipe','pipe']});
  let warnings=0;child.stderr.on('data',b=>{warnings+=b.length;});const done=new Promise<number>((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??-1));});
  const results=await Promise.allSettled([pipeline(child.stdout,createWriteStream(file,{flags:'wx'}),{signal}),done]);if(results.some(r=>r.status==='rejected'))throw Error('MAIN_BACKUP_STREAM_FAILED');const exitCode=(results[1] as PromiseFulfilledResult<number>).value;return {...await inspect(file),exitCode,warnings};
 };
 const decode=async(file:string,list:boolean):Promise<number>=>{
  const signal=AbortSignal.timeout(mainCommandBudget(window,'test'));
  const child=spawn('docker',['--context',scope.environment.docker.context,'exec','-i','--user','postgres',scope.environment.docker.id,'/usr/local/bin/pg_restore',...(list?['--list']:['--exit-on-error','--file=/dev/null'])],{signal,env:operatorEnvironment(),windowsHide:true,stdio:['pipe','ignore','pipe']});let warnings=0;child.stderr.on('data',b=>{warnings+=b.length;});const done=new Promise<number>((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code===0&&warnings===0?0:-1));});const results=await Promise.allSettled([pipeline(createReadStream(file),child.stdin,{signal}),done]);if(results.some(r=>r.status==='rejected'))throw Error('MAIN_BACKUP_DECODE_FAILED');return (results[1] as PromiseFulfilledResult<number>).value;
 };
 return {inspect,archive:({database,path:file})=>stream('pg_dump',['-h','/var/run/postgresql','-p','5432','-U','worklingo','-w','-Fc','-d',database],file),globals:({database,path:file})=>stream('pg_dumpall',['-h','/var/run/postgresql','-p','5432','-U','worklingo','-w','--globals-only','--no-role-passwords','-l',database],file),list:file=>decode(file,true),decode:file=>decode(file,false)};
}
function schemaFingerprint(port:BootstrapSqlPort):string{
 return port.query<string>(`SELECT to_json(encode(sha256(convert_to(coalesce(string_agg(x,'|' ORDER BY x),''),'UTF8')),'hex')) FROM (
 SELECT c.relname||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') x FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
 UNION ALL SELECT c.relname||':'||co.conname||':'||pg_get_constraintdef(co.oid) FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 UNION ALL SELECT tablename||':'||indexname||':'||indexdef FROM pg_indexes WHERE schemaname='public'
 UNION ALL SELECT c.relname||':'||pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
 UNION ALL SELECT p.proname||':'||pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'
 UNION ALL SELECT t.typname||':'||e.enumlabel||':'||e.enumsortorder FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public') q`);
}
function verifyUnsupportedSchema(scope:MainScope,port:BootstrapSqlPort):void{
 const migration=(name:string)=>readFileSync(path.join(scope.baseline.worktree,'apps/api/prisma/migrations',name,'migration.sql'),'utf8');
 const mastery=migration('20261006000100_mastery_events_and_records'),ielts=migration('20261015000200_ielts_flow_v3');
 const normalize=(s:string)=>s.replace(/\s+/gu,' ').trim();
 const actual=port.query<Array<{name:string;expression:string}>>(`SELECT json_agg(json_build_object('name',conname,'expression',pg_get_expr(conbin,conrelid))) FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace`);
 const expected=[...mastery.matchAll(/CONSTRAINT "([^"]+)" CHECK \((.+)\)/gu),...ielts.matchAll(/ADD CONSTRAINT "([^"]+)" CHECK \((.+)\);/gu)];
 if(expected.length!==9)throw Error('MAIN_CHECK_SOURCE');
 for(const match of expected){
  const found=actual.find(c=>c.name===match[1]),table=match[1]!.split('_')[0]!;if(!found)throw Error('MAIN_CHECK_MISSING:'+match[1]);
  // Ask PostgreSQL to parse/deparse both expressions. Preserve grouping/casts; no home-grown SQL normalization.
  const expression=(sql:string)=>port.query<Array<{Plan:{Output:string[]}}>>(`EXPLAIN (VERBOSE,FORMAT JSON,COSTS OFF) SELECT (${sql}) FROM public.${sqlIdentifier(table)}`)[0]?.Plan.Output[0];
  const sourceExpression=expression(match[2]!),actualExpression=expression(found.expression);
  if(!sourceExpression||!actualExpression||normalize(sourceExpression)!==normalize(actualExpression))throw Error('MAIN_CHECK_SEMANTICS:'+match[1]);
 }
 const body=ielts.match(/CREATE FUNCTION protect_ielts_topic_version\(\) RETURNS trigger LANGUAGE plpgsql AS \$\$([\s\S]*?)\$\$;/u)?.[1];
 const fn=port.query<Array<{body:string;definer:boolean;triggerType:number;enabled:string}>>(`SELECT json_agg(json_build_object('body',p.prosrc,'definer',p.prosecdef,'triggerType',t.tgtype::int,'enabled',t.tgenabled)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_trigger t ON t.tgfoid=p.oid JOIN pg_class c ON c.oid=t.tgrelid WHERE n.nspname='public' AND p.proname='protect_ielts_topic_version' AND c.relname='IeltsTopicVersion' AND t.tgname='IeltsTopicVersion_immutable'`);
 if(!body||fn?.length!==1||fn[0]?.definer||fn[0]?.triggerType!==27||fn[0]?.enabled!=='O'||normalize(fn[0]?.body??'')!==normalize(body))throw Error('MAIN_TRIGGER_SEMANTICS');
}
interface OwnedProcess {child:ChildProcess;done:Promise<number>;stop():Promise<void>}
function spawnReviewed(scope:MainScope,binary:string,args:string[],cwd:string,env:NodeJS.ProcessEnv,label:string,secrets:string[],window:RunWindow,onPid:(pid:number|undefined)=>void,onClosed:(code:number)=>void):OwnedProcess{
 const child=spawn(binary,args,{cwd,env,timeout:mainCommandBudget(window,'test'),windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';onPid(child.pid);
 for(const stream of [child.stdout,child.stderr])stream?.on('data',b=>{output+=String(b);});
 const done=new Promise<number>(resolve=>{child.once('error',()=>resolve(-1));child.once('close',code=>{
  for(const secret of secrets.filter(Boolean))output=output.replaceAll(secret,'[REDACTED]');
  writeFileSync(path.join(scope.environment.filesystem.runRoot,'artifacts',label+'.log'),output,{flag:'wx'});onClosed(code??-1);resolve(code??-1);
 });});
 return {child,done,async stop(){if(child.exitCode===null){child.kill('SIGTERM');await Promise.race([done,new Promise<void>(r=>setTimeout(r,5000))]);if(child.exitCode===null)throw Error('MAIN_OWNED_PROCESS_STILL_RUNNING');}}};
}
function grantStatements(scope:MainScope,role:string,revoke=false):string{
 const r=sqlIdentifier(role),direction=revoke?'FROM':'TO',verb=revoke?'REVOKE':'GRANT';let sql='';
 sql+=`${verb} CONNECT ON DATABASE worklingo ${direction} ${r}; ${verb} USAGE ON SCHEMA public ${direction} ${r}; ${verb} EXECUTE ON FUNCTION pg_catalog.pg_control_system() ${direction} ${r}; `;
 for(const table of scope.runtimeRole.dmlTablesInitiallyEmpty)sql+=`${verb} SELECT,INSERT,UPDATE,DELETE ON TABLE public.${sqlIdentifier(table)} ${direction} ${r}; `;
 for(const table of scope.runtimeRole.insertSelectOnlyTablesInitiallyEmpty)sql+=`${verb} SELECT,INSERT ON TABLE public.${sqlIdentifier(table)} ${direction} ${r}; `;
 for(const table of scope.runtimeRole.readOnlyProtected)sql+=`${verb} SELECT ON TABLE public.${sqlIdentifier(table)} ${direction} ${r}; `;
 sql+=`${verb} SELECT (${scope.runtimeRole.selectColumns.LearningProgram.map(sqlIdentifier).join(',')}), UPDATE ("updatedAt") ON TABLE public."LearningProgram" ${direction} ${r}; `;return sql;
}
function runtimePrivilegeEvidence(scope:MainScope,port:BootstrapSqlPort,oid:string):MainEvidence{
 const role=sqlLiteral(scope.runtimeRole.name),protectedTables=scope.runtimeRole.readOnlyProtected.map(sqlLiteral).join(',');
 const proof=port.query<MainEvidence>(`SELECT json_build_object('superuser',r.rolsuper,'createDb',r.rolcreatedb,'createRole',r.rolcreaterole,'replication',r.rolreplication,'bypassRls',r.rolbypassrls,'owner',EXISTS(SELECT 1 FROM pg_shdepend WHERE refclassid='pg_authid'::regclass AND refobjid=r.oid AND deptype='o'),'memberships',(SELECT count(*)::int FROM pg_auth_members WHERE member=r.oid),'createSchema',has_schema_privilege(${role},'public','CREATE') OR has_database_privilege(${role},'worklingo','CREATE'),'truncate',EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND has_table_privilege(${role},quote_ident(schemaname)||'.'||quote_ident(tablename),'TRUNCATE')),'protectedDml',EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename IN (${protectedTables}) AND has_table_privilege(${role},quote_ident(schemaname)||'.'||quote_ident(tablename),'INSERT,UPDATE,DELETE')),'unsafeDefiner',EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND p.prosecdef AND has_function_privilege(${role},p.oid,'EXECUTE'))) FROM pg_roles r WHERE r.rolname=${role} AND r.oid::text=${sqlLiteral(oid)}`);
 const identity=collectMainIdentity(scope,port),result={...identity,...proof,phase:'runtime' as const,role:scope.runtimeRole.name,roleOid:oid};verifyMainPreflight(scope,result);return result;
}
function sourceMirror(scope:MainScope):string{
 const root=scope.baseline.worktree,mirror=path.join(scope.environment.filesystem.runRoot,'build-mirror');
 const files=execFileSync('git',['-c','safe.directory='+root,'ls-files','-z','apps/web','packages','tsconfig.base.json','package.json','pnpm-workspace.yaml'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 for(const file of files){if(file.split('/').some(p=>p.startsWith('.env')||p==='node_modules'||p==='data'))throw Error('MAIN_MIRROR_SECRET_PATH');const dest=path.join(mirror,file);mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(path.join(root,file),dest);}
 symlinkSync(scope.environment.filesystem.dependencyTarget,scope.environment.filesystem.dependencyLink,'junction');
 // Build-only resolution overlay; copied source remains byte-identical and contains no dotenv files.
 const tsfile=path.join(mirror,'apps/web/tsconfig.json'),ts=JSON.parse(readFileSync(tsfile,'utf8')) as {compilerOptions:Record<string,unknown>};
 ts.compilerOptions.baseUrl=root.replaceAll('\\','/');ts.compilerOptions.paths={'next/*':['apps/web/node_modules/next/*'],react:['apps/web/node_modules/@types/react'],'react/*':['apps/web/node_modules/@types/react/*'],'react-dom/*':['apps/web/node_modules/@types/react-dom/*'],'@worklingo/contracts':['packages/contracts/src/index.ts'],'@worklingo/content-format':['packages/content-format/src/index.ts']};writeFileSync(tsfile,JSON.stringify(ts));return mirror;
}
async function waitHttp(url:string,headers:Record<string,string>,owned:OwnedProcess):Promise<void>{
 for(let n=0;n<100;n++){if(owned.child.exitCode!==null)throw Error('MAIN_SERVER_EXITED');try{const response=await fetch(url,{headers,signal:AbortSignal.timeout(1000)});if(response.status===200)return;}catch{/* bounded readiness retry, never test retry */}await new Promise(r=>setTimeout(r,300));}throw Error('MAIN_SERVER_TIMEOUT');
}
export async function runMainAction(scopePath:string,action:MainAction):Promise<PhaseReceipt>{
 if(!['preflight','unit','execute','cleanup-recovery'].includes(action))throw Error('MAIN_ACTION');
 const scope=readMainScope(scopePath),files=verifySourceBoundary(scope),evidenceFile=path.join(evidenceRoot,'main-run-receipts.json');
 const receipts:PhaseReceipt[]=existsSync(evidenceFile)?JSON.parse(readFileSync(evidenceFile,'utf8')) as PhaseReceipt[]:[];
 const record=(phase:string,status:PhaseReceipt['status'],details:unknown)=>{const value=makePhaseReceipt(scope,phase,status,details,receipts.at(-1)??null);receipts.push(value);writeFileSync(evidenceFile,JSON.stringify(receipts,null,2));console.log(JSON.stringify({phase,status,details}));return value;};
 const t0File=path.join(evidenceRoot,'main-run-window.json');
 if(action==='preflight'){inspectContainer(scope);return record('preflight','PASS',{approved:true,sourceFiles:files.length,sourceBoundary:true,dbWrites:0});}
 if(action==='unit'){
  execFileSync('cmd.exe',['/d','/s','/c','pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-main-tools.config.ts'],{cwd:scope.baseline.worktree,env:operatorEnvironment(),windowsHide:true,stdio:'pipe',timeout:60000});return record('unit','PASS',{command:scope.commands.runnerActions.unit,dbWrites:0});
 }
 if(action==='execute'&&existsSync(t0File))throw Error('MAIN_RUN_ALREADY_STARTED');
 const window:RunWindow=action==='execute'?{startedAt:new Date().toISOString(),deadline:new Date(Date.now()+4*60*60*1000).toISOString()}:JSON.parse(readFileSync(t0File,'utf8')) as RunWindow;
 if(action==='execute'){window.deadline=new Date(Date.parse(window.startedAt)+4*60*60*1000).toISOString();writeFileSync(t0File,JSON.stringify(window),{flag:'wx'});}
 verifyWindow(window,action==='execute'?'test':'cleanup');
 const port=bootstrapPort(scope,window),root=scope.environment.filesystem.runRoot,api=path.join(scope.baseline.worktree,'apps/api'),req=createRequire(path.join(api,'package.json'));
 const stateFile=path.join(evidenceRoot,'main-owned-state.json');
 type State={startedContainer:boolean;directories:string[];processes?:ProcessIntent[];roleOid?:string;roleIntent?:boolean;baseline?:TableDigest[];schemaHash?:string;backup?:BackupReceipt;fixture?:FixtureDescriptor};
 const state:State=action==='cleanup-recovery'?JSON.parse(readFileSync(stateFile,'utf8')) as State:{startedContainer:false,directories:[]};
 const persist=()=>writeFileSync(stateFile,JSON.stringify(state,null,2));
 const processes:OwnedProcess[]=[],connections:PrismaService[]=[];
 let store:LedgerStore,env:Record<string,string>={},url='',secret='',cookies:string[]=[],password='';
 const redactions=()=>[password,url,secret,...cookies];
 const trackedSpawn=(binary:string,args:string[],cwd:string,label:string,childEnv:NodeJS.ProcessEnv)=>{
  const intent:ProcessIntent={label,binary,startedAt:new Date().toISOString(),state:'intent'};(state.processes??=[]).push(intent);persist();
  const p=spawnReviewed(scope,binary,args,cwd,childEnv,label,redactions(),window,pid=>{if(pid!==undefined)intent.pid=pid;intent.state='running';persist();},code=>{if(code===0)intent.state='closed';persist();});processes.push(p);return p;
 };
 const child=async(binary:string,args:string[],cwd:string,label:string,childEnv:NodeJS.ProcessEnv=env)=>{const p=trackedSpawn(binary,args,cwd,label,childEnv);const code=await p.done;if(code!==0)throw Error('MAIN_CHILD_FAILED:'+label+':'+code);};
 async function cleanup(){
  // Shutdown is always attempted, even after authority expires. Mutations below are separately gated.
  const shutdownErrors:unknown[]=[];for(const p of [...processes].reverse())try{await p.stop();}catch(e){shutdownErrors.push(e);}for(const db of connections)try{await db.$disconnect();}catch(e){shutdownErrors.push(e);}
  if(shutdownErrors.length)throw new AggregateError(shutdownErrors,'MAIN_SHUTDOWN_QUARANTINE');
  verifyWindow(window,'cleanup');
  if(action==='cleanup-recovery')assertRecoveryShutdown(state.processes??[]);
  if(state.roleOid&&port.query<number>(`SELECT to_json(count(*)::int) FROM pg_stat_activity WHERE usename=${sqlLiteral(scope.runtimeRole.name)}`)!==0)throw Error('MAIN_RUNTIME_CONNECTIONS_QUARANTINE');
  if(state.baseline&&existsSync(path.join(root,'ledger.json'))){const ledger=JSON.parse(readFileSync(path.join(root,'ledger.json'),'utf8'));const result=cleanupMainFixtures(scope,port,ledger,state.baseline);record('data-cleanup','PASS',result);}
  if(state.roleOid){
   const oid=port.query<string|null>(`SELECT to_json(oid::text) FROM pg_roles WHERE rolname=${sqlLiteral(scope.runtimeRole.name)}`);
   if(oid!==state.roleOid)throw Error('MAIN_ROLE_OWNERSHIP');
   port.query(grantStatements(scope,scope.runtimeRole.name,true)+`DROP ROLE ${sqlIdentifier(scope.runtimeRole.name)}`,true);record('role-cleanup','PASS',{oid,role:scope.runtimeRole.name});
  }
  else if(state.roleIntent&&port.query<boolean>(`SELECT to_json(EXISTS(SELECT 1 FROM pg_roles WHERE rolname=${sqlLiteral(scope.runtimeRole.name)}))`))throw Error('MAIN_ROLE_OID_UNKNOWN_QUARANTINE');
  if(state.baseline){if(hashBeginnerRecord(collectTableDigests(scope,port))!==hashBeginnerRecord(state.baseline)||schemaFingerprint(port)!==state.schemaHash)throw Error('MAIN_POST_CLEANUP_DRIFT');record('preservation','PASS',{tables:97,countsAndDigestsUnchanged:true,schemaUnchanged:true});}
  if(existsSync(path.join(root,'ledger.json'))){const ledger=JSON.parse(readFileSync(path.join(root,'ledger.json'),'utf8')) as ReturnType<LedgerStore['read']>;
   for(const file of ledger.files??[]){if(file.deleted)continue;if(!existsSync(file.path))continue;if(sha256(readFileSync(file.path))!==file.sha256)throw Error('MAIN_STORAGE_CHANGED');unlinkSync(file.path);}
   const registry=path.join(scope.environment.filesystem.registryRoot,'fixture-'+scope.environment.runId+'.candidate');if(existsSync(registry)){const value=JSON.parse(readFileSync(registry,'utf8')) as {state:string;environmentId:string};if(value.state!=='TEST_PUBLISHED'||value.environmentId!=='main-'+scope.environment.runId)throw Error('MAIN_REGISTRY_CLEANUP');unlinkSync(registry);}
   if(readdirSync(scope.environment.filesystem.registryRoot).length)throw Error('MAIN_REGISTRY_UNKNOWN_FILE');
  }
  if(state.startedContainer){collectMainIdentity(scope,port);docker(scope,['stop','--time','15',scope.environment.docker.id]);record('container-restored','PASS',{running:false});}
  const link=scope.environment.filesystem.dependencyLink;if(existsSync(link)){if(!lstatSync(link).isSymbolicLink()||path.normalize(realpathSync(link))!==path.normalize(scope.environment.filesystem.dependencyTarget))throw Error('MAIN_DEPENDENCY_LINK_OWNERSHIP');rmdirSync(link);}
  for(const dir of [...state.directories].reverse()){
   if(!existsSync(dir)||path.resolve(dir).startsWith(path.resolve(scope.environment.filesystem.backupBase))||readdirSync(dir).length)continue;
   if(!scope.environment.filesystem.newDirectories.includes(dir)||lstatSync(dir).isSymbolicLink())throw Error('MAIN_DIRECTORY_OWNERSHIP');
   const acl=readPrivateDirectoryAcl(dir);if(acl.owner!==scope.environment.operatorSid||!acl.protected||acl.rules.length!==3||acl.rules.some(r=>![scope.environment.operatorSid,'S-1-5-18','S-1-5-32-544'].includes(r.sid)||r.type!=='Allow'||r.rights!=='FullControl'))throw Error('MAIN_DIRECTORY_OWNERSHIP');
   rmdirSync(dir);record('empty-directory-cleanup','PASS',{path:dir,owner:acl.owner});
  }
  record('cleanup','PASS',{backupRetained:!!state.backup,restore:'NOT_TESTED',auditAndBuildArtifacts:'RETAINED_ACCOUNTED',directories:state.directories});
 }
 if(action==='cleanup-recovery'){await cleanup();return receipts.at(-1)!;}
 const handlers:MainPhaseHandlers={
  'prepare-paths':async()=>{preparePrivateDirectories(scope,data=>{const dir=(data as {createdDirectory?:string}).createdDirectory;if(dir){state.directories.push(dir);persist();}});writeFileSync(path.join(root,'run.json'),JSON.stringify({...window,runId:scope.environment.runId,environmentId:'main-'+scope.environment.runId}),{flag:'wx'});writeFileSync(path.join(root,'ledger.json'),JSON.stringify(newRunLedger(scope)),{flag:'wx'});store=fileLedgerStore(scope,window);record('prepare-paths','PASS',{privateDirectories:state.directories.length});},
  'start-existing':async()=>{const current=inspectContainer(scope);if(!current.State.Running){state.startedContainer=true;persist();docker(scope,['start',scope.environment.docker.id]);}for(let n=0;n<30;n++){try{collectMainIdentity(scope,port);record('start-existing','PASS',{id:scope.environment.docker.id,runOwnedStart:state.startedContainer});return;}catch{await new Promise(r=>setTimeout(r,500));}}throw Error('MAIN_LIVE_IDENTITY_BLOCKED');},
  audit:async()=>{
   const identity=collectMainIdentity(scope,port),migrations=auditMigrations(scope,port),baseline=collectTableDigests(scope,port);
   const settings=port.query<Record<string,string>>(`SELECT json_object_agg(name,setting) FROM pg_settings WHERE name IN ('log_statement','log_min_duration_statement','log_min_duration_sample','log_statement_sample_rate','log_transaction_sample_rate','log_duration','log_min_error_statement','log_parameter_max_length_on_error','password_encryption','shared_preload_libraries','debug_print_parse','debug_print_rewritten','debug_print_plan')`);
   const roleExists=port.query<boolean>(`SELECT to_json(EXISTS(SELECT 1 FROM pg_roles WHERE rolname=${sqlLiteral(scope.runtimeRole.name)}))`);
   verifyPasswordLogging(settings);const unsafeLogging=false;
   record('audit-observed','PASS',{identity,migrations,counts:baseline.map(({schema,table,count})=>({schema,table,count})),logging:settings,roleExists});
   verifyAudit(scope,{counts:baseline.map(({schema,table,count})=>({schema,table,count})),migrationsMatch:true,roleExists,unsafeLogging});
   state.baseline=baseline;state.schemaHash=schemaFingerprint(port);persist();record('audit','PASS',{tables:97,existingRowsPreserved:true,loggingSafe:true});
  },
  backup:async()=>{state.backup=await createMainBackup(scope,nativeBackupIO(scope,window));persist();record('backup','PASS',state.backup);},
  role:async()=>{
   if(!state.backup)throw Error('MAIN_BACKUP_REQUIRED');collectMainIdentity(scope,port);password=randomBytes(32).toString('hex');secret=randomBytes(32).toString('hex');cookies=Array.from({length:3},()=>randomBytes(32).toString('hex'));
   const role=sqlIdentifier(scope.runtimeRole.name);state.roleIntent=true;persist();
   const oid=port.query<string>(`CREATE ROLE ${role} LOGIN PASSWORD ${sqlLiteral(password)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 12 VALID UNTIL ${sqlLiteral(window.deadline)}; ALTER ROLE ${role} SET statement_timeout='15s'; ALTER ROLE ${role} SET lock_timeout='1500ms'; ALTER ROLE ${role} SET idle_in_transaction_session_timeout='30s'; ALTER ROLE ${role} SET search_path='pg_catalog,public'; ALTER ROLE ${role} SET default_transaction_read_only=on; ${grantStatements(scope,scope.runtimeRole.name)} SELECT to_json(oid::text) FROM pg_roles WHERE rolname=${sqlLiteral(scope.runtimeRole.name)}`,true);
   state.roleOid=oid;persist();const privileges=runtimePrivilegeEvidence(scope,port,oid);record('role','PASS',{...privileges,publicTemp:port.query<boolean>(`SELECT to_json(has_database_privilege(${sqlLiteral(scope.runtimeRole.name)},'worklingo','TEMP'))`)});
   url='postgresql://'+scope.runtimeRole.name+':'+password+'@127.0.0.1:55432/worklingo?schema=public&connection_limit=3';env=mainChildEnvironment(scope,url,'main-'+scope.environment.runId,secret);
  },
  'schema-audit':async()=>{
   await child(process.execPath,[req.resolve('prisma/build/index.js'),'migrate','diff','--config','prisma.beginner-main.config.ts','--from-schema-datasource','prisma/schema.prisma','--to-schema-datamodel','prisma/schema.prisma','--exit-code'],api,'schema-diff');verifyUnsupportedSchema(scope,port);
   port.query(`ALTER ROLE ${sqlIdentifier(scope.runtimeRole.name)} SET default_transaction_read_only=off`,true);record('schema-audit','PASS',{prismaDiff:0,discrepantMigrationChecks:'CATALOG_MATCH',checksumCause:'UNKNOWN_NO_REPAIR'});
  },
  fixtures:async()=>{
   const baseline=collectTableDigests(scope,port);if(hashBeginnerRecord(baseline)!==hashBeginnerRecord(state.baseline))throw Error('MAIN_BASELINE_CHANGED');
   const programId=randomUUID(),ids=Array.from({length:3},()=>randomUUID()),sessionIds=Array.from({length:3},()=>randomUUID());
   await store.change(l=>{l.rows.push({model:'LearningProgram',keys:{id:programId}},...ids.map(id=>({model:'User',keys:{id}})),...sessionIds.map(id=>({model:'UserSession',keys:{id}})));});
   let sql=`INSERT INTO public."LearningProgram" (id,slug,name,description,"learningGoal","proficiencyLabel","iconKey","availabilityStatus","displayOrder","updatedAt") VALUES (${sqlLiteral(programId)}::uuid,'beginner','Synthetic fixture','FIXTURE_ONLY','Software verification','Pre-A1','book','DISABLED',900003,CURRENT_TIMESTAMP); `;
   for(let i=0;i<3;i++){const id=ids[i]!,hash=createHmac('sha256',secret).update(cookies[i]!).digest('hex');sql+=`INSERT INTO public."User" (id,email,"displayName","passwordHash",role,status,"updatedAt") VALUES (${sqlLiteral(id)}::uuid,${sqlLiteral('fixture-'+scope.environment.runId+'-'+i+'@example.invalid')},'Synthetic fixture','LOGIN_DISABLED',${sqlLiteral(i===2?'LEARNER':'CONTENT_ADMIN')},'ACTIVE',CURRENT_TIMESTAMP); INSERT INTO public."UserSession" (id,"userId","tokenHash","expiresAt","updatedAt") VALUES (${sqlLiteral(sessionIds[i]!)}::uuid,${sqlLiteral(id)}::uuid,${sqlLiteral(hash)},${sqlLiteral(window.deadline)}::timestamp,CURRENT_TIMESTAMP); `;}
   port.query(sql,true);
   const manifestFile=path.join(scope.environment.filesystem.approvalRoot,'execution.json'),manifest={scopeHash:beginnerMainBinding.scopeHash,proposalHash:beginnerMainBinding.proposalHash,approvalHash:lfHash(path.join(scope.baseline.worktree,'mandate/reports/2026-10-26-beginner-main-db-human-approval.md')),files};writeFileSync(manifestFile,JSON.stringify(manifest),{flag:'wx'});
   const parsed=mainPermissionInput(scope,window,{programId,roleOid:state.roleOid!,manifestHash:lfHash(manifestFile)});writeFileSync(path.join(parsed.approvalRoot,parsed.approvalId+'.json'),JSON.stringify(parsed),{flag:'wx'});
   Object.assign(process.env,env);const base=new PrismaService({datasourceUrl:url});connections.push(base);const db=guardedFixtureClient(scope,base,store);
   state.fixture=await createMainFixtures(scope,db,store,port,{target:{programId},editorId:ids[0]!,reviewerId:ids[1]!,learnerId:ids[2]!,manifest:null});persist();record('fixtures','PASS',{lessons:await db.lesson.count(),versions:await db.lessonVersion.count(),readiness:'FIXTURE_ONLY',programAccess:'DISABLED'});
  },
  build:async()=>{
   const mirror=sourceMirror(scope),webReq=createRequire(path.join(scope.baseline.worktree,'apps/web/package.json'));
   await child(process.execPath,[webReq.resolve('next/dist/bin/next'),'build','--webpack'],path.join(mirror,'apps/web'),'web-build',{...env,NODE_ENV:'production',NODE_PATH:path.join(scope.baseline.worktree,'apps/web/node_modules'),NEXT_TELEMETRY_DISABLED:'1'});record('build','PASS',{mirror,sourceOnly:true});
  },
  servers:async()=>{
   const webReq=createRequire(path.join(scope.baseline.worktree,'apps/web/package.json'));
   const apiProcess=trackedSpawn(process.execPath,['--require',req.resolve('tsx/cjs'),'test/beginner-main/server.ts'],api,'api-server',{...env,WORKLINGO_BEGINNER_MAIN_COOKIES:JSON.stringify(cookies)});
   await waitHttp('http://127.0.0.1:47771/api/v1/admin/beginner',{Cookie:'worklingo_session='+cookies[0]},apiProcess);
   const web=trackedSpawn(process.execPath,[webReq.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','47772'],path.join(root,'build-mirror/apps/web'),'web-server',{...env,NODE_ENV:'production',NODE_PATH:path.join(scope.baseline.worktree,'apps/web/node_modules'),NEXT_TELEMETRY_DISABLED:'1'});await waitHttp('http://127.0.0.1:47772/admin/programs/beginner',{Cookie:'worklingo_session='+cookies[0]},web);record('servers','PASS',{apiPid:apiProcess.child.pid,webPid:web.child.pid});
  },
  auth:async()=>{for(const [i,status]of [[0,200],[1,200],[2,403],[-1,401]] as const){const res=await fetch('http://127.0.0.1:47771/api/v1/admin/beginner',{headers:i<0?{}:{Cookie:'worklingo_session='+cookies[i]},signal:AbortSignal.timeout(5000)});if(res.status!==status)throw Error('MAIN_AUTH_STATUS');}record('auth','PASS',{realGuards:true,admin:200,learner:403,anonymous:401});},
  integration:async()=>{await child(process.execPath,[req.resolve('vitest/vitest.mjs'),'run','--config','vitest.beginner.integration.config.ts'],api,'integration');record('integration','PASS',{skipsAllowed:false});},
  e2e:async()=>{
   const webReq=createRequire(path.join(scope.baseline.worktree,'apps/web/package.json')),auth=JSON.stringify({cookies:[{name:'worklingo_session',value:cookies[0],domain:'127.0.0.1',path:'/',expires:Math.floor(Date.parse(window.deadline)/1000),httpOnly:true,secure:false,sameSite:'Lax'}],origins:[]});
   await child(process.execPath,[webReq.resolve('@playwright/test/cli'),'test','--config','playwright.beginner-admin.config.ts'],path.join(scope.baseline.worktree,'apps/web'),'e2e',{...env,WORKLINGO_BEGINNER_MAIN_AUTH:auth,WORKLINGO_BEGINNER_MAIN_HISTORY_LESSON:state.fixture!.historicalLessonId!,WORKLINGO_BEGINNER_MAIN_HISTORY_VERSION:state.fixture!.historicalVersionId!});record('e2e','PASS',{projects:2,retries:0});
  },
  verify:async()=>{collectMainIdentity(scope,port);const fixture=state.fixture!;const pin=port.query<{version:string;revision:string}>(`SELECT json_build_object('version',"lessonVersionId",'revision',"curriculumRevisionId") FROM public."LearningSession" WHERE id=${sqlLiteral(fixture.historicalSessionId!)}::uuid`);if(pin.version!==fixture.historicalVersionId||pin.revision!==fixture.historicalCurriculumId||readdirSync(scope.environment.filesystem.registryRoot).some(n=>n.endsWith('.approved')))throw Error('MAIN_HISTORY_OR_RELEASE');verifySourceBoundary(scope);record('verify','PASS',{exactHistoricalPin:true,noApprovedRelease:true,actualLearnerAdmission:'BLOCKED_SCOPE',restore:'NOT_TESTED'});},
  cleanup,
 };
 try{await executeMainPhases(handlers,window);}catch(error){record('execute',error instanceof MainRunFailure?error.status:'BLOCKED',{phase:error instanceof MainRunFailure?error.phase:null,error:error instanceof Error?error.message:'MAIN_UNKNOWN',cleanupError:error instanceof MainRunFailure&&error.cleanupError?String(error.cleanupError):null,cleanupReceipt:receipts.some(r=>r.phase==='cleanup'&&r.status==='PASS')});throw error;}
 return record('execute','PASS',{backup:'ARCHIVE_READABLE',restore:'NOT_TESTED',cleanup:true});
}
export const mainPhases=['prepare-paths','start-existing','audit','backup','role','schema-audit','fixtures','build','servers','auth','integration','e2e','verify','cleanup'] as const;
export type MainPhaseHandlers=Record<typeof mainPhases[number],()=>Promise<void>>;
export class MainRunFailure extends Error{
 constructor(readonly phase:typeof mainPhases[number],readonly status:'FAIL'|'BLOCKED',readonly failure:unknown,readonly cleanupError?:unknown){super(failure instanceof Error?failure.message:'MAIN_UNKNOWN',{cause:failure});}
}
export async function executeMainPhases(handlers:MainPhaseHandlers,window:RunWindow,now:()=>number=Date.now):Promise<void>{
 if(mainPhases.some(p=>typeof handlers[p]!=='function'))throw Error('MAIN_PHASE_MISSING');
 verifyWindow(window,'test',now());let failure:MainRunFailure|undefined,phase:typeof mainPhases[number]='prepare-paths',executing=false;
 try{for(const next of mainPhases){if(next==='cleanup')break;phase=next;executing=false;verifyWindow(window,'test',now());executing=true;await handlers[next]();}}catch(error){failure=new MainRunFailure(phase,executing&&['build','auth','integration','e2e','verify'].includes(phase)?'FAIL':'BLOCKED',error);}
 try{await handlers.cleanup();}catch(error){if(failure)throw new MainRunFailure(failure.phase,failure.status,failure.failure,error);throw new MainRunFailure('cleanup','BLOCKED',error);}
 if(failure)throw failure;
}
if(require.main===module){
 const argv=process.argv.slice(2);
 if(argv.length!==4||argv[0]!=='--scope'||argv[2]!=='--action'||!argv[1]||!argv[3]){console.error('MAIN_EXACT_ARGV_REQUIRED');process.exitCode=1;}
 else void runMainAction(argv[1],argv[3] as MainAction).catch(error=>{console.error(error instanceof Error?error.message:'MAIN_FAILED');process.exitCode=1;});
}
