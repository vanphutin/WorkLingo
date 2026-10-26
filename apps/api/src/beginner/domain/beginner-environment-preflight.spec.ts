import type * as NodeFs from 'node:fs';
import type * as NodeOs from 'node:os';
import {describe,it,expect,vi,afterEach,beforeEach} from 'vitest';
import {fixturePermission} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
import {validateBeginnerPermission,preflightBeginnerEnvironment} from './beginner-environment-preflight.js';
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
const fakeFs=vi.hoisted(()=>({writable:false,symlink:false,escape:false,falsePositive:false,elevated:false,unknownAcl:false,ancestorUnsafe:false,platform:'win32',accessError:'EACCES'}));
vi.mock('node:os',async original=>({...await original<typeof NodeOs>(),platform:()=>fakeFs.platform}));
vi.mock('node:child_process',()=>({spawnSync:vi.fn(()=>({status:0,stdout:JSON.stringify(fakeFs.unknownAcl?{}:{readable:true,writable:fakeFs.writable&&!fakeFs.falsePositive,canChangePermissions:false,elevated:fakeFs.elevated,ancestorProtected:!fakeFs.ancestorUnsafe}),stderr:''}))}));
vi.mock('node:fs',async original=>({...await original<typeof NodeFs>(),realpathSync:(value:string)=>fakeFs.escape&&value.endsWith('audio')?path.dirname(value):value,lstatSync:()=>({isSymbolicLink:()=>fakeFs.symlink,isFile:()=>true}),accessSync:()=>{if(!fakeFs.writable)throw Object.assign(Error(fakeFs.accessError),{code:fakeFs.accessError});},readFileSync:()=>JSON.stringify({runId:'abcdef123456',environmentId:'synthetic-unit'})}));
beforeEach(()=>{vi.stubEnv('SystemRoot','C:\\Windows');});
afterEach(()=>{fakeFs.writable=false;fakeFs.symlink=false;fakeFs.escape=false;fakeFs.falsePositive=false;fakeFs.elevated=false;fakeFs.unknownAcl=false;fakeFs.ancestorUnsafe=false;fakeFs.platform='win32';fakeFs.accessError='EACCES';vi.unstubAllEnvs();});
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
