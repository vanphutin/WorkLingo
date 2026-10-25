import type * as NodeFs from 'node:fs';
import {describe,it,expect,vi,afterEach} from 'vitest';
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
const fakeFs=vi.hoisted(()=>({writable:false,symlink:false,escape:false}));
vi.mock('node:fs',async original=>({...await original<typeof NodeFs>(),realpathSync:(value:string)=>fakeFs.escape&&value.endsWith('audio')?path.dirname(value):value,lstatSync:()=>({isSymbolicLink:()=>fakeFs.symlink,isFile:()=>true}),accessSync:()=>{if(!fakeFs.writable)throw Error('EACCES');},readFileSync:()=>JSON.stringify({runId:'abcdef123456',environmentId:'synthetic-unit'})}));
afterEach(()=>{fakeFs.writable=false;fakeFs.symlink=false;fakeFs.escape=false;});
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
