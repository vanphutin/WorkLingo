import {describe,it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {hashBeginnerManifest} from '@worklingo/contracts';
import type {PrismaService} from '../../common/database/prisma.service.js';
import {analyzeLessonSource,audioScriptFingerprintText,parseLessonSource} from '@worklingo/content-format';
import {buildBeginnerDraftSnapshot} from '../../curriculum-foundation/application/foundation-validation.js';
import {BeginnerAuthoringPolicy} from '../domain/beginner-authoring-policy.js';
import {createBeginnerReview} from '../domain/beginner-publication-policy.js';
import {hashBeginnerRecord} from '../domain/beginner-environment-preflight.js';
import {fixturePermission,fixtureActor,fixtureTarget,syntheticBeginnerSource} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
import {BeginnerReleaseService,type BeginnerRegistryPort,type BeginnerReleaseApproval} from './beginner-release.service.js';
const id=(n:number)=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
function setup(){
 let permission:ReturnType<typeof fixturePermission>|null=fixturePermission();
 const policy=new BeginnerAuthoringPolicy({readPermission:async()=>permission,verifyEnvironment:vi.fn(),verifyTarget:vi.fn()});
 const source=syntheticBeginnerSource(),sourceHash=createHash('sha256').update(source).digest('hex'),snapshot=buildBeginnerDraftSnapshot(analyzeLessonSource(source).normalizedDraft!);
 const manifest={schemaVersion:1 as const,releaseId:'synthetic-unit-release',programId:fixtureTarget.programId,pathId:fixtureTarget.pathId!,stages:[{levelId:fixtureTarget.levelId!,expectedUnitCodes:['mg01','mg02','mg03','mg04'],transitionEnabled:false as const,units:[{missionId:fixtureTarget.missionId!,curriculumRevisionId:id(1),lessons:[{lessonId:id(2),lessonVersionId:id(3),order:1}]}]}]};
 const bytes=Buffer.from('synthetic fixture bytes'),checksum=createHash('sha256').update(bytes).digest('hex');
 const script=parseLessonSource(source).document.audioScripts[0]!;
 const selection={[script.slug]:id(4)};
 const audioRefs=[{audioArtifactId:id(4),audioScriptSlug:script.slug,audioArtifact:{id:id(4),status:'READY',storageKey:'fixture/one.wav',byteSize:bytes.length,checksum,scriptHash:createHash('sha256').update(audioScriptFingerprintText(script)).digest('hex')}}];
 const reviewed=createBeginnerReview({environmentId:permission.environmentId,actorId:id(20),editorId:fixtureActor.id,target:{...fixtureTarget,lessonId:id(2),importId:id(9)},draftRevision:1,sourceHash,validationHash:sourceHash,normalizedSnapshotHash:hashBeginnerRecord(analyzeLessonSource(source).normalizedDraft),audioSelectionHash:hashBeginnerRecord(selection),selectedAudioArtifacts:selection});
 const publication={kind:'BEGINNER_PUBLICATION_V1',environmentId:permission.environmentId,target:{...fixtureTarget,lessonId:id(2),importId:id(9)},rawSource:source,sourceHash,validationHash:sourceHash,snapshotHash:hashBeginnerRecord(snapshot),reviewHash:reviewed.reviewHash,draftRevision:1,selectedAudioArtifacts:selection};
 const reviews=[{id:id(8),actorId:id(20),metadata:reviewed}];
 const unitReviewData={kind:'FIXTURE_TECHNICAL_REVIEW',environmentId:permission.environmentId,target:fixtureTarget,revision:1,definitionHash:hashBeginnerRecord({}),actorId:id(20),editorId:fixtureActor.id};
 const unitReview={id:id(11),actorId:id(20),metadata:{...unitReviewData,reviewHash:hashBeginnerRecord(unitReviewData)}};
 const tx={learningPath:{findUnique:vi.fn().mockResolvedValue({id:manifest.pathId,programId:manifest.programId,slug:'mat-goc'})},level:{findUnique:vi.fn().mockResolvedValue({id:fixtureTarget.levelId,pathId:manifest.pathId,code:'MG_F0'})},mission:{findUnique:vi.fn().mockResolvedValue({id:fixtureTarget.missionId,levelId:fixtureTarget.levelId,slug:'mg01'})},curriculumRevision:{findUnique:vi.fn().mockResolvedValue({id:id(1),missionId:fixtureTarget.missionId,status:'PUBLISHED',revision:1,snapshot:{},lessons:[{lessonVersionId:id(3),order:1}]})},lessonVersion:{findUnique:vi.fn().mockResolvedValue({id:id(3),lessonId:id(2),status:'PUBLISHED',sourceHash,parsedContent:snapshot,audioArtifactReferences:audioRefs})},lessonVersionAudioArtifact:{findMany:vi.fn().mockResolvedValue(audioRefs)},auditLog:{findFirst:vi.fn().mockImplementation(async(args:{where:{action:string}})=>args.where.action==='beginner.curriculum.review'?unitReview:{id:id(7),metadata:publication}),findMany:vi.fn().mockResolvedValue(reviews)},mutationReceipt:{findMany:vi.fn().mockResolvedValue([{id:id(5),operation:'beginner:publish',requestHash:'c'.repeat(64),responseStatus:200,responseBody:{lessonVersionId:id(3),importId:id(9)}},{id:id(6),operation:'beginner:foundation:publish',requestHash:'d'.repeat(64),responseStatus:200,responseBody:{id:id(1)}},{id:id(10),operation:'beginner:fixture-audio',requestHash:'e'.repeat(64),responseStatus:200,responseBody:{audioArtifactId:id(4)}}])}};
 const db={...tx,$transaction:vi.fn(async(fn:(t:unknown)=>unknown)=>fn(tx))};
 const records=new Map<string,unknown>();const files:BeginnerRegistryPort={read:vi.fn(async(_root:string,key:string)=>{if(!records.has(key))throw Error('NOT_FOUND');return records.get(key);}),write:vi.fn(async(_root:string,key:string,value:unknown)=>{if(records.has(key))throw Error('BEGINNER_REGISTRY_EXISTS');records.set(key,structuredClone(value));})};
 let approval:BeginnerReleaseApproval|null=null;
 const approvals=vi.fn(async()=>approval);
 const storage={read:vi.fn().mockResolvedValue(bytes)};
 const service=new BeginnerReleaseService(db as unknown as PrismaService,policy,storage,files,approvals);
 return {service,db,tx,manifest,records,files,storage,permission,approvals,setPermission:(p:typeof permission)=>{permission=p;},setApproval:(p:typeof approval)=>{approval=p;}};
}
describe('Beginner immutable test release registry',()=>{
 it('exports actual immutable DB versions, assets and successful receipts without auto approval',async()=>{
  const s=setup(),candidate=await s.service.exportTestCandidate(fixtureActor,s.manifest);
  expect(candidate.state).toBe('TEST_PUBLISHED');expect(candidate).toHaveProperty('curriculumSnapshots',[{curriculumRevisionId:id(1),snapshotHash:hashBeginnerRecord({})}]);expect(candidate.manifest.hash).toBe(hashBeginnerManifest(s.manifest));
  expect(candidate.snapshots[0]?.lessonVersionId).toBe(id(3));expect(candidate.receipts.map(r=>r.id)).toEqual([id(5),id(6),id(10)]);
  expect(candidate.contentReadiness).toBe('FIXTURE_ONLY');expect(candidate.approvalRef).toBeNull();expect(s.records.size).toBe(1);
  await expect(s.service.loadApprovedBeginnerRelease(fixtureActor,s.manifest.releaseId,s.permission!.environmentId)).rejects.toThrow();
 });
 it('requires trusted candidate-specific approval and refuses traversal, overwrite, changed grant or foreign environment',async()=>{
  const s=setup();await expect(s.service.exportTestCandidate(fixtureActor,{...s.manifest,releaseId:'../escape'})).rejects.toThrow();expect(s.files.write).not.toHaveBeenCalled();
  const candidate=await s.service.exportTestCandidate(fixtureActor,s.manifest);
  await expect(s.service.exportTestCandidate(fixtureActor,s.manifest)).rejects.toThrow('BEGINNER_REGISTRY_EXISTS');
  await expect(s.service.approveTestRelease(fixtureActor,s.manifest.releaseId,'self-authored')).rejects.toThrow('BEGINNER_RELEASE_APPROVAL_REQUIRED');
  await expect(s.service.loadApprovedBeginnerRelease(fixtureActor,s.manifest.releaseId,'production')).rejects.toThrow();
  s.setPermission(null);await expect(s.service.approveTestRelease(fixtureActor,s.manifest.releaseId,'anything')).rejects.toThrow();expect(s.records.size).toBe(1);expect(candidate.approvalRef).toBeNull();
 });
 it('loads an explicitly approved test candidate and rejects later snapshot/asset modification',async()=>{
  const s=setup(),candidate=await s.service.exportTestCandidate(fixtureActor,s.manifest);
  const data={schemaVersion:1 as const,action:'approve-test-release' as const,approvalId:'synthetic-approval',environmentId:s.permission!.environmentId,releaseId:candidate.releaseId,candidateHash:candidate.candidateHash,approvedBy:'synthetic-human-double',authorizationSource:'UNIT_TEST_ONLY',expiresAt:'2099-01-01T00:00:00.000Z',revoked:false as const};
  s.setApproval({...data,recordHash:hashBeginnerRecord(data)});
  await s.service.approveTestRelease(fixtureActor,candidate.releaseId,data.approvalId);
  expect((await s.service.loadApprovedBeginnerRelease(fixtureActor,candidate.releaseId,s.permission!.environmentId)).releaseId).toBe(candidate.releaseId);
  s.storage.read.mockResolvedValue(Buffer.from('changed'));
  await expect(s.service.loadApprovedBeginnerRelease(fixtureActor,candidate.releaseId,s.permission!.environmentId)).rejects.toThrow();
 });
 it('rejects altered review hashes and source-editor self-review evidence',async()=>{
  const s=setup();s.tx.auditLog.findMany.mockResolvedValue([{id:id(8),actorId:id(20),metadata:{kind:'FIXTURE_TECHNICAL_REVIEW',reviewHash:'0'.repeat(64)}}] as never);
  await expect(s.service.exportTestCandidate(fixtureActor,s.manifest)).rejects.toThrow();expect(s.files.write).not.toHaveBeenCalled();
 });
 it('refuses missing publication evidence and changed historical snapshot hashes before registry writes',async()=>{
  const s=setup();s.tx.mutationReceipt.findMany.mockResolvedValue([]);
  await expect(s.service.exportTestCandidate(fixtureActor,s.manifest)).rejects.toThrow();expect(s.files.write).not.toHaveBeenCalled();
 });
});

it.each(['candidate','approved'] as const)('rejects a valid %s file copied under a different requested release ID',async(kind)=>{
 const s=setup(),candidate=await s.service.exportTestCandidate(fixtureActor,s.manifest);
 const data={schemaVersion:1 as const,action:'approve-test-release' as const,approvalId:'synthetic-approval',environmentId:s.permission!.environmentId,releaseId:candidate.releaseId,candidateHash:candidate.candidateHash,approvedBy:'synthetic-human-double',authorizationSource:'UNIT_TEST_ONLY',expiresAt:'2099-01-01T00:00:00.000Z',revoked:false as const};
 s.setApproval({...data,recordHash:hashBeginnerRecord(data)});
 const requested='different-requested-release';
 if(kind==='candidate'){
  s.records.set(requested+'.candidate',structuredClone(candidate));
  await expect(s.service.approveTestRelease(fixtureActor,requested,data.approvalId)).rejects.toThrow('BEGINNER_RELEASE_IDENTITY');
  expect(s.records.has(requested+'.approved')).toBe(false);
 }else{
  const approved=await s.service.approveTestRelease(fixtureActor,candidate.releaseId,data.approvalId);
  s.records.set(requested+'.approved',structuredClone(approved));
  await expect(s.service.loadApprovedBeginnerRelease(fixtureActor,requested,s.permission!.environmentId)).rejects.toThrow('BEGINNER_RELEASE_IDENTITY');
 }
});
