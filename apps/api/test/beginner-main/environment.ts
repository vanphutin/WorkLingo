import {createHash} from 'node:crypto';
import {readFileSync,existsSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {beginnerMainBinding,beginnerPermissionSchema} from '@worklingo/contracts';
import {readControlledMainScope,controlledMainScopeFile,hashBeginnerRecord,type MainAuthorityScope} from '../../src/beginner/domain/beginner-environment-preflight.js';

export interface MainScope extends MainAuthorityScope {
 mandateId:string;plan:{path:string;sha256:string};review:{path:string;sha256:string};checksumEvidence:{path:string;sha256:string};
 environment:{runId:string;operatorSid:string;database:{host:string;port:number;name:string;schema:string;expectedOid:string;expectedSystemIdentifier:string;expectedClusterName:string};docker:{context:string;container:string;id:string;image:string;volume:string;destination:string;entrypoint:string[];cmd:string[];observedRunning:boolean};filesystem:{runtimeRoot:string;runRoot:string;storageRoot:string;registryRoot:string;approvalRoot:string;backupBase:string;backupRoot:string;newDirectories:string[];dependencyLink:string;dependencyTarget:string};servers:{api:string;web:string}};
 runtimeRole:{name:string;dmlTablesInitiallyEmpty:string[];insertSelectOnlyTablesInitiallyEmpty:string[];readOnlyProtected:string[];selectColumns:{LearningProgram:string[]};connectionLimit:number};
 dataPreservation:{tableCounts:Array<{schema:string;table:string;count:string}>;limits:{lessons:number;lessonVersions:number;totalCreatedRows:number;storageBytes:number}};
 commands:{runnerActions:Record<string,string>;internalPhases:string[]};
}
export type MainAction='preflight'|'unit'|'execute'|'cleanup-recovery';
export interface MainEvidence {phase:'audit'|'runtime';host:string;port:number;database:string;databaseOid:string;systemIdentifier:string;clusterName:string;role:string;roleOid:string;foreignClients:number;superuser:boolean;createDb:boolean;createRole:boolean;replication:boolean;bypassRls:boolean;owner:boolean;memberships:number;createSchema:boolean;truncate:boolean;protectedDml:boolean;unsafeDefiner:boolean}
export interface PhaseReceipt {phase:string;status:'PASS'|'FAIL'|'BLOCKED';atUtc:string;runId:string;previousHash:string|null;details:unknown;hash:string}
export interface RunWindow {startedAt:string;deadline:string}
export function mainPermissionInput(scope:MainScope,window:RunWindow,ids:{programId:string;roleOid:string;manifestHash:string}){
 const f=scope.environment.filesystem;
 const record={schemaVersion:2,mode:'CONTROLLED_MAIN_DB',approvalId:'main-'+scope.environment.runId,mandateId:'MND-20261024-003',proposalHash:'1170d5b91963b53ca848e87d0fcca85683f7a68746467531b06dcf12f3b13e49',environmentId:'main-'+scope.environment.runId,runId:scope.environment.runId,programId:ids.programId,ownedTempRoot:f.runtimeRoot,storageRoot:f.storageRoot,registryRoot:f.registryRoot,approvalRoot:f.approvalRoot,database:{host:'127.0.0.1',port:55432,name:'worklingo',role:scope.runtimeRole.name,serverIdentity:'7692646346822291490',databaseOid:'16384',roleOid:ids.roleOid,clusterName:''},actions:['read','author','validate','review','publish','export','fixture-audio','cleanup'],issuedAt:window.startedAt,expiresAt:window.deadline,revoked:false,approvedBy:'WorkLingo product owner (human user)',authorizationSource:'mandate/reports/2026-10-26-beginner-main-db-human-approval.md',execution:{mandateId:beginnerMainBinding.mandateId,proposalHash:beginnerMainBinding.proposalHash,scopeHash:beginnerMainBinding.scopeHash,manifestPath:path.join(f.approvalRoot,'execution.json'),manifestHash:ids.manifestHash}};
 return beginnerPermissionSchema.parse({...record,recordHash:hashBeginnerRecord(record)});
}
export interface ContainerProof {Id:string;Image:string;Config:{Entrypoint:string[];Cmd:string[]};HostConfig:{RestartPolicy:{Name:string};PortBindings:Record<string,Array<{HostIp:string;HostPort:string}>>};Mounts:Array<{Name?:string;Destination:string}>;State:{Running:boolean}}
export function verifyContainer(scope:MainScope,c:ContainerProof,otherActiveIds:string[]):void{
 const d=scope.environment.docker;
 if(c.Id!==d.id||c.Image!==d.image||JSON.stringify(c.Config.Entrypoint)!==JSON.stringify(d.entrypoint)||JSON.stringify(c.Config.Cmd)!==JSON.stringify(d.cmd)||c.HostConfig.RestartPolicy.Name!=='no'||c.Mounts.length!==1||c.Mounts[0]?.Name!==d.volume||c.Mounts[0]?.Destination!==d.destination||c.HostConfig.PortBindings['5432/tcp']?.length!==1||c.HostConfig.PortBindings['5432/tcp']?.[0]?.HostPort!=='55432')throw Error('MAIN_CONTAINER_IDENTITY');
 if(otherActiveIds.some(id=>id!==d.id))throw Error('MAIN_VOLUME_ACTIVE');
}
export function verifyAudit(scope:MainScope,a:{counts:MainScope['dataPreservation']['tableCounts'];migrationsMatch:boolean;roleExists:boolean;unsafeLogging:boolean}):void{
 const sorted=(rows:MainScope['dataPreservation']['tableCounts'])=>[...rows].sort((a,b)=>a.table.localeCompare(b.table));
 if(a.roleExists||a.unsafeLogging||!a.migrationsMatch||hashBeginnerRecord(sorted(a.counts))!==hashBeginnerRecord(sorted(scope.dataPreservation.tableCounts)))throw Error('MAIN_AUDIT_BLOCKED');
}
export const evidenceRoot=path.resolve('C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo/.superpowers/sdd/2026-10-25-beginner-r12a-isolated-db-e2e');
export const sha256=(bytes:string|Buffer):string=>createHash('sha256').update(bytes).digest('hex');
export const lfHash=(file:string):string=>sha256(readFileSync(file,'utf8').replace(/\r\n/gu,'\n'));
export function readMainScope(file=controlledMainScopeFile):MainScope{
 if(path.normalize(path.resolve(file))!==path.normalize(controlledMainScopeFile))throw Error('MAIN_SCOPE_PATH');
 return readControlledMainScope() as MainScope;
}
export function verifyMainPreflight(scope:MainScope,input:unknown):void{
 if(!input||typeof input!=='object')throw Error('MAIN_IDENTITY');const e=input as MainEvidence,d=scope.environment.database;
 if(!['audit','runtime'].includes(e.phase)||e.host!==d.host||e.port!==d.port||e.database!==d.name||e.databaseOid!==d.expectedOid||e.systemIdentifier!==d.expectedSystemIdentifier||e.clusterName!==d.expectedClusterName||e.role!==(e.phase==='runtime'?scope.runtimeRole.name:'worklingo')||!/^\d+$/u.test(e.roleOid))throw Error('MAIN_IDENTITY');
 if(e.foreignClients!==0)throw Error('MAIN_FOREIGN_CLIENT');
 if(e.phase==='runtime'&&(e.superuser!==false||e.createDb!==false||e.createRole!==false||e.replication!==false||e.bypassRls!==false||e.owner!==false||e.memberships!==0||e.createSchema!==false||e.truncate!==false||e.protectedDml!==false||e.unsafeDefiner!==false))throw Error('MAIN_PRIVILEGE');
}
export function assertRuntimeSql(sql:string):void{
 const clean=sql.replace(/\/\*[\s\S]*?\*\//gu,' ').replace(/--[^\n]*/gu,' ').trim();
 if(/\b(?:FROM|JOIN)\s+(?:public\.)?"?(?:User|UserSession|LearnerProfile|LearningSession|SessionBlock|ActivityAttempt|MasteryRecord|MasteryEvent|LearnerProgramEnrollment|CurriculumCompletion)"?(?:\s|$|;)/iu.test(clean))throw Error('MAIN_UNSAFE_SQL');
 if(!/^SELECT\b/iu.test(clean)||clean.replace(/;\s*$/u,'').includes(';')||/\b(?:TRUNCATE|DELETE|INSERT|UPDATE|DROP|ALTER|CREATE|COPY|GRANT|REVOKE|DO|CALL)\b/iu.test(clean.replace(/FOR\s+(?:KEY\s+SHARE|NO\s+KEY\s+UPDATE|UPDATE|SHARE)/giu,''))||/\b(?:set_config|pg_read_file|pg_read_binary_file|pg_write_file|dblink|lo_export|lo_import)\s*\(/iu.test(clean))throw Error('MAIN_UNSAFE_SQL');
}
export function verifyCleanupKeys(created:readonly string[],selected:readonly string[],foreign:readonly string[]):void{
 const keys=new Set(created);if(new Set(selected).size!==selected.length||selected.some(k=>!keys.has(k))||foreign.length)throw Error('MAIN_CLEANUP_OWNERSHIP');
}
export function verifyWindow(window:RunWindow,phase:'test'|'cleanup',now=Date.now()):void{
 const start=Date.parse(window.startedAt),end=Date.parse(window.deadline);
 if(!Number.isFinite(start)||end-start!==4*60*60*1000||start>now+5000||now>=end||(phase==='test'&&now>=end-30*60*1000))throw Error('MAIN_WINDOW_EXPIRED');
}
export function checkedRunPath(scope:MainScope,file:string):string{
 const root=path.resolve(scope.environment.filesystem.runRoot),full=path.resolve(file),relative=path.relative(root,full);
 if(relative.startsWith('..')||path.isAbsolute(relative)||full===path.resolve(scope.environment.filesystem.backupRoot))throw Error('MAIN_STORAGE_SCOPE');
 let cursor=full;while(!existsSync(cursor)){const parent=path.dirname(cursor);if(parent===cursor)throw Error('MAIN_STORAGE_SCOPE');cursor=parent;}
 while(true){if(lstatSync(cursor).isSymbolicLink()||path.normalize(realpathSync(cursor))!==path.normalize(cursor))throw Error('MAIN_STORAGE_SCOPE');const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;}
 return full;
}
export function verifySourceBoundary(scope:MainScope):Array<{path:string;sha256:string|null}>{
 const root=scope.baseline.worktree,allowed=new Set([...scope.sourceAllowlist.modify,...scope.sourceAllowlist.create]);
 const records=scope.baseline.sourceFiles.map(f=>{const full=path.resolve(root,f.path),actual=existsSync(full)?sha256(readFileSync(full)):null;if(!allowed.has(f.path)&&actual!==f.sha256)throw Error('MAIN_SOURCE_DRIFT');return {path:f.path,sha256:actual};});
 for(const f of scope.frozenArtifacts)if(lfHash(path.join(root,f.path))!==f.sha256)throw Error('MAIN_FROZEN_DRIFT');
 for(const f of [scope.plan,scope.review,scope.checksumEvidence])if(lfHash(path.join(root,f.path))!==f.sha256)throw Error('MAIN_FROZEN_DRIFT');
 const gitAllowed=new Set([...allowed,...scope.governance.captureDocuments,...scope.governance.futureExecutionDocuments]);
 const changes=execFileSync('git',['-c','safe.directory='+root,'status','--porcelain','--untracked-files=all','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).map(v=>v.slice(3));
 if(changes.some(f=>!gitAllowed.has(f)))throw Error('MAIN_SOURCE_DRIFT');
 return records;
}
export function makePhaseReceipt(scope:MainScope,phase:string,status:PhaseReceipt['status'],details:unknown,previous:PhaseReceipt|null):PhaseReceipt{
 const value={phase,status,atUtc:new Date().toISOString(),runId:scope.environment.runId,previousHash:previous?.hash??null,details};return {...value,hash:hashBeginnerRecord(value)};
}
export function mainChildEnvironment(scope:MainScope,url:string,permissionId:string,sessionSecret:string,authState?:string):Record<string,string>{
 const u=new URL(url);if(u.hostname!=='127.0.0.1'||u.port!=='55432'||decodeURIComponent(u.pathname)!=='/worklingo'||decodeURIComponent(u.username)!==beginnerMainBinding.role||sessionSecret.length<32)throw Error('MAIN_IDENTITY');
 const f=scope.environment.filesystem;
 const env:Record<string,string>={NODE_ENV:'test',DATABASE_URL:url,TEST_DATABASE_URL:url,WORKLINGO_BEGINNER_MAIN_TEST:'1',WORKLINGO_BEGINNER_ISOLATED_TEST:'0',WORKLINGO_BEGINNER_APPROVAL_ROOT:f.approvalRoot,WORKLINGO_BEGINNER_PERMISSION_ID:permissionId,WORKLINGO_BEGINNER_ENVIRONMENT_ID:'main-'+scope.environment.runId,WORKLINGO_DATA_DIR:f.storageRoot,WORKLINGO_API_URL:'http://127.0.0.1:47771',WORKLINGO_BEGINNER_API_BASE_URL:'http://127.0.0.1:47771',WORKLINGO_BEGINNER_WEB_BASE_URL:'http://127.0.0.1:47772',NEXT_PUBLIC_API_BASE_URL:'/api/v1',WORKLINGO_E2E_MODE:'true',API_PORT:'47771',WEB_PORT:'47772',SESSION_SECRET:sessionSecret,RATE_LIMIT_HASH_KEY:sessionSecret,JOB_WORKER_ENABLED:'false',OPENAI_API_KEY:'',DISCOVERY_API_KEY:'',MICROSOFT_SPEECH_KEY:'',WORKLINGO_LANGUAGE_EVALUATION_PROVIDER:'fake',WORKLINGO_STT_PROVIDER:'fake',WORKLINGO_TTS_PROVIDER:'fake-tts',WORKLINGO_BEGINNER_BACKUP_ROOT:f.backupRoot,NODE_OPTIONS:'--require '+JSON.stringify(path.join(scope.baseline.worktree,'apps/api/test/beginner-main/egress-guard.cjs').replaceAll('\\','/'))};
 if(authState)env.WORKLINGO_BEGINNER_MAIN_AUTH=authState;
 for(const k of ['SystemRoot','WINDIR','PATH','Path','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[k])env[k]=process.env[k]!;
 return env;
}
