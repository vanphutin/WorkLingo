import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {z} from 'zod';

export const PROPOSAL_HASH='0293feefb1447c48e921e7c801d628db3b2352079d23ac42f74c6628c28179f2';
export const MANDATE_ID='MND-20261025-002';
const ENVIRONMENT_HASH='29094d2c951a49f8b33d639b3aa97738c3c374895d80651beb81f454e92f4290';
const ALLOWLIST_HASH='5b8bad074edf290429bd8acf6c18b40833c6422806d88f91650089583106b5c7';
const BASELINE_HASH='98b81779ce35fe4965aed9ade158e038286caaab7c228b17a6b70f464ef86562';
const PLAN_HASH='1f0fc2a7f7b70687e9013f40c8679ef8965b3c6fe750407911aa283cafda1997';
const REVIEW_HASH='56347e1578f713f41b16c96935a7d868e7d6e969e8a32c4e269be242245e6e54';
// This one-run tool binds the actual grant, not mutable lifecycle timestamps.
const HUMAN_ACTOR='WorkLingo product owner (human user)';
const HUMAN_REFERENCE='mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-human-approval.md';
const HUMAN_APPROVED_AT='2026-10-26T05:28:34.730Z';
const HUMAN_NOTE_HASH='cff196653fd71a5bb5452944bb5ea481543b695fec822070558537b6a0e9273c';
const fileSchema=z.object({path:z.string(),sha256:z.string().nullable()});
const environmentSchema=z.object({
 runId:z.string(),environmentId:z.string(),expectedProgramId:z.string(),
 docker:z.object({context:z.string(),endpoint:z.string(),image:z.string(),container:z.string(),volume:z.string(),labels:z.record(z.string(),z.string())}).passthrough(),
 database:z.object({host:z.string(),port:z.number(),name:z.string(),role:z.string(),serverIdentity:z.string(),ownerRole:z.string(),schema:z.string(),containerPort:z.number()}).passthrough(),
 filesystem:z.object({ownedTempRoot:z.string(),runRoot:z.string(),storageRoot:z.string(),registryRoot:z.string(),runtimeRoot:z.string(),artifactRoot:z.string(),approvalRoot:z.string(),permissionId:z.string()}).passthrough(),
 servers:z.object({apiOrigin:z.string(),webOrigin:z.string()}).passthrough(),
 excludedRoots:z.array(z.string()),requestedRuntimeActions:z.array(z.string()),activationTtlHours:z.number(),
}).passthrough();
const capturedSchema=z.object({
 environment:environmentSchema,allowlist:z.object({modify:z.array(z.string()),create:z.array(z.string())}),
 hashes:z.record(z.string(),z.string()),
 baseline:z.object({head:z.string(),branch:z.string(),worktree:z.string(),sourceFiles:z.array(fileSchema)}).passthrough(),
 frozenArtifacts:z.array(fileSchema),references:z.object({plan:z.string(),scopeReview:z.string()}),
}).passthrough();
export type CapturedScope=z.infer<typeof capturedSchema>;
export function hashRecord(value:unknown):string {
 const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical((v as Record<string,unknown>)[k])])):v;
 return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
