import {readFileSync} from 'node:fs';
import path from 'node:path';
import type * as NodeFs from 'node:fs';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {validateIsolatedRunScope,validateRuntimeUrl,validateDatabaseEvidence,validateCleanupEvidence,sanitizedChildEnvironment,assertOwnedPath,verifyCapturedAuthority,assertNoReparseAncestors} from './environment.js';

const ports=vi.hoisted(()=>({grant:'none',inspection:'none',target:''}));
vi.mock('node:fs',async original=>{
 const actual=await original<typeof NodeFs>();
 return {...actual,
  readFileSync:(...args:Parameters<typeof NodeFs.readFileSync>)=>{
   const raw=actual.readFileSync(...args);
   if(typeof raw==='string'&&ports.grant==='tampered-note'&&String(args[0]).endsWith('2026-10-25-beginner-r12a-isolated-db-e2e-human-approval.md'))return raw+'\nForged additional authority.\n';
   if(typeof raw!=='string'||!String(args[0]).endsWith('MND-20261025-002-infrastructure-qualify-beginner-r1-2a-on-one-isolated-postgresql-and-desktop-mobile-e.md')||ports.grant==='none')return raw;
   const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)!;
   const item=JSON.parse(match[1]!);
   if(ports.grant==='actor')item.approval.actor='Codex';
   if(ports.grant==='empty-reference')item.approval.reference='';
   if(ports.grant==='unrelated-reference')item.approval.reference='AGENTS.md';
   if(ports.grant==='renewed-at')item.approval.at=new Date(Date.now()+3600000).toISOString();
   if(ports.grant==='revive-expired')item.approval.at=new Date().toISOString();
   return '---\n'+JSON.stringify(item)+'\n---\n'+match[2];
  },
  lstatSync:(...args:Parameters<typeof NodeFs.lstatSync>)=>{
   if(path.resolve(String(args[0]))===ports.target){
    if(ports.inspection==='dangling')return {isSymbolicLink:()=>true};
    if(ports.inspection==='unavailable')throw Object.assign(Error('access denied'),{code:'EACCES'});
   }
   return actual.lstatSync(...args);
  },
 };
});
afterEach(()=>{ports.grant='none';ports.inspection='none';ports.target='';vi.useRealTimers();});

