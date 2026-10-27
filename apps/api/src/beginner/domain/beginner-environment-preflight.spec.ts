import type * as NodeFs from 'node:fs';
import type * as NodeOs from 'node:os';
import {describe,it,expect,vi,afterEach,beforeEach} from 'vitest';
import {fixturePermission} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
import {validateBeginnerPermission,preflightBeginnerEnvironment,verifyNoForeignBeginnerClients} from './beginner-environment-preflight.js';
import type {Prisma} from '@prisma/client';
describe('Beginner fail-closed environment',()=>{
 it('rejects missing, modified and expired permission records',()=>{
  expect(()=>validateBeginnerPermission(null)).toThrow();
  const p=fixturePermission();p.actions.push('cleanup');expect(()=>validateBeginnerPermission(p)).toThrow('BEGINNER_PERMISSION_HASH_MISMATCH');
  expect(()=>validateBeginnerPermission(fixturePermission(),Date.parse('2100-01-01'))).toThrow('BEGINNER_PERMISSION_EXPIRED');
 });
 it('rejects production/fallback URLs and role mismatch before filesystem inspection',()=>{
  const p=fixturePermission();
  for(const url of ['', 'postgresql://root@127.0.0.1/worklingo','postgresql://wl_beginner_abcdef123456@production.example/worklingo_beginner_r12a_abcdef123456'])
   expect(()=>preflightBeginnerEnvironment(p,url)).toThrow();
 });
});

import path from 'node:path';
import {tmpdir} from 'node:os';
import {hashBeginnerRecord} from './beginner-environment-preflight.js';
function mainPermission(){
 const {recordHash:_old,...base}=fixturePermission();
 const record={...base,schemaVersion:2,mode:'CONTROLLED_MAIN_DB',runId:'261026a00003',issuedAt:'2030-01-01T00:00:00.000Z',expiresAt:'2030-01-01T04:00:00.000Z',database:{host:'127.0.0.1',port:55432,name:'worklingo',role:'wl_r12a_main_202610260003',serverIdentity:'7692646346822291490',databaseOid:'16384',roleOid:'40000',clusterName:''},execution:{mandateId:'MND-20261026-003',proposalHash:'280ea7a31e34e1649584bfdcf0f26fd6ead3f6dfdc7d4932434519071f761f17',scopeHash:'23353b08775352448f175b24c261cf043969ee49b1b0f4a25b730611c8867b2b',manifestPath:'C:/virtual/approval/execution.json',manifestHash:'a'.repeat(64)}};
 const main={...record,actions:record.actions.filter(a=>a!=='approve-release'&&a!=='schema-setup')};
 return {...main,recordHash:hashBeginnerRecord(main)};
}
describe('controlled main capability time and binding',()=>{
 it('checks foreign clients on every runtime authorization, including replay and after locks',async()=>{
  const query=vi.fn().mockResolvedValue([{count:1}]),tx={$queryRaw:query} as unknown as Prisma.TransactionClient;
  const permission=validateBeginnerPermission(mainPermission(),Date.parse('2030-01-01T01:00:00Z'));
  await expect(verifyNoForeignBeginnerClients(tx,permission)).rejects.toThrow('BEGINNER_FOREIGN_CLIENT');
  query.mockResolvedValue([{count:0}]);await expect(verifyNoForeignBeginnerClients(tx,permission)).resolves.toBeUndefined();
  await verifyNoForeignBeginnerClients(tx,fixturePermission());expect(query).toHaveBeenCalledTimes(2);
 });
 it('accepts valid v2 and never treats main as an isolated database',()=>{
  expect(()=>validateBeginnerPermission(mainPermission(),Date.parse('2030-01-01T01:00:00Z'))).not.toThrow();
 });
 it('rejects extended windows, future issue times and dual runtime flags',()=>{
  const now=Date.parse('2030-01-01T01:00:00Z');
  const {recordHash:_old,...data}=mainPermission();const extended={...data,expiresAt:'2030-01-02T00:00:00.000Z'};
  expect(()=>validateBeginnerPermission({...extended,recordHash:hashBeginnerRecord(extended)},now)).toThrow();
  expect(()=>validateBeginnerPermission(mainPermission(),Date.parse('2029-12-31T00:00:00Z'))).toThrow();
  vi.stubEnv('NODE_ENV','test');vi.stubEnv('WORKLINGO_BEGINNER_MAIN_TEST','1');vi.stubEnv('WORKLINGO_BEGINNER_ISOLATED_TEST','1');
  const clock=vi.spyOn(Date,'now').mockReturnValue(now);
  try{expect(()=>preflightBeginnerEnvironment(mainPermission(),'postgresql://wl_r12a_main_202610260003@127.0.0.1:55432/worklingo')).toThrow('BEGINNER_RUNTIME_MODE_MISMATCH');}finally{clock.mockRestore();}
 });
});
const fakeFs=vi.hoisted(()=>({writable:false,symlink:false,escape:false,falsePositive:false,elevated:false,unknownAcl:false,ancestorUnsafe:false,platform:'win32',accessError:'EACCES',main:false,files:{} as Record<string,string>}));
vi.mock('node:os',async original=>({...await original<typeof NodeOs>(),platform:()=>fakeFs.platform}));
vi.mock('node:child_process',()=>({spawnSync:vi.fn(()=>({status:0,stdout:JSON.stringify(fakeFs.unknownAcl?{}:{readable:true,writable:fakeFs.writable&&!fakeFs.falsePositive,canChangePermissions:false,elevated:fakeFs.elevated,ancestorProtected:!fakeFs.ancestorUnsafe}),stderr:''}))}));
vi.mock('node:fs',async original=>{const actual=await original<typeof NodeFs>();return {...actual,realpathSync:(value:string)=>fakeFs.escape&&value.endsWith('audio')?path.dirname(value):value,lstatSync:(value:string)=>fakeFs.main&&!value.replaceAll('\\','/').includes('/Temp/worklingo-beginner-main')?actual.lstatSync(value):({isSymbolicLink:()=>fakeFs.symlink,isFile:()=>true,nlink:1}),accessSync:()=>{if(!fakeFs.writable)throw Object.assign(Error(fakeFs.accessError),{code:fakeFs.accessError});},readFileSync:(value:string,encoding?:'utf8')=>fakeFs.main?(fakeFs.files[path.normalize(value)]??actual.readFileSync(value,encoding)):JSON.stringify({runId:'abcdef123456',environmentId:'synthetic-unit'})};});
beforeEach(()=>{vi.stubEnv('SystemRoot','C:\\Windows');});
afterEach(()=>{fakeFs.writable=false;fakeFs.symlink=false;fakeFs.escape=false;fakeFs.falsePositive=false;fakeFs.elevated=false;fakeFs.unknownAcl=false;fakeFs.ancestorUnsafe=false;fakeFs.platform='win32';fakeFs.accessError='EACCES';fakeFs.main=false;fakeFs.files={};vi.unstubAllEnvs();});

