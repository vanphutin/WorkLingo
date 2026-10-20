import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { seedIeltsOrientation } from '../../src/ielts-orientation/infrastructure/seed-ielts-orientation.js';
import { seedIeltsBridge } from '../../src/ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { seedIeltsIntegratedProfiles } from '../../src/ielts-integrated-practice/infrastructure/seed-ielts-integrated-profiles.js';
import { IeltsTopicAdminService } from '../../src/ielts-study/application/ielts-topic-admin.service.js';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';
import { seedIeltsTopicCurriculum } from './ielts-topic-test-fixture.js';
let context:LearningSessionTestContext;
beforeAll(async()=>{context=await createLearningSessionTestContext('ielts_v3_compatibility');await seedIeltsOrientation(context.database);await seedIeltsBridge(context.database);await seedIeltsIntegratedProfiles(context.database);},60000);
afterAll(async()=>context?.close());
it('keeps old progress, sixty-minute plans, grants and reports pinned through both rollout directions',async()=>{
  const db=context.database,config=context.app.get(ConfigService);
  const learner=await registerPendingLearner(context.app,{displayName:'Returning learner',email:`${randomUUID()}@test.local`});
  await learner.agent.post('/api/v1/me/onboarding/self-placement').send({clientConfirmationId:randomUUID(),selectedLevelCode:'FOUNDATION_1'}).expect(200);
  await db.learnerProfile.update({where:{userId:learner.user.id},data:{ieltsEarlyAccess:true}});
  const profile=await db.learnerProfile.findUniqueOrThrow({where:{userId:learner.user.id}});
  const orientation=await db.ieltsOrientation.findUniqueOrThrow({where:{slug:'ielts-orientation'}});
  const ov=await db.ieltsOrientationVersion.create({data:{orientationId:orientation.id,version:1,title:'Previous introduction',content:orientation.draftContent as Prisma.InputJsonValue,sourceHash:'compatibility-fixture'}});
  await db.ieltsOrientation.update({where:{id:orientation.id},data:{status:'PUBLISHED',currentPublishedVersionId:ov.id}});
  const oldProgress=await db.orientationProgress.create({data:{learnerId:learner.user.id,orientationVersionId:ov.id,answers:[],currentSlideIndex:1}});
  const oldProfile=await db.ieltsIntegratedProfile.findUniqueOrThrow({where:{durationMinutes:60}});
  const pv=await db.ieltsIntegratedProfileVersion.create({data:{profileId:oldProfile.id,version:1,durationMinutes:60,sourceHash:randomUUID(),content:oldProfile.draftContent as Prisma.InputJsonValue}});
  await db.ieltsIntegratedProfile.update({where:{id:oldProfile.id},data:{status:'PUBLISHED',currentPublishedVersionId:pv.id}});
  config.set('ieltsFlow','legacy');
  const oldSession=(await learner.agent.post('/api/v1/me/ielts-integrated/sessions').send({clientSessionId:randomUUID(),durationMinutes:60,difficulty:'foundation'}).expect(200)).body;
  const paper=await db.ieltsMockTest.create({data:{slug:'compatibility-paper',status:'PUBLISHED',draftContent:INITIAL_IELTS_ACADEMIC_MOCK as unknown as Prisma.InputJsonValue}});
  const version=await db.ieltsMockTestVersion.create({data:{mockTestId:paper.id,version:1,sourceHash:randomUUID(),content:INITIAL_IELTS_ACADEMIC_MOCK as unknown as Prisma.InputJsonValue}});
  await db.ieltsMockTest.update({where:{id:paper.id},data:{currentPublishedVersionId:version.id}});
  const oldAttempts=[];
  for(const mode of ['LEARNING','EXAM_SIMULATION'] as const){
    const attempt=await db.ieltsMockAttempt.create({data:{learnerId:learner.user.id,clientAttemptId:randomUUID(),mockTestVersionId:version.id,mode,responses:{legacy:'preserve'},sectionDeadlineAt:new Date(Date.now()+1800000)}});oldAttempts.push(attempt);
  }
  const reportId=randomUUID();const report={attemptId:reportId,status:'COMPLETED',scoringPolicyVersion:1,disclosure:INITIAL_IELTS_ACADEMIC_MOCK.disclosure,skills:Object.fromEntries(['listening','reading','writing','speaking'].map(skill=>[skill,{status:['writing','speaking'].includes(skill)?'TEACHER_REVIEWED':'SCORED',rawScore:['writing','speaking'].includes(skill)?null:30,mockBand:7}])),overallMockBand:7,strengths:[],gaps:[],nextActions:['Keep the historical reviewer feedback.'],completedAt:new Date().toISOString()};
  await db.ieltsMockAttempt.create({data:{id:reportId,learnerId:learner.user.id,clientAttemptId:randomUUID(),mockTestVersionId:version.id,mode:'LEARNING',status:'COMPLETED',currentSection:'COMPLETE',sectionDeadlineAt:new Date(),reportSnapshot:report as Prisma.InputJsonValue}});
  const fixture=await seedIeltsTopicCurriculum(context),admin=await db.user.create({data:{email:`${randomUUID()}@test.local`,displayName:'Author',role:'CONTENT_ADMIN',passwordHash:'fixture'}}),publisher=context.app.get(IeltsTopicAdminService);
  const draft=await publisher.saveDraft(admin.id,null,{expectedRevision:null,idempotencyKey:randomUUID(),content:{schemaVersion:1,title:'Education',description:'Disposable compatibility topic fixture.',packs:[fixture.pack]}});
  const topic=await publisher.publish(admin.id,draft.id,{expectedRevision:draft.draftRevision,idempotencyKey:randomUUID()});
  await db.learningProgram.update({where:{slug:'ielts'},data:{availabilityStatus:'BETA'}});
  config.set('ieltsFlow','v3');
  const input={clientSessionId:randomUUID(),topicVersionId:topic.topicVersionId,packSlug:fixture.pack.slug,durationMinutes:90};
  const topicSession=(await learner.agent.post('/api/v1/me/ielts-study/sessions').send(input).expect(201)).body;
  const v2={...INITIAL_IELTS_ACADEMIC_MOCK,schemaVersion:2,allowedModes:['PRACTICE','EXAM_SIMULATION'],qualification:{reviewedBy:'Isolated policy fixture',reviewedAt:new Date().toISOString(),evidenceRevision:'fixture',qualifiedModes:['PRACTICE','EXAM_SIMULATION']}};
  const vv=await db.ieltsMockTestVersion.create({data:{mockTestId:paper.id,version:2,sourceHash:randomUUID(),content:v2 as unknown as Prisma.InputJsonValue}});
  await db.ieltsMockTest.update({where:{id:paper.id},data:{currentPublishedVersionId:vv.id}});
  const newMock=(await learner.agent.post('/api/v1/me/ielts-mocks/attempts').send({clientAttemptId:randomUUID(),mockTestId:paper.id,mode:'PRACTICE'}).expect(200)).body;
  for(const flow of ['legacy','v3','legacy']){
    config.set('ieltsFlow',flow);
    expect((await learner.agent.get(`/api/v1/me/ielts-integrated/sessions/${oldSession.id}`).expect(200)).body.plan).toEqual(oldSession.plan);
    expect((await learner.agent.get(`/api/v1/learning-sessions/${topicSession.id}`).expect(200)).body.plan).toEqual(topicSession.plan);
    expect((await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${newMock.id}`).expect(200)).body.policyVersion).toBe('v2');
    for(const old of oldAttempts){const resumed=(await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${old.id}`).expect(200)).body;expect(resumed.policyVersion).toBe('legacy-v1');expect(resumed.responses).toEqual({legacy:'preserve'});}
    expect((await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${reportId}/report`).expect(200)).body).toEqual(report);
  }
  await learner.agent.post('/api/v1/me/ielts-study/sessions').send({...input,clientSessionId:randomUUID()}).expect(409);
  const after=await db.learnerProfile.findUniqueOrThrow({where:{userId:learner.user.id}});
  expect(after.ieltsEarlyAccess).toBe(true);expect(after.activeProgramId).toBe(profile.activeProgramId);expect(after.currentLevelCode).toBe(profile.currentLevelCode);
  expect(await db.orientationProgress.findUnique({where:{id:oldProgress.id}})).toEqual(oldProgress);
  expect(await db.ieltsBridgeProgress.count({where:{learnerId:learner.user.id}})).toBe(0);
});