const captured=()=>JSON.parse(readFileSync(path.resolve('../../mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-scope.json'),'utf8'));
const plan=()=>validateIsolatedRunScope(captured());
const validDb={database:'worklingo_beginner_r12a_202610250002',role:'wl_beginner_202610250002',serverIdentity:'wl-beginner-r12a-202610250002',superuser:false,createDb:false,createRole:false,replication:false,bypassRls:false,inherit:false,owner:false,createSchema:false,createTemp:false,truncate:false,memberships:0,marker:'202610250002'};
describe('isolated authority envelope',()=>{
 it('accepts the captured exact environment without changing its preapproval history',()=>{
  const p=plan();expect(p.environment.database.port).toBe(55432);expect(p.allowlist.create).toHaveLength(8);
 });
 it.each(['host','port','name','role','serverIdentity'])('rejects a changed database %s even before any connection',key=>{
  const s=captured();s.environment.database[key]=key==='port'?5432:'production';
  expect(()=>validateIsolatedRunScope(s)).toThrow();
 });
 it('rejects broadened source and cleanup authority',()=>{
  const s=captured();s.allowlist.modify.push('apps/api/src/main.ts');
  expect(()=>validateIsolatedRunScope(s)).toThrow();
 });
 it.each([
  '', 'postgresql://root@127.0.0.1:55432/worklingo',
  'postgresql://wl_beginner_202610250002@localhost:55432/worklingo_beginner_r12a_202610250002',
  'postgresql://wl_beginner_202610250002@127.0.0.1:5432/worklingo_beginner_r12a_202610250002',
  'postgresql://wl_beginner_202610250002@127.0.0.1:55432/worklingo_beginner_r12a_202610250002?options=-c%20role=postgres',
 ])('rejects unsafe URL without exposing it: %s',url=>{
  expect(()=>validateRuntimeUrl(plan(),url)).toThrow('BEGINNER_ENVIRONMENT_MISMATCH');
 });
 it('allows only the exact runtime identity',()=>{
  expect(()=>validateRuntimeUrl(plan(),'postgresql://wl_beginner_202610250002:private@127.0.0.1:55432/worklingo_beginner_r12a_202610250002?schema=public')).not.toThrow();
 });
 it.each(['superuser','createDb','createRole','replication','bypassRls','inherit','owner','createSchema','createTemp'])('rejects privilege %s',flag=>{
  expect(()=>validateDatabaseEvidence(plan(),{...validDb,[flag]:true})).toThrow('BEGINNER_DATABASE_IDENTITY_MISMATCH');
 });
 it('requires exact privilege evidence, not missing fields',()=>{
  const {replication:_missing,...incomplete}=validDb;
  expect(()=>validateDatabaseEvidence(plan(),incomplete)).toThrow();
  expect(()=>validateDatabaseEvidence(plan(),{...validDb,memberships:1})).toThrow();
  expect(()=>validateDatabaseEvidence(plan(),validDb)).not.toThrow();
 });
 it.each(['D:/Projects/WorkLingo/data','C:/ProgramData','C:/Users/ASUS/AppData/Local/Temp/worklingo-beginner-r12a','../elsewhere'])('refuses cleanup outside exact run: %s',candidate=>{
  expect(()=>assertOwnedPath(plan(),candidate)).toThrow();
 });
 it('allows a descendant but never a parent of the run',()=>{
  expect(()=>assertOwnedPath(plan(),plan().environment.filesystem.storageRoot)).not.toThrow();
 });
 it('requires ownership evidence before destructive cleanup',()=>{
  const p=plan(),owned={containerId:'0123456789abcdef',containerName:p.environment.docker.container,image:p.environment.docker.image,volume:p.environment.docker.volume,runId:'202610250002',exclusiveMount:true,database:validDb};
  expect(()=>validateCleanupEvidence(p,owned)).not.toThrow();
  expect(()=>validateCleanupEvidence(p,{...owned,runId:'another-run'})).toThrow();
  expect(()=>validateCleanupEvidence(p,{...owned,exclusiveMount:false})).toThrow();
 });
 it('constructs a fresh environment without inherited production secrets or NODE_OPTIONS',()=>{
  const env=sanitizedChildEnvironment(plan(),'postgresql://wl_beginner_202610250002:private@127.0.0.1:55432/worklingo_beginner_r12a_202610250002',{sessionSecret:'s'.repeat(48),rateLimitKey:'r'.repeat(48)});
  expect(env.DATABASE_URL).toBe(env.TEST_DATABASE_URL);expect(env.OPENAI_API_KEY).toBe('');
  expect(env.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER).toBe('fake');
  expect(env.WORKLINGO_BEGINNER_ENVIRONMENT_ID).toBe('beginner-r12a-db-e2e-20261025-002');
  expect(env.NODE_OPTIONS).toBeUndefined();expect(env.WORKLINGO_ADMIN_PASSWORD).toBeUndefined();
 });
 it.each(['actor','empty-reference','unrelated-reference','renewed-at'])('rejects altered human approval evidence: %s',mode=>{
  ports.grant=mode;
  expect(()=>verifyCapturedAuthority(plan())).toThrow('BEGINNER_HUMAN_APPROVAL_REQUIRED');
 });
 it('does not revive an expired grant by rewriting its timestamp',()=>{
  const p=plan(),valid=verifyCapturedAuthority(p);
  vi.useFakeTimers();vi.setSystemTime(new Date(Date.parse(valid.expiresAt)+60000));ports.grant='revive-expired';
  expect(()=>verifyCapturedAuthority(p)).toThrow('BEGINNER_HUMAN_APPROVAL_REQUIRED');
 });
 it('accepts the exact recorded human grant and source ledger without any runtime effect',()=>{
  const proof=verifyCapturedAuthority(plan());expect(proof.candidateHash).toMatch(/^[a-f0-9]{64}$/);
 });
 it('rejects changed human-note content even if metadata keeps its original reference',()=>{
  ports.grant='tampered-note';
  expect(()=>verifyCapturedAuthority(plan())).toThrow('BEGINNER_HUMAN_APPROVAL_REQUIRED');
 });
 it('rejects actual TRUNCATE privilege even when all other evidence is safe',()=>{
  expect(()=>validateDatabaseEvidence(plan(),{...validDb,truncate:true})).toThrow('BEGINNER_DATABASE_IDENTITY_MISMATCH');
 });
 it('requires explicit negative TRUNCATE evidence',()=>{
  const {truncate:_missing,...data}=validDb;
  expect(()=>validateDatabaseEvidence(plan(),data)).toThrow('BEGINNER_DATABASE_IDENTITY_MISMATCH');
 });
 it.each(['dangling','unavailable'])('rejects %s inspection instead of treating it as absent',mode=>{
  ports.inspection=mode;ports.target=path.resolve(plan().environment.filesystem.storageRoot);
  expect(()=>assertNoReparseAncestors(ports.target)).toThrow('BEGINNER_UNSAFE_ROOT');
 });
 it('permits genuinely absent future roots while inspecting existing ancestors',()=>{
  expect(()=>assertNoReparseAncestors(plan().environment.filesystem.storageRoot)).not.toThrow();
 });
});