it('accepts the coordinator-generated v2 permission, exact paths and bounded connection URL with a virtual run only',async()=>{
 const {readMainScope,mainPermissionInput,sha256,lfHash}=await import('../../../test/beginner-main/environment.js');
 const actual=await vi.importActual<typeof NodeFs>('node:fs');fakeFs.main=true;
 const scope=readMainScope(),f=scope.environment.filesystem;
 const manifest={scopeHash:'23353b08775352448f175b24c261cf043969ee49b1b0f4a25b730611c8867b2b',proposalHash:'280ea7a31e34e1649584bfdcf0f26fd6ead3f6dfdc7d4932434519071f761f17',approvalHash:lfHash(path.join(scope.baseline.worktree,'mandate/reports/2026-10-26-beginner-main-db-human-approval.md')),files:scope.baseline.sourceFiles.map(file=>({path:file.path,sha256:actual.existsSync(path.join(scope.baseline.worktree,file.path))?sha256(actual.readFileSync(path.join(scope.baseline.worktree,file.path))):null}))};
 const json=JSON.stringify(manifest),window={startedAt:'2030-01-01T00:00:00.000Z',deadline:'2030-01-01T04:00:00.000Z'};
 fakeFs.files[path.normalize(path.join(f.approvalRoot,'execution.json'))]=json;
 fakeFs.files[path.normalize(path.join(f.runRoot,'run.json'))]=JSON.stringify({...window,runId:scope.environment.runId,environmentId:'main-'+scope.environment.runId});
 const permission=mainPermissionInput(scope,window,{programId:'10000000-0000-4000-8000-000000000001',roleOid:'40000',manifestHash:sha256(json)});
 const url='postgresql://'+scope.runtimeRole.name+':synthetic@127.0.0.1:55432/worklingo?schema=public&connection_limit=3';
 vi.stubEnv('NODE_ENV','test');vi.stubEnv('WORKLINGO_BEGINNER_MAIN_TEST','1');vi.stubEnv('WORKLINGO_BEGINNER_ISOLATED_TEST','0');const clock=vi.spyOn(Date,'now').mockReturnValue(Date.parse('2030-01-01T01:00:00Z'));
 try{
  expect(preflightBeginnerEnvironment(permission,url).programId).toBe(permission.programId);
  expect(()=>preflightBeginnerEnvironment(permission,url+'&connection_limit=3')).toThrow('BEGINNER_ENVIRONMENT_MISMATCH');
  const {recordHash:_old,...changed}={...permission,approvalRoot:path.join(f.runRoot,'other')};
  expect(()=>preflightBeginnerEnvironment({...changed,recordHash:hashBeginnerRecord(changed)},url)).toThrow('BEGINNER_UNSAFE_APPROVAL_ROOT');
 }finally{clock.mockRestore();}
});
it('checks marker, protected approval root and symlink escapes with a virtual filesystem only',()=>{
 const base=fixturePermission(),ownedTempRoot=path.join(tmpdir(),'beginner-virtual'),run=path.join(ownedTempRoot,base.runId);
 const record={...base,ownedTempRoot,storageRoot:path.join(run,'audio'),registryRoot:path.join(run,'registry'),approvalRoot:path.join(path.parse(tmpdir()).root,'operator-virtual')};
 const {recordHash:_old,...data}=record;const p={...data,recordHash:hashBeginnerRecord(data)};
 const url='postgresql://'+p.database.role+'@127.0.0.1:5432/'+p.database.name;
 expect(preflightBeginnerEnvironment(p,url).environmentId).toBe(p.environmentId);
 fakeFs.writable=true;expect(()=>preflightBeginnerEnvironment(p,url)).toThrow('BEGINNER_APPROVAL_ROOT_WRITABLE');
 fakeFs.writable=false;fakeFs.symlink=true;expect(()=>preflightBeginnerEnvironment(p,url)).toThrow('BEGINNER_UNSAFE_ROOT');
 fakeFs.symlink=false;fakeFs.escape=true;expect(()=>preflightBeginnerEnvironment(p,url)).toThrow('BEGINNER_UNSAFE_ROOT');
});

