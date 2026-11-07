import {Socket} from 'node:net';
import {spawnSync} from 'node:child_process';
import type {Prisma} from '@prisma/client';
import { createHash } from 'node:crypto';
import { accessSync,constants,lstatSync,readFileSync,realpathSync } from 'node:fs';
import path from 'node:path';
import { tmpdir,platform } from 'node:os';
import { beginnerPermissionSchema,beginnerMainBinding,type BeginnerPermission } from '@worklingo/contracts';
import { readProgramImportPermission, validateProgramImportPermission, verifyProgramImportTarget } from './beginner-program-permission.js';

export const controlledMainWorktree=path.resolve('C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo');
export const controlledMainScopeFile=path.join(controlledMainWorktree,'mandate/reports/2026-10-26-beginner-main-db-scope.json');
export interface MainAuthorityScope {
 environment:{filesystem:{runtimeRoot:string;runRoot:string;storageRoot:string;registryRoot:string;approvalRoot:string}};
 baseline:{worktree:string;head:string;sourceFiles:Array<{path:string;sha256:string|null}>};
 frozenArtifacts:Array<{path:string;sha256:string}>;
 sourceAllowlist:{modify:string[];create:string[]};
 governance:{captureDocuments:string[];futureExecutionDocuments:string[];ignoredEvidenceRoot:string};
}
function regularMainFile(file:string):void{const s=lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||path.normalize(realpathSync(file))!==path.normalize(file))throw Error('BEGINNER_MAIN_AUTHORITY');}
function textHash(text:string):string{return createHash('sha256').update(text.replace(/\r\n/gu,'\n')).digest('hex');}
/** A one-run trusted-operator authority; never claimed to be an OS principal boundary. */
export function readControlledMainScope():MainAuthorityScope {
 regularMainFile(controlledMainScopeFile);const text=readFileSync(controlledMainScopeFile,'utf8');
 if(textHash(text)!==beginnerMainBinding.scopeHash)throw Error('BEGINNER_MAIN_AUTHORITY');
 const scope=JSON.parse(text) as MainAuthorityScope;
 if(path.normalize(scope.baseline.worktree)!==controlledMainWorktree)throw Error('BEGINNER_MAIN_AUTHORITY');
 const item=scope.governance.captureDocuments.find(f=>f.startsWith('mandate/items/'+beginnerMainBinding.mandateId+'-'));
 if(!item)throw Error('BEGINNER_MAIN_AUTHORITY');
 const file=path.join(controlledMainWorktree,item);regularMainFile(file);
 const match=readFileSync(file,'utf8').replace(/\r\n/gu,'\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/u);
 const header=match?.[1],body=match?.[2];if(header===undefined||body===undefined)throw Error('BEGINNER_MAIN_AUTHORITY');
 const meta=JSON.parse(header) as Record<string,unknown>;
 const approval=meta.approval as {proposal_hash?:string;reference?:string;actor?:string}|null;
 const fields=['title','type','owner','priority','confidence','effort','impact','problem','value','scope','dedupe_key','evidence','acceptance','risk','backlog_reference','plan_reference','sprint_reference'];
 const proposal={...Object.fromEntries(fields.map(k=>[k,meta[k]])),body:body.trim()};
 if(hashBeginnerRecord(proposal)!==beginnerMainBinding.proposalHash||approval?.proposal_hash!==beginnerMainBinding.proposalHash||!['approved','implementing','verified'].includes(String(meta.status))||approval.actor!=='WorkLingo product owner (human user)'||approval.reference!=='mandate/reports/2026-10-26-beginner-main-db-human-approval.md')throw Error('BEGINNER_MAIN_AUTHORITY');
 regularMainFile(path.join(controlledMainWorktree,approval.reference));
 return scope;
}
function verifyMainExecutionFiles(p:Extract<BeginnerPermission,{schemaVersion:2}>):void{
 const scope=readControlledMainScope(),manifestPath=path.join(p.approvalRoot,'execution.json');
 if(path.normalize(p.execution.manifestPath)!==path.normalize(manifestPath))throw Error('BEGINNER_MAIN_AUTHORITY');
 regularMainFile(manifestPath);const text=readFileSync(manifestPath,'utf8');
 if(textHash(text)!==p.execution.manifestHash)throw Error('BEGINNER_MAIN_AUTHORITY');
 const manifest=JSON.parse(text) as {scopeHash:string;proposalHash:string;approvalHash:string;files:Array<{path:string;sha256:string|null}>};
 if(manifest.scopeHash!==beginnerMainBinding.scopeHash||manifest.proposalHash!==beginnerMainBinding.proposalHash||manifest.approvalHash!==textHash(readFileSync(path.join(controlledMainWorktree,'mandate/reports/2026-10-26-beginner-main-db-human-approval.md'),'utf8')))throw Error('BEGINNER_MAIN_AUTHORITY');
 const paths=new Set(scope.baseline.sourceFiles.map(f=>f.path));
 if(manifest.files.length!==paths.size||new Set(manifest.files.map(f=>f.path)).size!==paths.size||manifest.files.some(f=>!paths.has(f.path)))throw Error('BEGINNER_MAIN_AUTHORITY');
 for(const f of manifest.files){const full=path.resolve(controlledMainWorktree,f.path);if(!inside(controlledMainWorktree,full))throw Error('BEGINNER_MAIN_AUTHORITY');if(f.sha256===null){try{lstatSync(full);throw Error('BEGINNER_MAIN_AUTHORITY');}catch(e){if(!(e&&typeof e==='object'&&'code'in e&&e.code==='ENOENT'))throw e;}}else if(createHash('sha256').update(readFileSync(full)).digest('hex')!==f.sha256)throw Error('BEGINNER_MAIN_AUTHORITY');}
 for(const f of scope.frozenArtifacts)if(textHash(readFileSync(path.join(controlledMainWorktree,f.path),'utf8'))!==f.sha256)throw Error('BEGINNER_MAIN_AUTHORITY');
}

function canonical(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical((value as Record<string,unknown>)[k])]));
 return value;
}
export function hashBeginnerRecord(value:unknown):string{return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');}
export function validateBeginnerPermission(input:unknown,now=Date.now()):BeginnerPermission {
 if(input&&typeof input==='object'&&'schemaVersion'in input&&input.schemaVersion===3)return validateProgramImportPermission(input,now);
 const p=beginnerPermissionSchema.safeParse(input);
 if(!p.success)throw new Error('BEGINNER_PERMISSION_REQUIRED');
 const {recordHash,...record}=p.data;
 if(hashBeginnerRecord(record)!==recordHash)throw new Error('BEGINNER_PERMISSION_HASH_MISMATCH');
 if(Date.parse(record.expiresAt)<=now)throw new Error('BEGINNER_PERMISSION_EXPIRED');
 if(record.schemaVersion===2){
  const issued=Date.parse(record.issuedAt),expires=Date.parse(record.expiresAt);
  if(issued>now+5000||expires-issued>4*60*60*1000||expires<=issued)throw new Error('BEGINNER_PERMISSION_EXPIRED');
  return p.data;
 }
 if(record.database.name!=='worklingo_beginner_r12a_'+record.runId||record.database.role!=='wl_beginner_'+record.runId)throw new Error('BEGINNER_ENVIRONMENT_MISMATCH');
 return p.data;
}
function inside(parent:string,child:string):boolean {const r=path.relative(parent,child);return r!==''&&!r.startsWith('..')&&!path.isAbsolute(r);}
function checkedRealPath(p:string):string {
 if(!path.isAbsolute(p))throw new Error('BEGINNER_UNSAFE_ROOT');
 const real=realpathSync(p);if(path.normalize(real)!==path.normalize(p))throw new Error('BEGINNER_UNSAFE_ROOT');
 for(let current=path.resolve(p);;current=path.dirname(current)){
  if(lstatSync(current).isSymbolicLink())throw new Error('BEGINNER_UNSAFE_ROOT');
  if(path.dirname(current)===current)break;
 }return real;
}
// No caller-controlled script text or inherited secrets. AccessCheck evaluates
// the current token, including deny-only groups and ownership/ACL rights.
const windowsAccessScript=[
 "$ErrorActionPreference='Stop'",
 "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WLFileAccess { [StructLayout(LayoutKind.Sequential)] public struct Mapping { public uint Read,Write,Execute,All; } [DllImport(\"advapi32.dll\",SetLastError=true)] static extern bool GetFileSecurity(string p,uint i,byte[] b,uint n,out uint size); [DllImport(\"advapi32.dll\",SetLastError=true)] static extern bool OpenProcessToken(IntPtr p,uint a,out IntPtr t); [DllImport(\"advapi32.dll\",SetLastError=true)] static extern bool DuplicateToken(IntPtr t,int l,out IntPtr d); [DllImport(\"advapi32.dll\",SetLastError=true)] static extern bool AccessCheck(byte[] s,IntPtr t,uint a,ref Mapping m,IntPtr p,ref uint n,out uint g,out bool ok); [DllImport(\"kernel32.dll\")] static extern IntPtr GetCurrentProcess(); [DllImport(\"kernel32.dll\")] static extern bool CloseHandle(IntPtr h); [DllImport(\"advapi32.dll\",SetLastError=true)] static extern bool GetTokenInformation(IntPtr t,int c,out uint b,uint n,out uint r); public static bool Elevated() { IntPtr t=IntPtr.Zero; try { uint e,n; if(!OpenProcessToken(GetCurrentProcess(),8,out t)||!GetTokenInformation(t,20,out e,4,out n))throw new Exception(\"elevation unavailable\"); return e!=0; } finally { if(t!=IntPtr.Zero)CloseHandle(t); } } public static uint Check(string p) { uint n; GetFileSecurity(p,7,null,0,out n); if(n==0)throw new Exception(\"security descriptor unavailable\"); byte[] s=new byte[n]; if(!GetFileSecurity(p,7,s,n,out n))throw new Exception(\"security descriptor denied\"); IntPtr t=IntPtr.Zero,d=IntPtr.Zero,b=IntPtr.Zero; try { if(!OpenProcessToken(GetCurrentProcess(),10,out t)||!DuplicateToken(t,2,out d))throw new Exception(\"token unavailable\"); Mapping m=new Mapping { Read=0x120089,Write=0x120116,Execute=0x1200a0,All=0x1f01ff }; uint len=4096,granted; bool ok; b=Marshal.AllocHGlobal((int)len); if(!AccessCheck(s,d,0x02000000,ref m,b,ref len,out granted,out ok)||!ok)throw new Exception(\"access proof unavailable\"); return granted; } finally { if(b!=IntPtr.Zero)Marshal.FreeHGlobal(b); if(d!=IntPtr.Zero)CloseHandle(d); if(t!=IntPtr.Zero)CloseHandle(t); } } }'",
 "$rights=[WLFileAccess]::Check($env:WORKLINGO_APPROVAL_PROBE_PATH)",
 "$safe=$true;$parent=[IO.Directory]::GetParent($env:WORKLINGO_APPROVAL_PROBE_PATH)",
 "while($parent){if(([WLFileAccess]::Check($parent.FullName) -band 0xD0140)-ne 0){$safe=$false};$parent=$parent.Parent}",
 "@{readable=(($rights -band 1)-ne 0);writable=(($rights -band 0x10156)-ne 0);canChangePermissions=(($rights -band 0xC0000)-ne 0);elevated=[WLFileAccess]::Elevated();ancestorProtected=$safe}|ConvertTo-Json -Compress"
].join('\n');
export function assertReadonlyApprovalPathSync(root:string):void{
 if(platform()==='win32'){
  const systemRoot=process.env.SystemRoot??process.env.WINDIR;
  if(!systemRoot)throw new Error('BEGINNER_APPROVAL_ROOT_WRITABLE');
  const proof=spawnSync(path.join(systemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(windowsAccessScript,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:65536,env:{SystemRoot:systemRoot,WINDIR:systemRoot,WORKLINGO_APPROVAL_PROBE_PATH:root}});
  let result:unknown;try{if(proof.status!==0||proof.error)throw Error();result=JSON.parse(proof.stdout);}catch{throw new Error('BEGINNER_APPROVAL_ROOT_WRITABLE');}
  if(!result||typeof result!=='object'||!('readable'in result)||result.readable!==true||!('writable'in result)||result.writable!==false||!('canChangePermissions'in result)||result.canChangePermissions!==false||!('elevated'in result)||result.elevated!==false||!('ancestorProtected'in result)||result.ancestorProtected!==true)throw new Error('BEGINNER_APPROVAL_ROOT_WRITABLE');
 }else{
  try{accessSync(root,constants.W_OK);}catch(error){if(error&&typeof error==='object'&&'code'in error&&['EACCES','EPERM','EROFS'].includes(String(error.code)))return;throw new Error('BEGINNER_APPROVAL_ROOT_WRITABLE');}
  throw new Error('BEGINNER_APPROVAL_ROOT_WRITABLE');
 }
}
export function preflightBeginnerEnvironment(input:unknown,databaseUrl:string):BeginnerPermission {
 const p=validateBeginnerPermission(input);let url:URL;
 if(p.schemaVersion===3)throw new Error('BEGINNER_IMPORT_PREFLIGHT_REQUIRED');
 if((p.schemaVersion===2&&(process.env.NODE_ENV!=='test'||process.env.WORKLINGO_BEGINNER_MAIN_TEST!=='1'||process.env.WORKLINGO_BEGINNER_ISOLATED_TEST==='1'))||(p.schemaVersion===1&&process.env.WORKLINGO_BEGINNER_MAIN_TEST==='1'))throw new Error('BEGINNER_RUNTIME_MODE_MISMATCH');
 try{url=new URL(databaseUrl);}catch{throw new Error('BEGINNER_ENVIRONMENT_MISMATCH');}
 const parameters=[...url.searchParams];
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.hash||url.hostname.replace(/^\[|\]$/gu,'')!==p.database.host||Number(url.port||5432)!==p.database.port||decodeURIComponent(url.username)!==p.database.role||decodeURIComponent(url.pathname.slice(1))!==p.database.name||new Set(parameters.map(([k])=>k)).size!==parameters.length||parameters.some(([k,v])=>!(k==='schema'&&v==='public')&&!(p.schemaVersion===2&&k==='connection_limit'&&v==='3')))throw new Error('BEGINNER_ENVIRONMENT_MISMATCH');
 const temp=checkedRealPath(p.ownedTempRoot),run=checkedRealPath(path.join(temp,p.runId));
 if(!inside(realpathSync(tmpdir()),temp))throw new Error('BEGINNER_UNSAFE_ROOT');
 for(const root of [p.storageRoot,p.registryRoot])if(!inside(run,checkedRealPath(root)))throw new Error('BEGINNER_UNSAFE_ROOT');
 const approval=checkedRealPath(p.approvalRoot);
 if(p.schemaVersion===1){
  if(approval===temp||inside(temp,approval)||inside(approval,temp))throw new Error('BEGINNER_UNSAFE_APPROVAL_ROOT');
  assertReadonlyApprovalPathSync(approval);
 }else{
  const f=readControlledMainScope().environment.filesystem;
  if(path.normalize(approval)!==path.normalize(f.approvalRoot))throw Error('BEGINNER_UNSAFE_APPROVAL_ROOT');
  if([[temp,f.runtimeRoot],[run,f.runRoot],[p.storageRoot,f.storageRoot],[p.registryRoot,f.registryRoot]].some(([a,b])=>path.normalize(a!)!==path.normalize(b!)))throw Error('BEGINNER_UNSAFE_ROOT');
  verifyMainExecutionFiles(p);
 }
 const marker=JSON.parse(readFileSync(path.join(run,'run.json'),'utf8')) as {runId?:string;environmentId?:string;startedAt?:string;deadline?:string};
 if(marker.runId!==p.runId||marker.environmentId!==p.environmentId)throw new Error('BEGINNER_RUN_IDENTITY_MISMATCH');
 if(p.schemaVersion===2&&(marker.startedAt!==p.issuedAt||marker.deadline!==p.expiresAt))throw Error('BEGINNER_RUN_IDENTITY_MISMATCH');
 return p;
}
/** Operator-owned read-only records only. No endpoint writes this store. */
export function readApprovedBeginnerPermissionSync():BeginnerPermission|null{
 const programImport=readProgramImportPermission();if(programImport)return programImport;
 const root=process.env.WORKLINGO_BEGINNER_APPROVAL_ROOT,id=process.env.WORKLINGO_BEGINNER_PERMISSION_ID;
 if(!root||!id)return null;
 if(!/^[a-zA-Z0-9_-]{1,100}$/u.test(id))throw new Error('BEGINNER_PERMISSION_REQUIRED');
 const real=checkedRealPath(root);const main=process.env.NODE_ENV==='test'&&process.env.WORKLINGO_BEGINNER_MAIN_TEST==='1'&&process.env.WORKLINGO_BEGINNER_ISOLATED_TEST!=='1';
 if(!main)assertReadonlyApprovalPathSync(real);
 const file=path.join(real,id+'.json');if(lstatSync(file).isSymbolicLink()||!lstatSync(file).isFile())throw new Error('BEGINNER_PERMISSION_REQUIRED');
 if(!main)assertReadonlyApprovalPathSync(file);else regularMainFile(file);
 const p=validateBeginnerPermission(JSON.parse(readFileSync(file,'utf8')));
 if((p.schemaVersion===2)!==main)throw Error('BEGINNER_RUNTIME_MODE_MISMATCH');
 if(p.schemaVersion===2)verifyMainExecutionFiles(p);
 if(p.approvalId!==id||checkedRealPath(p.approvalRoot)!==real)throw new Error('BEGINNER_PERMISSION_REQUIRED');
 return p;
}

export async function readApprovedBeginnerPermission():Promise<BeginnerPermission|null>{return readApprovedBeginnerPermissionSync();}

/** No connection is opened here. The supplied transaction must already be authorized. */
export async function verifyNoForeignBeginnerClients(tx:Prisma.TransactionClient,permission:BeginnerPermission):Promise<void>{
 if(permission.schemaVersion!==2)return;
 const application='wl-main-'+permission.runId;
 // Other-role details may be NULL for this limited role. NULL never proves a client is safe.
 const rows=await tx.$queryRaw<Array<{count:number}>>`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND usename IS NOT NULL AND usename<>${permission.database.role} AND coalesce(application_name,'')<>${application}`;
 if(rows[0]?.count!==0)throw Error('BEGINNER_FOREIGN_CLIENT');
}
export async function verifyBeginnerDatabaseIdentity(tx:Prisma.TransactionClient,permission:BeginnerPermission):Promise<void>{
 if(permission.schemaVersion===3){await verifyProgramImportTarget(tx,permission);return;}
 if(process.env.NODE_ENV!=='test'||(permission.schemaVersion===1?process.env.WORKLINGO_BEGINNER_ISOLATED_TEST!=='1':process.env.WORKLINGO_BEGINNER_MAIN_TEST!=='1'||process.env.WORKLINGO_BEGINNER_ISOLATED_TEST==='1'))throw new Error('BEGINNER_ISOLATED_TEST_REQUIRED');
 const url=process.env.TEST_DATABASE_URL;
 if(!url||process.env.DATABASE_URL!==url)throw new Error('BEGINNER_ENVIRONMENT_MISMATCH');
 preflightBeginnerEnvironment(permission,url);
 if(path.normalize(process.env.WORKLINGO_DATA_DIR??'')!==path.normalize(permission.storageRoot))throw new Error('BEGINNER_STORAGE_MISMATCH');
 if(permission.schemaVersion===2){
  const rows=await tx.$queryRaw<Array<{database:string;databaseOid:string;role:string;roleOid:string;systemIdentifier:string;clusterName:string;superuser:boolean;createDb:boolean;createRole:boolean;replication:boolean;bypassRls:boolean}>>`SELECT current_database() AS "database",(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS "databaseOid",current_user AS "role",r.oid::text AS "roleOid",(SELECT system_identifier::text FROM pg_control_system()) AS "systemIdentifier",current_setting('cluster_name') AS "clusterName",r.rolsuper AS "superuser",r.rolcreatedb AS "createDb",r.rolcreaterole AS "createRole",r.rolreplication AS "replication",r.rolbypassrls AS "bypassRls" FROM pg_roles r WHERE r.rolname=current_user`;
  const actual=rows[0],expected=permission.database;
  if(!actual||actual.database!==expected.name||actual.databaseOid!==expected.databaseOid||actual.role!==expected.role||actual.roleOid!==expected.roleOid||actual.systemIdentifier!==expected.serverIdentity||actual.clusterName!==expected.clusterName||actual.superuser||actual.createDb||actual.createRole||actual.replication||actual.bypassRls)throw Error('BEGINNER_DATABASE_IDENTITY_MISMATCH');
  await verifyNoForeignBeginnerClients(tx,permission);
  const program=await tx.learningProgram.findUnique({where:{id:permission.programId},select:{slug:true,availabilityStatus:true}});
  if(program?.slug!=='beginner'||program.availabilityStatus!=='DISABLED')throw Error('BEGINNER_WRONG_PROGRAM');return;
 }
 const rows=await tx.$queryRaw<Array<{database:string;role:string;serverIdentity:string;superuser:boolean;createDb:boolean;createRole:boolean}>>`SELECT current_database() AS "database",current_user AS "role",current_setting('cluster_name') AS "serverIdentity",r.rolsuper AS "superuser",r.rolcreatedb AS "createDb",r.rolcreaterole AS "createRole" FROM pg_roles r WHERE r.rolname=current_user`;
 const actual=rows[0];
 if(!actual||actual.database!==permission.database.name||actual.role!==permission.database.role||actual.serverIdentity!==permission.database.serverIdentity||actual.superuser||actual.createDb||actual.createRole)throw new Error('BEGINNER_DATABASE_IDENTITY_MISMATCH');
}

/** Explicit test harness guard. No application runtime or provider is started. */
export function installBeginnerNetworkGuard():()=>void{
 const originalFetch=globalThis.fetch,originalConnect=Socket.prototype.connect;
 const loopback=(host:string)=>['127.0.0.1','::1','[::1]','localhost'].includes(host);
 globalThis.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input:input.url);if(!loopback(url.hostname))throw Error('BEGINNER_EXTERNAL_EGRESS_DENIED');return originalFetch(input,init);};
 Socket.prototype.connect=function(this:Socket,...args:unknown[]){
  const values=Array.isArray(args[0])?args[0] as unknown[]:args;
  const options=values[0];let host:string;
  if(options&&typeof options==='object'&&'port'in options)host=String('host'in options?options.host:'127.0.0.1');
  else if(typeof options==='number')host=typeof values[1]==='string'?values[1]:'127.0.0.1';
  else throw Error('BEGINNER_EXTERNAL_EGRESS_DENIED');
  if(!loopback(host))throw Error('BEGINNER_EXTERNAL_EGRESS_DENIED');
  return originalConnect.apply(this,args as Parameters<typeof originalConnect>);
 } as typeof originalConnect;
 return ()=>{globalThis.fetch=originalFetch;Socket.prototype.connect=originalConnect;};
}
