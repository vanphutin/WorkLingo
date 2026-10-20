import { IeltsTopicAdminService } from '../../src/ielts-study/application/ielts-topic-admin.service.js';
import { curriculumDefinitionInputSchema } from '@worklingo/contracts';
import { CurriculumProgressService } from '../../src/curriculum-foundation/application/curriculum-progress.service.js';
import { LearningSessionsService } from '../../src/learning-sessions/application/learning-sessions.service.js';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { loadIeltsV3Bundle } from '../../src/ielts-flow/release/release-content.js';
import { executeIeltsV3Release, inspectIeltsV3Release } from '../../src/ielts-flow/release/release-v3.js';
import { ieltsContentRoot } from '../../src/ielts-study/infrastructure/topic-content.js';
import { seedIeltsOrientation } from '../../src/ielts-orientation/infrastructure/seed-ielts-orientation.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

// Optional clean-checkout gate requires explicitly prepared original Windows
// speech. Local release qualification must run it and report a real result.
const prepared=existsSync(path.join(ieltsContentRoot,'.prepared/mock-part-1.wav'));
let context:LearningSessionTestContext;
beforeAll(async()=>{if(prepared){context=await createLearningSessionTestContext('ielts_release_rehearsal');await seedIeltsOrientation(context.database);}},60000);
afterAll(async()=>context?.close());
it.skipIf(!prepared)('rehearses actual-byte atomic publication, stale rejection, rollback, idempotence and owned resumes in a disposable schema',async()=>{
  const db=context.database,storage=context.app.get(ObjectStorage),bundle=await loadIeltsV3Bundle();
  expect(context.schemaName).not.toBe('public');
  const actor=await db.user.create({data:{email:`${randomUUID()}@test.local`,displayName:'Rehearsal admin',role:'CONTENT_ADMIN',passwordHash:'fixture-only'}});
  // Explicit fixture review is never written to the tracked qualification file
  // or used by the public CLI; this test targets mechanics, not human audition.
  bundle.review={status:'QUALIFIED',contentReviewer:{name:'Isolated fixture review',evidenceRevision:'academic-02-original-v1'},audioAudition:{name:'Isolated fixture, no human claim',kind:'human',reviewedAt:new Date().toISOString(),sourceFingerprint:bundle.contentFingerprint}};
  const initial=await inspectIeltsV3Release(db,bundle,actor.id);
  await expect(executeIeltsV3Release(db,storage,bundle,actor.id,'0'.repeat(64))).rejects.toThrow('changed');
  expect(await db.ieltsTopic.count()).toBe(0);
  await db.$executeRawUnsafe(`CREATE FUNCTION reject_v3_release_test() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN IF NEW.action = ''RELEASE_IELTS_FLOW_V3'' THEN RAISE EXCEPTION ''isolated rollback rehearsal''; END IF; RETURN NEW; END'`);
  await db.$executeRawUnsafe(`CREATE TRIGGER reject_v3_release_test BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_v3_release_test()`);
  await expect(executeIeltsV3Release(db,storage,bundle,actor.id,initial.fingerprint)).rejects.toThrow('isolated rollback rehearsal');
  expect(await db.ieltsTopic.count()).toBe(0);expect(await db.learningPath.count({where:{slug:'ielts-contextual-topics'}})).toBe(0);expect(await db.audioArtifact.count({where:{variantKey:'ielts-flow-v3-original-2026-10-15'}})).toBe(0);
  await db.$executeRawUnsafe('DROP TRIGGER reject_v3_release_test ON "AuditLog"');await db.$executeRawUnsafe('DROP FUNCTION reject_v3_release_test()');
  expect(await executeIeltsV3Release(db,storage,bundle,actor.id,initial.fingerprint)).toBe('RELEASED');
  expect(await db.ieltsTopic.count({where:{status:'PUBLISHED'}})).toBe(12);
  const audioArtifact=await db.audioArtifact.findUniqueOrThrow({where:{id:bundle.topicAudio[0]!.assetId}});
  await db.audioArtifact.update({where:{id:audioArtifact.id},data:{adapterName:'fake-tts'}});
  const badAudio=await context.app.get(IeltsTopicAdminService).qualify(db,bundle.topics[0]!.manifest);
  expect(badAudio.canPublish).toBe(false);expect(badAudio.issues.map(issue=>issue.code)).toContain('IELTS_TOPIC_AUDIO_UNAVAILABLE');
  await db.audioArtifact.update({where:{id:audioArtifact.id},data:{adapterName:audioArtifact.adapterName}});
  const after=await inspectIeltsV3Release(db,bundle,actor.id);expect(after.complete).toBe(true);
  for (const revision of after.revisions) expect(curriculumDefinitionInputSchema.safeParse(revision.snapshot).success).toBe(true);
  expect(await executeIeltsV3Release(db,storage,bundle,actor.id,after.fingerprint)).toBe('ALREADY_RELEASED');
  expect(await db.auditLog.count({where:{action:'RELEASE_IELTS_FLOW_V3'}})).toBe(1);
  context.app.get(ConfigService).set('ieltsFlow','v3');
  const learner=await registerPendingLearner(context.app,{displayName:'Fresh learner',email:`${randomUUID()}@test.local`});
  await learner.agent.post('/api/v1/me/onboarding/self-placement').send({clientConfirmationId:randomUUID(),selectedLevelCode:'FOUNDATION_1'}).expect(200);
  expect((await learner.agent.get('/api/v1/me/ielts-overview').expect(200)).body).toMatchObject({introduction:{available:true},study:{available:true},mock:{available:true}});
  const topics=(await learner.agent.get('/api/v1/me/ielts-study/topics').expect(200)).body.topics;expect(topics).toHaveLength(12);
  const topic=topics[0],input={clientSessionId:randomUUID(),topicVersionId:topic.topicVersionId,packSlug:topic.packs[0].slug,durationMinutes:90};
  const session=(await learner.agent.post('/api/v1/me/ielts-study/sessions').send(input).expect(201)).body;
  const lessonSnapshot=await db.lessonVersion.findUniqueOrThrow({where:{id:session.lessonVersionId}});
  const activities=(lessonSnapshot.parsedContent as {activities:Array<{id:string;activityType:string;learningBlock:string}>}).activities;
  const recall=activities.find(activity=>activity.activityType==='writing'&&activity.learningBlock==='respond'&&session.plan.blocks.some((block:{activityIds:string[]})=>block.activityIds.includes(activity.id)))!;
  const projected=(await learner.agent.get(`/api/v1/learning-sessions/${session.id}/activities/${recall.id}`).expect(200)).body;
  expect(projected.payload).not.toHaveProperty('requiredPhrases');expect(projected.payload).not.toHaveProperty('sampleAnswer');expect(projected.payload.requiredPhraseCount).toBeGreaterThan(0);expect(projected.languageBlocks).toEqual([]);
  const storedSession=await db.learningSession.findUniqueOrThrow({where:{id:session.id}});
  const ids:string[]=session.plan.blocks.flatMap((block:{activityIds:string[]})=>block.activityIds);
  await db.learningSession.update({where:{id:session.id},data:{status:'IN_PROGRESS',currentCheckpoint:ids.length-1}});
  await db.learnerProgramEnrollment.upsert({where:{learnerId_programId:{learnerId:learner.user.id,programId:initial.program.id}},create:{learnerId:learner.user.id,programId:initial.program.id,currentLevelId:(await db.level.findUniqueOrThrow({where:{code:'IELTS_TOPIC_FOUNDATION'}})).id},update:{}});
  await db.$transaction(async tx=>{
    await context.app.get(LearningSessionsService).advanceSubmittedActivity(tx,learner.user.id,{activityId:ids.at(-1)!,activityIds:ids,activityIndex:ids.length-1,lessonVersionId:storedSession.lessonVersionId,plan:session.plan,purpose:'learning',sessionId:session.id});
    await context.app.get(CurriculumProgressService).projectSession(session.id,tx);
  });
  expect((await db.learningSession.findUniqueOrThrow({where:{id:session.id}})).status).toBe('COMPLETED');
  expect(await db.curriculumCompletion.count({where:{curriculumRevisionId:storedSession.curriculumRevisionId!}})).toBe(0);
  const mocks=(await learner.agent.get('/api/v1/me/ielts-mocks').expect(200)).body.mocks;expect(mocks[0].allowedModes).toEqual(['PRACTICE','EXAM_SIMULATION']);
  const attempt=(await learner.agent.post('/api/v1/me/ielts-mocks/attempts').send({clientAttemptId:randomUUID(),mockTestId:mocks[0].id,mode:'EXAM_SIMULATION'}).expect(200)).body;
  context.app.get(ConfigService).set('ieltsFlow','legacy');
  await db.learnerProfile.update({where:{userId:learner.user.id},data:{ieltsEarlyAccess:true}});
  await learner.agent.post('/api/v1/me/ielts-mocks/attempts').send({clientAttemptId:randomUUID(),mockTestId:mocks[0].id,mode:'PRACTICE'}).expect(409);
  await learner.agent.post('/api/v1/me/ielts-study/sessions').send({...input,clientSessionId:randomUUID()}).expect(409);
  expect((await learner.agent.get(`/api/v1/learning-sessions/${session.id}`).expect(200)).body.plan).toEqual(session.plan);
  expect((await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${attempt.id}`).expect(200)).body.mockTestVersionId).toBe(attempt.mockTestVersionId);
},120000);