function fail(code:string):never{throw new Error(code);}
const normalized=(p:string)=>path.win32.resolve(p).toLowerCase();
function inside(root:string,p:string):boolean {const r=path.win32.relative(normalized(root),normalized(p));return r!==''&&!r.startsWith('..')&&!path.win32.isAbsolute(r);}
export function assertOwnedPath(scope:CapturedScope,p:string):void{
 if(!path.win32.isAbsolute(p)||!(normalized(p)===normalized(scope.environment.filesystem.runRoot)||inside(scope.environment.filesystem.runRoot,p)))fail('BEGINNER_CLEANUP_SCOPE');
 if(scope.environment.excludedRoots.some(root=>normalized(root)===normalized(p)||inside(root,p)||inside(p,root)))fail('BEGINNER_CLEANUP_SCOPE');
}
export function validateIsolatedRunScope(input:unknown):CapturedScope{
 const raw=z.record(z.string(),z.unknown()).parse(input);
 const s=capturedSchema.parse(input);
 if(s.hashes.environment!==ENVIRONMENT_HASH||hashRecord(raw.environment)!==ENVIRONMENT_HASH||s.hashes.allowlist!==ALLOWLIST_HASH||hashRecord(raw.allowlist)!==ALLOWLIST_HASH||s.hashes.sourceBaseline!==BASELINE_HASH||hashRecord(raw.baseline)!==BASELINE_HASH||s.hashes.plan!==PLAN_HASH||s.hashes.scopeReview!==REVIEW_HASH)fail('BEGINNER_SCOPE_HASH_MISMATCH');
 for(const p of [s.environment.filesystem.storageRoot,s.environment.filesystem.registryRoot,s.environment.filesystem.runtimeRoot,s.environment.filesystem.artifactRoot])assertOwnedPath(s,p);
 if(inside(s.environment.filesystem.runRoot,s.environment.filesystem.approvalRoot)||inside(s.environment.filesystem.approvalRoot,s.environment.filesystem.runRoot))fail('BEGINNER_CLEANUP_SCOPE');
 return s;
}
export function readCapturedScope(file:string):CapturedScope{return validateIsolatedRunScope(JSON.parse(readFileSync(file,'utf8')));}
export function validateRuntimeUrl(s:CapturedScope,value:string):void{
 try{
  const url=new URL(value),db=s.environment.database;
  if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!==db.host||Number(url.port)!==db.port||decodeURIComponent(url.username)!==db.role||decodeURIComponent(url.pathname.slice(1))!==db.name||[...url.searchParams].some(([k,v])=>k!=='schema'||v!=='public'))fail('BEGINNER_ENVIRONMENT_MISMATCH');
 }catch{fail('BEGINNER_ENVIRONMENT_MISMATCH');}
}
const databaseEvidenceSchema=z.object({
 database:z.string(),role:z.string(),serverIdentity:z.string(),marker:z.string(),
 superuser:z.literal(false),createDb:z.literal(false),createRole:z.literal(false),replication:z.literal(false),bypassRls:z.literal(false),inherit:z.literal(false),
 owner:z.literal(false),createSchema:z.literal(false),createTemp:z.literal(false),truncate:z.literal(false),memberships:z.literal(0),
});
export type DatabaseEvidence=z.infer<typeof databaseEvidenceSchema>;
export function validateDatabaseEvidence(s:CapturedScope,value:unknown):DatabaseEvidence{
 const p=databaseEvidenceSchema.safeParse(value),db=s.environment.database;
 if(!p.success||p.data.database!==db.name||p.data.role!==db.role||p.data.serverIdentity!==db.serverIdentity||p.data.marker!==s.environment.runId)fail('BEGINNER_DATABASE_IDENTITY_MISMATCH');
 return p.data;
}
export function validateCleanupEvidence(s:CapturedScope,input:unknown):void{
 const p=z.object({containerId:z.string().regex(/^[a-f0-9]{12,64}$/),containerName:z.string(),image:z.string(),volume:z.string(),runId:z.string(),exclusiveMount:z.literal(true),database:z.unknown()}).safeParse(input);
 if(!p.success||p.data.containerName!==s.environment.docker.container||p.data.image!==s.environment.docker.image||p.data.volume!==s.environment.docker.volume||p.data.runId!==s.environment.runId)fail('BEGINNER_CLEANUP_SCOPE');
 validateDatabaseEvidence(s,p.data.database);
}
export function sanitizedChildEnvironment(s:CapturedScope,url:string,secrets:{sessionSecret:string;rateLimitKey:string}):Record<string,string>{
 validateRuntimeUrl(s,url);
 if(secrets.sessionSecret.length<32||secrets.rateLimitKey.length<32)fail('BEGINNER_SECRET_REQUIRED');
 const env:Record<string,string>={
  NODE_ENV:'test',DATABASE_URL:url,TEST_DATABASE_URL:url,WORKLINGO_BEGINNER_ISOLATED_TEST:'1',
  WORKLINGO_BEGINNER_APPROVAL_ROOT:s.environment.filesystem.approvalRoot,WORKLINGO_BEGINNER_PERMISSION_ID:s.environment.filesystem.permissionId,
  WORKLINGO_BEGINNER_ENVIRONMENT_ID:s.environment.environmentId,WORKLINGO_DATA_DIR:s.environment.filesystem.storageRoot,
  WORKLINGO_BEGINNER_API_BASE_URL:s.environment.servers.apiOrigin,WORKLINGO_BEGINNER_WEB_BASE_URL:s.environment.servers.webOrigin,
  WORKLINGO_API_URL:s.environment.servers.apiOrigin,NEXT_PUBLIC_API_BASE_URL:'/api/v1',WORKLINGO_E2E_MODE:'true',
  API_PORT:'47771',WEB_PORT:'47772',SESSION_SECRET:secrets.sessionSecret,RATE_LIMIT_HASH_KEY:secrets.rateLimitKey,
  JOB_WORKER_ENABLED:'false',AI_ROUTING_ENABLED:'false',AI_FALLBACK_ENABLED:'false',
  WORKLINGO_LANGUAGE_EVALUATION_PROVIDER:'fake',WORKLINGO_STT_PROVIDER:'fake',WORKLINGO_TTS_PROVIDER:'fake-tts',
  OPENAI_API_KEY:'',OPENAI_BASE_URL:'',OPENAI_MODEL:'',DISCOVERY_API_KEY:'',MICROSOFT_SPEECH_KEY:'',MICROSOFT_SPEECH_REGION:'',
  NEXT_TELEMETRY_DISABLED:'1',TSX_DISABLE_CACHE:'1',
 };
 for(const key of ['SystemRoot','WINDIR','PATH','Path','TEMP','TMP','USERPROFILE','LOCALAPPDATA'])if(process.env[key])env[key]=process.env[key]!;
 return env;
}
export function assertNoReparseAncestors(p:string):void{
 for(let current=path.resolve(p);;current=path.dirname(current)){
  let stat:ReturnType<typeof lstatSync>|undefined;
  try{stat=lstatSync(current);}catch(error){if(!error||typeof error!=='object'||!('code'in error)||error.code!=='ENOENT')fail('BEGINNER_UNSAFE_ROOT');}
  if(stat){
   if(stat.isSymbolicLink())fail('BEGINNER_UNSAFE_ROOT');
   let real:string;try{real=realpathSync(current);}catch{fail('BEGINNER_UNSAFE_ROOT');}
   if(normalized(real)!==normalized(current))fail('BEGINNER_UNSAFE_ROOT');
  }
  if(path.dirname(current)===current)break;
 }
}
function git(root:string,...args:string[]):string{return execFileSync('git',['-c','safe.directory='+root,...args],{cwd:root,encoding:'utf8',windowsHide:true}).trim();}
export function verifyCapturedAuthority(s:CapturedScope):{approvedAt:string;expiresAt:string;candidateHash:string}{
 const root=s.baseline.worktree,allow=new Set([...s.allowlist.modify,...s.allowlist.create]);
 for(const f of [...s.baseline.sourceFiles,...s.frozenArtifacts]){
  if(allow.has(f.path))continue;
  const actual=existsSync(path.join(root,f.path))?createHash('sha256').update(readFileSync(path.join(root,f.path))).digest('hex'):null;
  if(actual!==f.sha256)fail('BEGINNER_SOURCE_BASELINE_MISMATCH');
 }
 for(const[key,file]of [['plan',s.references.plan],['scopeReview',s.references.scopeReview]] as const)if(createHash('sha256').update(readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n')).digest('hex')!==s.hashes[key])fail('BEGINNER_SCOPE_HASH_MISMATCH');
 const migrations=s.baseline.sourceFiles.filter(f=>f.path.startsWith('apps/api/prisma/migrations/'));
 if(migrations.length!==48||hashRecord(migrations)!==s.hashes.migrations)fail('BEGINNER_MIGRATION_MISMATCH');
 if(git(root,'branch','--show-current')!==s.baseline.branch)fail('BEGINNER_SOURCE_BASELINE_MISMATCH');
 const itemPath='mandate/items/MND-20261025-002-infrastructure-qualify-beginner-r1-2a-on-one-isolated-postgresql-and-desktop-mobile-e.md';
 const text=readFileSync(path.join(root,itemPath),'utf8'),match=text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
 if(!match)fail('BEGINNER_HUMAN_APPROVAL_REQUIRED');
 const item=z.record(z.string(),z.unknown()).parse(JSON.parse(match[1]!));
 const approval=z.object({proposal_hash:z.literal(PROPOSAL_HASH),actor:z.literal(HUMAN_ACTOR),at:z.literal(HUMAN_APPROVED_AT),reference:z.literal(HUMAN_REFERENCE)}).safeParse(item.approval);
 const fields=['title','type','owner','priority','confidence','effort','impact','problem','value','scope','dedupe_key','evidence','acceptance','risk','backlog_reference','plan_reference','sprint_reference'];
 if(!approval.success||!['approved','implementing'].includes(String(item.status))||hashRecord({...Object.fromEntries(fields.map(k=>[k,item[k]])),body:match[2]!.trim()})!==PROPOSAL_HASH||Date.parse(approval.data.at)>Date.now())fail('BEGINNER_HUMAN_APPROVAL_REQUIRED');
 const note=path.join(root,approval.data.reference);
 try{
  const stat=lstatSync(note);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)fail('BEGINNER_HUMAN_APPROVAL_REQUIRED');
  assertNoReparseAncestors(note);
  if(createHash('sha256').update(readFileSync(note,'utf8').replace(/\r\n/g,'\n')).digest('hex')!==HUMAN_NOTE_HASH)fail('BEGINNER_HUMAN_APPROVAL_REQUIRED');
 }catch{fail('BEGINNER_HUMAN_APPROVAL_REQUIRED');}
 const expiresAt=new Date(Date.parse(approval.data.at)+s.environment.activationTtlHours*3600000).toISOString();
 if(Date.parse(expiresAt)<=Date.now())fail('BEGINNER_PERMISSION_EXPIRED');
 const governance=new Set([s.references.plan,s.references.scopeReview,'mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-scope.json',itemPath,'mandate/INDEX.md','mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-human-approval.md','mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-verification.md']);
 const changes=[...git(root,'diff','--name-only',s.baseline.head).split(/\r?\n/),...git(root,'ls-files','--others','--exclude-standard').split(/\r?\n/)].filter(Boolean);
 if(changes.some(p=>!allow.has(p)&&!governance.has(p)))fail('BEGINNER_SOURCE_SCOPE_DRIFT');
 const files=[...allow].sort().map(p=>({path:p,sha256:existsSync(path.join(root,p))?createHash('sha256').update(readFileSync(path.join(root,p))).digest('hex'):null}));
 return {approvedAt:approval.data.at,expiresAt,candidateHash:hashRecord({files,baseline:s.baseline.head})};
}