import {installBeginnerNetworkGuard} from './beginner-environment-preflight.js';
it('blocks provider egress before fetch while preserving a reversible isolated guard',async()=>{
 const original=globalThis.fetch;const restore=installBeginnerNetworkGuard();
 await expect(fetch('https://api.openai.com/v1/responses')).rejects.toThrow('BEGINNER_EXTERNAL_EGRESS_DENIED');
 restore();expect(globalThis.fetch).toBe(original);
});

function virtualEnvironment() {
 const base=fixturePermission(),ownedTempRoot=path.join(tmpdir(),'beginner-virtual'),run=path.join(ownedTempRoot,base.runId);
 const {recordHash:_old,...record}={...base,ownedTempRoot,storageRoot:path.join(run,'audio'),registryRoot:path.join(run,'registry'),approvalRoot:path.join(path.parse(tmpdir()).root,'operator-virtual')};
 return {...record,recordHash:hashBeginnerRecord(record)};
}
it('uses effective NTFS access rather than a false-positive fs.access result',()=>{
 const p=virtualEnvironment();fakeFs.writable=true;fakeFs.falsePositive=true;
 expect(()=>preflightBeginnerEnvironment(p,'postgresql://'+p.database.role+'@127.0.0.1:5432/'+p.database.name)).not.toThrow();
});
it('rejects an elevated runtime token even when the root looks read-only',()=>{
 const p=virtualEnvironment();fakeFs.elevated=true;
 expect(()=>preflightBeginnerEnvironment(p,'postgresql://'+p.database.role+'@127.0.0.1:5432/'+p.database.name)).toThrow('BEGINNER_APPROVAL_ROOT_WRITABLE');
});
it('fails closed when native ACL proof is unavailable or incomplete',()=>{
 const p=virtualEnvironment();fakeFs.unknownAcl=true;
 expect(()=>preflightBeginnerEnvironment(p,'postgresql://'+p.database.role+'@127.0.0.1:5432/'+p.database.name)).toThrow('BEGINNER_APPROVAL_ROOT_WRITABLE');
});
it('denies a read-only approval root that can be replaced through a writable ancestor',()=>{
 const p=virtualEnvironment();fakeFs.ancestorUnsafe=true;
 expect(()=>preflightBeginnerEnvironment(p,'postgresql://'+p.database.role+'@127.0.0.1:5432/'+p.database.name)).toThrow('BEGINNER_APPROVAL_ROOT_WRITABLE');
});
it('retains POSIX permission-denied handling independently of Windows token proof',()=>{
 const p=virtualEnvironment();fakeFs.platform='linux';fakeFs.elevated=true;
 expect(()=>preflightBeginnerEnvironment(p,'postgresql://'+p.database.role+'@127.0.0.1:5432/'+p.database.name)).not.toThrow();
});
it('does not mistake an unrelated POSIX access error for read-only proof',()=>{
 const p=virtualEnvironment();fakeFs.platform='linux';fakeFs.accessError='ENOENT';
 expect(()=>preflightBeginnerEnvironment(p,'postgresql://'+p.database.role+'@127.0.0.1:5432/'+p.database.name)).toThrow('BEGINNER_APPROVAL_ROOT_WRITABLE');
});
