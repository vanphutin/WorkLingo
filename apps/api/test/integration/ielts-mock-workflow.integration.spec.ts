import { randomUUID } from 'node:crypto';
import { INITIAL_IELTS_ACADEMIC_MOCK, INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

describe('IELTS full mock HTTP workflow', () => {
  let context: LearningSessionTestContext; let admin: ReturnType<typeof request.agent>; let learner: ReturnType<typeof request.agent>; let learnerId: string; let mockId: string; let firstVersionId: string;
  beforeAll(async () => {
    context = await createLearningSessionTestContext('ielts_mock_workflow');
    const adminEmail = `mock-admin-${randomUUID()}@test.local`; const password = 'AdminSecret123!';
    await seedContentAdmin(context.database, { displayName: 'Mock Reviewer', email: adminEmail, password }); admin = request.agent(context.app.getHttpServer()); await admin.post('/api/v1/auth/login').send({ email: adminEmail, password }).expect(200);
    const registration = await registerPendingLearner(context.app, { displayName: 'Mock Learner', email: `mock-${randomUUID()}@test.local` }); learner = registration.agent; learnerId = registration.user.id;
    const curriculum = await context.database.ieltsBandCurriculum.create({ data: { slug: `mock-path-${randomUUID()}`, draftContent: INITIAL_IELTS_BAND_CURRICULUM } });
    const curriculumVersion = await context.database.ieltsBandCurriculumVersion.create({ data: { curriculumId: curriculum.id, version: 1, sourceHash: 'test-band', content: INITIAL_IELTS_BAND_CURRICULUM } });
    await context.database.ieltsBandJourney.create({ data: { learnerId, clientJourneyId: randomUUID(), curriculumVersionId: curriculumVersion.id, currentStageCode: INITIAL_IELTS_BAND_CURRICULUM.stages[0]!.code, targetBand: 7 } });
    const audioIds = Array.from({ length: 4 }, () => randomUUID()); const content = { ...INITIAL_IELTS_ACADEMIC_MOCK, listening: { ...INITIAL_IELTS_ACADEMIC_MOCK.listening, parts: INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map((part, index) => ({ ...part, audioAssetId: audioIds[index]! })) } };
    const mock = await context.database.ieltsMockTest.create({ data: { slug: `academic-mock-${randomUUID()}`, status: 'PUBLISHED', draftContent: content } }); mockId = mock.id;
    const version = await context.database.ieltsMockTestVersion.create({ data: { mockTestId: mock.id, version: 1, sourceHash: 'mock-v1', content } }); firstVersionId = version.id;
    await context.database.ieltsMockTest.update({ where: { id: mock.id }, data: { currentPublishedVersionId: version.id } });
  }, 60_000);
  afterAll(async () => context?.close());

  it('pins a version, submits four sections, waits for review, then produces a completed report', async () => {
    const started = await learner.post('/api/v1/me/ielts-mock-attempts').send({ clientAttemptId: randomUUID(), mockTestId: mockId, mode: 'EXAM_SIMULATION' }).expect(200);
    expect(started.body).toMatchObject({ mockTestVersionId: firstVersionId, currentSection: 'LISTENING', revision: 1 });
    expect(started.body.sectionContent.reading).toEqual([]); expect(started.body.sectionContent.listening[0].questions[0]).not.toHaveProperty('answerPolicy');
    let attempt = started.body as { id: string; revision: number; currentSection: string; mockTestVersionId: string };
    for (const section of ['LISTENING', 'READING', 'WRITING', 'SPEAKING']) {
      const submitted = await learner.post(`/api/v1/me/ielts-mock-attempts/${attempt.id}/sections/${section}/submit`).send({ expectedRevision: attempt.revision }).expect(200); attempt = submitted.body;
    }
    expect(attempt.currentSection).toBe('COMPLETE');
    const pending = await learner.get(`/api/v1/me/ielts-mock-attempts/${attempt.id}/report`).expect(200); expect(pending.body).toMatchObject({ status: 'EVALUATION_PENDING', overallMockBand: null });
    const version2 = await context.database.ieltsMockTestVersion.create({ data: { mockTestId: mockId, version: 2, sourceHash: 'mock-v2', content: INITIAL_IELTS_ACADEMIC_MOCK } }); await context.database.ieltsMockTest.update({ where: { id: mockId }, data: { currentPublishedVersionId: version2.id } });
    const resumed = await learner.get(`/api/v1/me/ielts-mock-attempts/${attempt.id}`).expect(200); expect(resumed.body.mockTestVersionId).toBe(firstVersionId);
    const reviewed = await admin.post(`/api/v1/admin/ielts-mock-attempts/${attempt.id}/reviews`).send({ expectedRevision: attempt.revision, idempotencyKey: randomUUID(), writingTask1: [6, 6, 6, 6], writingTask2: [7, 7, 7, 7], speaking: [6.5, 6.5, 6.5, 6.5], strengths: ['Clear organization'], gaps: ['Lexical precision'], nextActions: ['Practise paraphrasing'] }).expect(201);
    expect(reviewed.body).toMatchObject({ status: 'COMPLETED', overallMockBand: 3.5, scoringPolicyVersion: 1 });
    const report = await learner.get(`/api/v1/me/ielts-mock-attempts/${attempt.id}/report`).expect(200); expect(report.body).toEqual(reviewed.body);
  });
});
