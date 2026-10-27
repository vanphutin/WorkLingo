import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {parseLessonSource} from '@worklingo/content-format';
import {randomUUID} from 'node:crypto';
import type {BeginnerTarget} from '@worklingo/contracts';
import {openBeginnerHarness,attachBeginnerFixtureAudio} from './beginner-test-harness.js';
import {syntheticBeginnerSource} from '../fixtures/beginner/authoring/fixture-factory.js';
import {namespaceFixtureSource} from '../beginner-main/fixtures.js';
let h:Awaited<ReturnType<typeof openBeginnerHarness>>;
beforeAll(async()=>{h=await openBeginnerHarness();});afterAll(async()=>{await h?.close();});
describe('authorized isolated Beginner authoring',()=>{
 it('rejects unauthorized, wrong-target and generic direct writes before mutation',async()=>{
  const before=await h.db.contentImport.count();
  const rawSource=h.permission.schemaVersion===2?namespaceFixtureSource(syntheticBeginnerSource(),h.permission.runId,'mg01-l3'):syntheticBeginnerSource();
  const input={target:h.fixture.target,editorialCode:'MG01-L3',rawSource,expectedRevision:null,idempotencyKey:randomUUID()};
  await expect(h.authoring.createDraft({id:h.fixture.learnerId!,roles:['LEARNER']},input)).rejects.toMatchObject({status:403});
  await expect(h.authoring.createDraft(h.editor,{...input,target:{...input.target,programId:randomUUID()}})).rejects.toMatchObject({status:403});
  await expect(h.imports.create(h.editor.id,rawSource)).rejects.toThrow();
  expect(await h.db.contentImport.count()).toBe(before);
 });
 it('observes a real PostgreSQL row-lock wait across independent backends',async()=>{
  let unlock!:()=>void,locked!:()=>void,waiterStarted!:()=>void;
  const release=new Promise<void>(r=>{unlock=r;}),ready=new Promise<void>(r=>{locked=r;}),waiting=new Promise<void>(r=>{waiterStarted=r;});
  let firstPid=0,secondPid=0;
  const holder=h.db.$transaction(async tx=>{firstPid=(await tx.$queryRaw<Array<{pid:number}>>`SELECT pg_backend_pid() AS pid`)[0]!.pid;await tx.$queryRaw`SELECT "id" FROM "LearningProgram" WHERE "id"=${h.fixture.target.programId}::uuid FOR UPDATE`;locked();await release;});
  await ready;
  const waiter=h.db.$transaction(async tx=>{secondPid=(await tx.$queryRaw<Array<{pid:number}>>`SELECT pg_backend_pid() AS pid`)[0]!.pid;waiterStarted();await tx.$queryRaw`SELECT "id" FROM "LearningProgram" WHERE "id"=${h.fixture.target.programId}::uuid FOR UPDATE`;});
  try{await waiting;expect(firstPid).not.toBe(secondPid);let observed=false;
   for(let n=0;n<20;n++){const rows=await h.db.$queryRaw<Array<{waiting:boolean}>>`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=${secondPid} AND NOT granted) AS waiting`;if(rows[0]?.waiting){observed=true;break;}await new Promise(r=>setTimeout(r,10));}
   expect(observed).toBe(true);
  }finally{unlock();await Promise.all([holder,waiter]);}
 });
 it('persists one explicitly selected fixture draft and rejects stale optimistic updates',async()=>{
  const base=syntheticBeginnerSource(),slug=parseLessonSource(base).document.lesson!.slug;
  const source=h.permission.schemaVersion===2?namespaceFixtureSource(base,h.permission.runId,'mg01-l1'):base.replace('slug: '+slug,'slug: synthetic-'+randomUUID());
  const command={target:h.fixture.target,editorialCode:'MG01-L1',rawSource:source,expectedRevision:null,idempotencyKey:randomUUID(),selectedAudioArtifacts:{}};
  const result=await h.authoring.createDraft(h.editor,command);
  expect((await h.db.contentImport.findUniqueOrThrow({where:{id:result.draft.id}})).rawSource).toBe(source);
  expect((await h.authoring.createDraft(h.editor,command)).draft.id).toBe(result.draft.id);
  await expect(h.authoring.updateSource(h.editor,{target:result.target,rawSource:source,expectedRevision:result.draft.draftRevision+1,idempotencyKey:randomUUID()})).rejects.toMatchObject({status:409});
  const audio=await attachBeginnerFixtureAudio(h,h.editor,result.target,source);
  expect(Object.keys(audio).length).toBeGreaterThan(0);
  const validated=await h.authoring.validate(h.editor,{target:result.target,expectedRevision:result.draft.draftRevision,idempotencyKey:randomUUID()});expect(validated.status).toBe('VALIDATED');
  const review=await h.authoring.review(h.reviewer,{target:result.target,expectedRevision:result.draft.draftRevision,expectedSourceHash:result.draft.sourceHash,idempotencyKey:randomUUID(),selectedAudioArtifacts:audio});
  const published=await h.authoring.publish(h.editor,{target:result.target,expectedRevision:result.draft.draftRevision,expectedSourceHash:result.draft.sourceHash,reviewHash:review.reviewHash,idempotencyKey:randomUUID(),selectedAudioArtifacts:audio});
  expect((await h.db.lessonVersion.findUniqueOrThrow({where:{id:published.lessonVersionId}})).status).toBe('PUBLISHED');
  const sourceV2=source.replace(/^(title:.*)$/m,'$1 V2');
  const existingLesson:BeginnerTarget={...result.target};delete existingLesson.importId;
  const replacement=await h.authoring.createDraft(h.editor,{target:existingLesson,editorialCode:'MG01-L1',rawSource:sourceV2,expectedRevision:null,idempotencyKey:randomUUID()});
  const updated=replacement.draft,targetV2=replacement.target;
  expect(updated.id).not.toBe(result.draft.id);expect(targetV2.lessonId).toBe(result.target.lessonId);
  const selectedV2=await attachBeginnerFixtureAudio(h,h.editor,targetV2,sourceV2);
  await h.authoring.validate(h.editor,{target:targetV2,expectedRevision:updated.draftRevision,idempotencyKey:randomUUID()});
  const reviewV2=await h.authoring.review(h.reviewer,{target:targetV2,expectedRevision:updated.draftRevision,expectedSourceHash:updated.sourceHash,idempotencyKey:randomUUID(),selectedAudioArtifacts:selectedV2});
  const publishV2={target:targetV2,expectedRevision:updated.draftRevision,expectedSourceHash:updated.sourceHash,reviewHash:reviewV2.reviewHash,idempotencyKey:randomUUID(),selectedAudioArtifacts:selectedV2};
  const versionsBefore=await h.db.lessonVersion.count(),receiptsBefore=await h.db.mutationReceipt.count(),pointerBefore=(await h.db.lesson.findUniqueOrThrow({where:{id:published.lessonId}})).currentPublishedVersionId;
  const actualPublish=h.publisher.publish.bind(h.publisher),put=h.storage.put.bind(h.storage);let compensationKey:string|undefined;
  const fault=vi.spyOn(h.publisher,'publish').mockImplementationOnce(async(...args)=>{
   await actualPublish(...args);
   compensationKey=(await put({prefix:'beginner/'+h.permission.runId+'/rollback-fixture',contentType:'text/plain',body:Buffer.from('FIXTURE_ONLY')})).key;
   const failedPut=vi.spyOn(h.storage,'put').mockRejectedValueOnce(Error('TEST_ONLY_STORAGE_FAILURE'));
   try{await h.storage.put({prefix:'beginner/'+h.permission.runId+'/rollback-fixture',contentType:'text/plain',body:Buffer.from('FIXTURE_ONLY')});}finally{failedPut.mockRestore();}
   throw Error('Expected storage fault');
  });
  try{await expect(h.authoring.publish(h.editor,publishV2)).rejects.toThrow('TEST_ONLY_STORAGE_FAILURE');}
  finally{fault.mockRestore();if(compensationKey)await h.storage.delete(compensationKey);}
  expect(await h.db.lessonVersion.count()).toBe(versionsBefore);expect(await h.db.mutationReceipt.count()).toBe(receiptsBefore);expect((await h.db.lesson.findUniqueOrThrow({where:{id:published.lessonId}})).currentPublishedVersionId).toBe(pointerBefore);
  const oldMode=process.env.WORKLINGO_BEGINNER_MAIN_TEST;
  if(h.permission.schemaVersion===2){process.env.WORKLINGO_BEGINNER_MAIN_TEST='0';try{await expect(h.authoring.createDraft(h.editor,command)).rejects.toMatchObject({status:403});}finally{process.env.WORKLINGO_BEGINNER_MAIN_TEST=oldMode;}}
  const [second,replayed]=await Promise.all([h.authoring.publish(h.editor,publishV2),h.authoring.publish(h.editor,publishV2)]);
  expect(second.lessonVersionId).toBe(replayed.lessonVersionId);expect(second.lessonVersionId).not.toBe(published.lessonVersionId);
  expect((await h.db.lesson.findUniqueOrThrow({where:{id:published.lessonId}})).currentPublishedVersionId).toBe(second.lessonVersionId);
  expect((await h.db.lessonVersion.findUniqueOrThrow({where:{id:published.lessonVersionId}})).status).toBe('PUBLISHED');
  const preview=await h.authoring.learnerPreview(h.editor,result.target,published.lessonVersionId);
  expect(preview.lessonVersionId).toBe(published.lessonVersionId);expect(preview.sourceHash).toBe(result.draft.sourceHash);
  const learnerCounts=await Promise.all([h.db.learningSession.count(),h.db.activityAttempt.count(),h.db.masteryRecord.count(),h.db.learnerProgramEnrollment.count()]);
  const redacted=await h.authoring.learnerPreview(h.editor,result.target,published.lessonVersionId);
  expect(JSON.stringify(redacted.activities)).not.toMatch(/sampleAnswer|answerIndex|rubricId/u);
  expect(await Promise.all([h.db.learningSession.count(),h.db.activityAttempt.count(),h.db.masteryRecord.count(),h.db.learnerProgramEnrollment.count()])).toEqual(learnerCounts);
  const count=await h.db.lessonVersion.count({where:{lessonId:published.lessonId}});
  await expect(h.authoring.publish(h.editor,{...publishV2,expectedRevision:result.draft.draftRevision,reviewHash:review.reviewHash,idempotencyKey:randomUUID()})).rejects.toMatchObject({status:409});
  expect(await h.db.lessonVersion.count({where:{lessonId:published.lessonId}})).toBe(count);
  // No approved release, learner admission, cleanup, migrations or real provider calls.
 });
});
