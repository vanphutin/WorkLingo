import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { programVersionInputSchema } from '@worklingo/contracts';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { RateLimitService } from '../../src/common/rate-limit/rate-limit.service.js';
import type { LearningSessionDto } from '../../src/learning-sessions/application/learning-session.types.js';
async function registerLearner(app:INestApplication,input:{email:string;displayName:string}) {
 const agent=request.agent(app.getHttpServer());
 await agent.post('/api/v1/auth/register').send({...input,password:'a-secure-local-password'}).expect(201);
 const state=(await agent.get('/api/v1/me/onboarding').expect(200)).body;
 const level=state.eligibleLevels?.find((item:{available:boolean})=>item.available);
 if(!level) throw new Error('NO_PLAYABLE_ONBOARDING_LEVEL:'+JSON.stringify(state));
 await agent.post('/api/v1/me/onboarding/self-placement').send({clientConfirmationId:randomUUID(),selectedLevelCode:level.code}).expect(200);
 return agent;
}

const url = process.env.WL_R21_TEST_DATABASE_URL;
if (!url) throw new Error('EXPLICIT_WL_R21_TEST_DATABASE_URL_REQUIRED');
const target = new URL(url);
if (`${target.hostname}:${target.port}${target.pathname}` !== '127.0.0.1:55450/worklingo_r21' || (target.searchParams.get('schema') ?? 'public') !== 'public') throw new Error('OWNED_RESTORED_R21_DATABASE_REQUIRED');

