import {Test} from '@nestjs/testing';
import {describe,it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {BeginnerAuthoringService} from './beginner-authoring.service.js';
import {BeginnerAuthoringPolicy} from '../domain/beginner-authoring-policy.js';
import {PrismaService} from '../../common/database/prisma.service.js';
import {ContentImportsService} from '../../content-authoring/application/content-imports.service.js';
import {ContentPublisherService} from '../../content-authoring/application/content-publisher.service.js';
import {FoundationCurriculumService} from '../../curriculum-foundation/application/foundation-curriculum.service.js';
import {AdminCurriculumCommandService} from '../../admin-curriculum/application/admin-curriculum-command.service.js';
import {ObjectStorage} from '../../storage/domain/object-storage.port.js';
import {fixtureActor,fixtureTarget,fixturePermission,syntheticBeginnerSource} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
async function setup(granted=false){
 const source=syntheticBeginnerSource(),hash=createHash('sha256').update(source).digest('hex'),target={...fixtureTarget,lessonId:'10000000-0000-4000-8000-000000000020',importId:'10000000-0000-4000-8000-000000000021'};
 const tx={$queryRaw:vi.fn(),$executeRaw:vi.fn(),contentImport:{findUnique:vi.fn().mockResolvedValue({id:target.importId,lessonId:target.lessonId,rawSource:source,status:'VALIDATED',draftRevision:1,sourceHash:hash,validationHash:hash})},auditLog:{findFirst:vi.fn().mockResolvedValue({actorId:fixtureActor.id,metadata:{sourceHash:hash}}),create:vi.fn()},mutationReceipt:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn()}};
 const db={...tx,$transaction:vi.fn(async(fn:(tx:unknown)=>unknown)=>fn(tx))};
 const policy=new BeginnerAuthoringPolicy({readPermission:async()=>granted?fixturePermission():null,verifyTarget:vi.fn(),verifyEnvironment:vi.fn()});
 const module=await Test.createTestingModule({providers:[BeginnerAuthoringService,{provide:PrismaService,useValue:db},{provide:BeginnerAuthoringPolicy,useValue:policy},{provide:ContentImportsService,useValue:{}},{provide:ContentPublisherService,useValue:{}},{provide:FoundationCurriculumService,useValue:{}},{provide:AdminCurriculumCommandService,useValue:{}},{provide:ObjectStorage,useValue:{read:vi.fn()}}]}).compile();
 return {service:module.get(BeginnerAuthoringService),db,tx,target,hash,source};
}
describe('Beginner Admin orchestration',()=>{
 it('denies authoring before transaction when environment permission is absent',async()=>{
  const {service,db,target,source}=await setup();
  await expect(service.createDraft(fixtureActor,{target,rawSource:source,expectedRevision:null,idempotencyKey:'draft-one'})).rejects.toThrow('BEGINNER_PERMISSION_REQUIRED');
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('shows planned curriculum without creating database records',async()=>{
  const {service,db}=await setup(),result=await service.getWorkspace(fixtureActor);
  expect(result.plan.stages.flatMap(s=>s.units.flatMap(u=>u.lessons))).toHaveLength(80);
  expect(result.bindings).toEqual([]);expect(result.writesEnabled).toBe(false);expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('rejects self-review using source audit provenance, not updatedById',async()=>{
  const {service,tx,target,hash}=await setup(true);
  await expect(service.review(fixtureActor,{target,expectedRevision:1,expectedSourceHash:hash,idempotencyKey:'review-one',selectedAudioArtifacts:{}})).rejects.toThrow('BEGINNER_INDEPENDENT_REVIEW_REQUIRED');
  expect(tx.auditLog.create).not.toHaveBeenCalled();
 });
});
