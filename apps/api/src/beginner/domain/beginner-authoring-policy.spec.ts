import {describe,it,expect,vi} from 'vitest';
import type {Prisma} from '@prisma/client';
import {BeginnerAuthoringPolicy,assertBeginnerContext} from './beginner-authoring-policy.js';
import {fixtureActor,fixtureTarget,fixturePermission} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
const tx={} as Prisma.TransactionClient;
describe('scoped Beginner authority',()=>{
 it('denies missing permission before consulting target/database',async()=>{
  const verifyTarget=vi.fn();const policy=new BeginnerAuthoringPolicy({readPermission:async()=>null,verifyTarget,verifyEnvironment:vi.fn()});
  await expect(policy.authorize(fixtureActor,'author',fixtureTarget,tx)).rejects.toThrow('BEGINNER_PERMISSION_REQUIRED');expect(verifyTarget).not.toHaveBeenCalled();
 });
 it('rejects forged runtime contexts and wrong-role actors',async()=>{
  await expect(assertBeginnerContext({},fixtureActor.id,'author',tx)).rejects.toThrow('BEGINNER_AUTHORING_DISABLED');
  const policy=new BeginnerAuthoringPolicy({readPermission:async()=>fixturePermission(),verifyTarget:vi.fn(),verifyEnvironment:vi.fn()});
  await expect(policy.authorize({...fixtureActor,roles:['LEARNER']},'author',fixtureTarget,tx)).rejects.toThrow('BEGINNER_FORBIDDEN');
 });
 it('binds a granted context to action/actor/target and rechecks revocation',async()=>{
  let permission:ReturnType<typeof fixturePermission>|null=fixturePermission();
  const policy=new BeginnerAuthoringPolicy({readPermission:async()=>permission,verifyTarget:vi.fn(),verifyEnvironment:vi.fn()});
  const context=await policy.authorize(fixtureActor,'author',fixtureTarget,tx);
  await expect(assertBeginnerContext(context,fixtureActor.id,'publish',tx)).rejects.toThrow('BEGINNER_SCOPE_MISMATCH');
  await expect(assertBeginnerContext(context,'different-actor','author',tx)).rejects.toThrow('BEGINNER_SCOPE_MISMATCH');
  permission=null;await expect(assertBeginnerContext(context,fixtureActor.id,'author',tx)).rejects.toThrow('BEGINNER_PERMISSION_REQUIRED');
 });
});

it('returns HTTP 403 for absent permission and invalidates a changed grant',async()=>{
 let permission:ReturnType<typeof fixturePermission>|null=null;
 const policy=new BeginnerAuthoringPolicy({readPermission:async()=>permission,verifyTarget:vi.fn(),verifyEnvironment:vi.fn()});
 await expect(policy.authorize(fixtureActor,'read',fixtureTarget,tx)).rejects.toMatchObject({status:403});
 permission=fixturePermission();const context=await policy.authorize(fixtureActor,'read',fixtureTarget,tx);
 permission={...permission,recordHash:'0'.repeat(64)};
 await expect(assertBeginnerContext(context,fixtureActor.id,'read',tx)).rejects.toMatchObject({status:403});
});