/** Uses only the owned restored clone; never creates, migrates, truncates or drops schemas. */
describe('R21 exact Beginner learner journey on restored isolated database', () => {
  let app: INestApplication;
  let database: PrismaService;
  let learner: ReturnType<typeof request.agent>;
  let outsider: ReturnType<typeof request.agent>;
  let learnerId: string;
  const email = `r21-journey-${randomUUID()}@example.test`;
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.SESSION_SECRET = 'r21-isolated-journey-secret-at-least-32-characters';
    process.env.JOB_WORKER_ENABLED = 'false';
    process.env.WORKLINGO_BEGINNER_ISOLATED_TEST = '1';
    process.env.NODE_ENV = 'test';
    process.env.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER = 'fake';
    process.env.WORKLINGO_STT_PROVIDER = 'fake';
    process.env.WORKLINGO_TTS_PROVIDER = 'fake-tts';
    if (!process.env.WL_R21_TEST_DATA_DIR) throw new Error('EXACT_IMPORT_STORAGE_ROOT_REQUIRED');
    process.env.WORKLINGO_DATA_DIR = process.env.WL_R21_TEST_DATA_DIR;
    database = new PrismaService({datasourceUrl:url});
    const {AppModule}=await import('../../src/app.module.js');
    const module = await Test.createTestingModule({imports:[AppModule]}).overrideProvider(PrismaService).useValue(database).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({forbidNonWhitelisted:true,transform:true,whitelist:true}));
    await app.init();
    const {seedLearningPrograms}=await import('../../src/learning-programs/infrastructure/seed-learning-programs.js');
    const {seedFoundationCurriculum}=await import('../../src/curriculum/infrastructure/seed-foundation.js');
    const {ObjectStorage}=await import('../../src/storage/domain/object-storage.port.js');
    await seedLearningPrograms(database);
    await seedFoundationCurriculum(database,app.get(ObjectStorage));
    learner = await registerLearner(app,{email,displayName:'R21 isolated learner'});
    learnerId = (await database.user.findUniqueOrThrow({where:{email}})).id;
    outsider = await registerLearner(app,{email:`r21-outsider-${randomUUID()}@example.test`,displayName:'R21 isolated outsider'});
  },60000);
  afterAll(async()=>{await app?.close();await database?.$disconnect();});

  it('enrolls the exact Beta release, plays24audio and persists64attempts8lessons with unscored productive practice', async()=>{
    const program = await database.learningProgram.findUniqueOrThrow({where:{slug:'beginner'}});
    const release = await database.programVersion.findFirstOrThrow({where:{programId:program.id,status:'PUBLISHED',source:'AUTHORED'},orderBy:{version:'desc'}});
    const snapshot = programVersionInputSchema.parse(release.snapshot);
    const lessons=snapshot.curriculumBindings.flatMap(binding=>binding.lessons.map(lesson=>({binding,lesson})));
    expect(program).toMatchObject({availabilityStatus:'BETA',progressionPolicy:'ACTIVITY_COMPLETION'});
    expect(lessons).toHaveLength(8);
    expect(lessons.reduce((sum,{lesson})=>sum+lesson.activityIds.length,0)).toBe(64);
    expect(snapshot.curriculumBindings.reduce((sum,binding)=>sum+binding.objectives.length,0)).toBe(32);
    const catalog=(await learner.get('/api/v1/learning-programs').expect(200)).body;
    expect(catalog.programs.find((row:{slug:string})=>row.slug==='beginner')).toMatchObject({isSelectable:true,availabilityStatus:'BETA',currentRelease:{id:release.id}});
    const before=(await learner.get('/api/v1/me/program-context').expect(200)).body;
    const command={programSlug:'beginner',expectedRevision:before.enrollment.revision,idempotencyKey:randomUUID()};
    const enrollmentResponse=await learner.post('/api/v1/me/program-enrollments').send(command);
    expect(enrollmentResponse.status,JSON.stringify(enrollmentResponse.body)).toBe(200);
    const selected=enrollmentResponse.body;
    expect((await learner.post('/api/v1/me/program-enrollments').send(command).expect(200)).body).toEqual(selected);
    await learner.put('/api/v1/me/program-context').send({programSlug:'intermediate',expectedRevision:before.enrollment.revision}).expect(409);
    const enrollment=await database.learnerProgramEnrollment.findUniqueOrThrow({where:{id:selected.enrollment.id}});
    expect(enrollment).toMatchObject({programVersionId:release.id,curriculumRevisionIds:release.curriculumRevisionIds});
    const progressUrl=`/api/v1/me/program-enrollments/${enrollment.id}`;
    let audioCount=0;
    const attemptIds:string[]=[];
    const jobsBefore=await database.job.count({where:{createdById:learnerId}});
    for (const [index,{binding,lesson}] of lessons.entries()) {
      const stored=await database.lessonVersion.findUniqueOrThrow({where:{id:lesson.lessonVersionId}});
      const content=lessonSnapshotSchema.parse(stored.parsedContent);
      const input={clientSessionId:randomUUID(),durationMinutes:45,missionId:binding.missionId,expectedCurriculumRevisionId:binding.curriculumRevisionId,lessonVersionId:lesson.lessonVersionId};
      const session=(await learner.post('/api/v1/learning-sessions/curriculum').send(input).expect(201)).body as LearningSessionDto;
      expect(session.lessonVersionId).toBe(lesson.lessonVersionId);
      expect(session.plan.blocks.flatMap(block=>block.activityIds)).toEqual(lesson.activityIds);
      await outsider.get(`/api/v1/learning-sessions/${session.id}`).expect(404);
      await learner.post(`/api/v1/learning-sessions/${session.id}/start`).expect(200);
      if(index===0){await learner.post(`/api/v1/learning-sessions/${session.id}/pause`).expect(200);await learner.post(`/api/v1/learning-sessions/${session.id}/resume`).expect(200);}
      for (const [checkpoint,activityId] of lesson.activityIds.entries()) {
        const activity=content.activities.find(item=>item.id===activityId)!;
        const dto=(await learner.get(`/api/v1/learning-sessions/${session.id}/activities/${activityId}`).expect(200)).body;
        expect(JSON.stringify(dto)).not.toMatch(/answerIndex|rubricId|sampleAnswer|responseRubrics/);
        if(activity.activityType==='listening'){
          await learner.get(`/api/v1/learning-sessions/${session.id}/activities/${activityId}/audio`).expect(200);
          await outsider.get(`/api/v1/learning-sessions/${session.id}/activities/${activityId}/audio`).expect(404);
          audioCount++;
        }
        const productive=activity.activityType==='speaking'||activity.activityType==='writing';
        if(productive) expect(dto.payload.practiceMode).toBe('unscored');
        const response=activity.activityType==='reading'||activity.activityType==='listening'?{answerIndexes:activity.payload.questions.map(q=>q.answerIndex)}:{text:'Hello. My name is Linh. I work with my team.'};
        const attemptCommand={clientAttemptId:randomUUID(),sessionId:session.id,response};
        const result=(await learner.post(`/api/v1/activities/${activityId}/attempts`).send(attemptCommand).expect(201)).body;
        attemptIds.push(result.id);
        if(productive)expect(result).toMatchObject({evaluationStatus:'submitted',score:null,feedback:expect.stringContaining('unscored practice')});
        if(checkpoint===0)expect((await learner.post(`/api/v1/activities/${activityId}/attempts`).send(attemptCommand).expect(201)).body).toEqual(result);
        const refreshed=(await learner.get(`/api/v1/learning-sessions/${session.id}`).expect(200)).body;
        expect(refreshed.currentCheckpoint).toBe(checkpoint+1);
        if(attemptIds.length===48){const scope='learning-sessions:submit';await database.rateLimitBucket.deleteMany({where:{scope,subjectHash:app.get(RateLimitService).hashSubject(`${learnerId}:${scope}`)}});}
      }
      expect((await learner.get(`/api/v1/learning-sessions/${session.id}`).expect(200)).body.status).toBe('completed');
      expect((await learner.get(`${progressUrl}/progress`).expect(200)).body.items.find((item:{lessonVersionId:string})=>item.lessonVersionId===lesson.lessonVersionId).completed).toBe(true);
    }
    expect(audioCount).toBe(24);
    expect(await database.activityAttempt.count({where:{id:{in:attemptIds}}})).toBe(64);
    expect(await database.activityAttempt.count({where:{id:{in:attemptIds},activity:{activityType:{in:['speaking','writing']}},evaluationStatus:'SUBMITTED',score:null}})).toBe(16);
    expect(await database.job.count({where:{createdById:learnerId}})).toBe(jobsBefore);
    const completed=(await learner.get(`${progressUrl}/progress`).expect(200)).body;
    expect(completed.completed).toBe(true);
    const reviews=(await learner.get(`${progressUrl}/reviews`).expect(200)).body.items;
    expect(reviews).toHaveLength(8);
    const first=lessons[0]!;
    const firstSnapshot=lessonSnapshotSchema.parse((await database.lessonVersion.findUniqueOrThrow({where:{id:first.lesson.lessonVersionId}})).parsedContent);
    const reviewSession=(await learner.post('/api/v1/learning-sessions/curriculum').send({clientSessionId:randomUUID(),durationMinutes:45,missionId:first.binding.missionId,expectedCurriculumRevisionId:first.binding.curriculumRevisionId,lessonVersionId:first.lesson.lessonVersionId}).expect(201)).body as LearningSessionDto;
    await learner.post(`/api/v1/learning-sessions/${reviewSession.id}/start`).expect(200);
    for(const activityId of reviewSession.plan.blocks.flatMap(block=>block.activityIds)){
      const activity=firstSnapshot.activities.find(item=>item.id===activityId)!;
      const response=activity.activityType==='reading'||activity.activityType==='listening'?{answerIndexes:activity.payload.questions.map(q=>q.answerIndex)}:{text:'Hello. I work with my team.'};
      await learner.post(`/api/v1/activities/${activityId}/attempts`).send({clientAttemptId:randomUUID(),sessionId:reviewSession.id,response}).expect(201);
    }
    const reviewed=(await learner.get(`${progressUrl}/reviews`).expect(200)).body.items.find((item:{lessonVersionId:string})=>item.lessonVersionId===first.lesson.lessonVersionId);
    expect(reviewed).toMatchObject({iteration:1,lastCompletedAt:expect.any(String)});
    expect(reviewed.events.map((event:{type:string})=>event.type)).toEqual(['SCHEDULED','COMPLETED']);
    expect(await database.job.count({where:{createdById:learnerId}})).toBe(jobsBefore);

    expect((await learner.get('/api/v1/me/curriculum-roadmap').expect(200)).body.items.every((item:{state:string})=>item.state==='completed')).toBe(true);
    const reentry=request.agent(app.getHttpServer());
    await reentry.post('/api/v1/auth/login').send({email,password:'a-secure-local-password'}).expect(200);
    expect((await reentry.get('/api/v1/me/program-context').expect(200)).body.activeProgram.slug).toBe('beginner');
    expect((await reentry.get(`${progressUrl}/progress`).expect(200)).body.completed).toBe(true);
    await outsider.get(`${progressUrl}/progress`).expect(404);
    expect((await database.learnerProgramEnrollment.findUniqueOrThrow({where:{id:enrollment.id}})).programVersionId).toBe(release.id);
  },300000);
});
