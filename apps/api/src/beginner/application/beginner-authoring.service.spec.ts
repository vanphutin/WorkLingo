import {analyzeLessonSource} from '@worklingo/content-format';
import {buildBeginnerDraftSnapshot} from '../../curriculum-foundation/application/foundation-validation.js';
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

it('previews the explicit valid historical V1 without first/latest fallback or learner writes',async()=>{
 const {service,db,tx,target,hash,source}=await setup(true);
 const id='10000000-0000-4000-8000-000000000030',snapshot=buildBeginnerDraftSnapshot(analyzeLessonSource(source).normalizedDraft!);snapshot.title='Pinned V1';
 const versions={findUnique:vi.fn().mockResolvedValue({id,lessonId:target.lessonId,version:1,status:'PUBLISHED',sourceHash:hash,parsedContent:snapshot})};
 Object.assign(db,{lessonVersion:versions,mission:{findUnique:vi.fn().mockResolvedValue({id:target.missionId,slug:'mg01',title:'Unit',objective:'Read and respond',purpose:'LEARNING',level:{code:'MG-F0'}})},lessonVersionAudioArtifact:{findMany:vi.fn().mockResolvedValue([])}});
 Object.assign(db.contentImport,{findMany:vi.fn().mockResolvedValue([])});
 db.auditLog.findFirst.mockResolvedValue({metadata:{kind:'BEGINNER_PUBLICATION_V1',environmentId:fixturePermission().environmentId,target,rawSource:source,sourceHash:hash,snapshotHash:(await import('../domain/beginner-environment-preflight.js')).hashBeginnerRecord(snapshot)}});
 const result=await service.learnerPreview(fixtureActor,target,id);
 expect(result.plan?.lessonVersionId).toBe(id);expect(result.activities).toHaveLength(8);
 expect(JSON.stringify(result)).not.toMatch(/answerIndex|Synthetic unit response|sampleAnswer|rubricId/);
 expect(versions.findUnique).toHaveBeenCalledWith(expect.objectContaining({where:{id}}));
 expect(db.$transaction).not.toHaveBeenCalled();expect(tx.auditLog.create).not.toHaveBeenCalled();
});

it('translates editorial Stage codes to the existing uppercase underscore Level contract',async()=>{
 const {service,db}=await setup(true);
 Object.assign(db,{learningPath:{findUnique:vi.fn().mockResolvedValue({slug:'mat-goc'})}});
 const curriculum=(service as unknown as {curriculum:{createLevel:unknown}}).curriculum;
 curriculum.createLevel=vi.fn().mockResolvedValue({id:'actual-level'});
 await expect(service.node(fixtureActor,'create-stage',{programId:fixtureTarget.programId,pathId:fixtureTarget.pathId},{code:'MG_F0',pathId:fixtureTarget.pathId,name:'MG-F0',cefrReference:'Pre-A1',idempotencyKey:'10000000-0000-4000-8000-000000000099'})).resolves.toEqual({id:'actual-level'});
});
it('rejects malformed targets as HTTP 400 without database reads',async()=>{
 const {service,db}=await setup(true);
 await expect(service.getImport(fixtureActor,{programId:'bad'})).rejects.toMatchObject({status:400});
 expect(db.contentImport.findUnique).not.toHaveBeenCalled();
});

it('saves incomplete authored source without claiming validation readiness',async()=>{
 const {service,db,tx,target,source,hash}=await setup(true);
 Object.assign(tx,{mission:{findUniqueOrThrow:vi.fn().mockResolvedValue({id:target.missionId,slug:'mg01',level:{}})},lesson:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn().mockResolvedValue({id:target.lessonId})},missionLesson:{create:vi.fn()}});
 const imports=(service as unknown as {imports:{create:unknown}}).imports;
 imports.create=vi.fn().mockImplementation(async(_actor:string,rawSource:string)=>({id:target.importId,sourceHash:hash,draftRevision:1,rawSource,status:'DRAFT'}));
 const rawSource=source+'\n[UNKNOWN: preserve-me]\nunfinished author text\n';
 const result=await service.createDraft(fixtureActor,{target:{programId:target.programId,pathId:target.pathId,levelId:target.levelId,missionId:target.missionId},rawSource,editorialCode:'MG01-L1',expectedRevision:null,idempotencyKey:'incomplete-source'});
 expect(result.draft.rawSource).toBe(rawSource);expect(result.draft.status).toBe('DRAFT');expect(db.$transaction).toHaveBeenCalledOnce();
});

it('returns a matching Unit review marker after reload without promoting stale definitions',async()=>{
 const {service,db,target}=await setup(true),unitTarget={programId:target.programId,pathId:target.pathId,levelId:target.levelId,missionId:target.missionId};
 const definition={category:'grammar',prerequisiteRevisionIds:[],objectives:[]};
 const hash=(await import('../domain/beginner-environment-preflight.js')).hashBeginnerRecord;
 const record={kind:'FIXTURE_TECHNICAL_REVIEW',environmentId:fixturePermission().environmentId,target:unitTarget,revision:1,definitionHash:hash(definition),actorId:'independent-reviewer',editorId:fixtureActor.id};
 const metadata={...record,reviewHash:hash(record)};
 Object.assign((service as unknown as {foundation:object}).foundation,{getDraft:vi.fn().mockResolvedValue({revision:1,definition,status:'VALIDATED'})});
 db.auditLog.findFirst.mockImplementation(async(args:{where:{action:string}})=>args.where.action==='beginner.curriculum.review'?{actorId:'independent-reviewer',metadata}:{actorId:fixtureActor.id,metadata:{}});
 expect(await service.getFoundation(fixtureActor,unitTarget)).toMatchObject({reviewedRevision:1,reviewHash:metadata.reviewHash});
 metadata.definitionHash='0'.repeat(64);
 expect(await service.getFoundation(fixtureActor,unitTarget)).toMatchObject({reviewedRevision:null,reviewHash:null});
});
