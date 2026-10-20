import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';
import { MockAttemptClock } from '../../src/ielts-mock/application/mock-attempt-clock.js';
import { TestClock } from '../../src/mastery/domain/clock.port.js';

describe('Two mock modes and preserved legacy attempts', () => {
  let context: LearningSessionTestContext;
  const time = new TestClock(new Date('2026-10-15T12:00:00Z'));
  beforeAll(async () => { context = await createLearningSessionTestContext('ielts_mock_modes'); context.app.get(ConfigService).set('ieltsFlow', 'v3'); await context.database.learningProgram.update({ where: { slug: 'ielts' }, data: { availabilityStatus: 'BETA' } }); vi.spyOn(context.app.get(MockAttemptClock), 'now').mockImplementation(() => time.now()); }, 60_000);
  afterAll(async () => { vi.restoreAllMocks(); await context?.close(); });
  it('pins policies, pauses practice idempotently, protects feedback and expires strict sections only once', async () => {
    const db = context.database;
    const learner = await registerPendingLearner(context.app, { displayName: 'Mock learner', email: `${randomUUID()}@test.local` });
    await learner.agent.post('/api/v1/me/onboarding/self-placement').send({ clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' }).expect(200);
    const v1 = INITIAL_IELTS_ACADEMIC_MOCK;
    const v2 = { ...v1, schemaVersion: 2, allowedModes: ['PRACTICE', 'EXAM_SIMULATION'], qualification: { reviewedBy: 'Isolated test fixture author', reviewedAt: time.now().toISOString(), evidenceRevision: 'test-policy-fixture', qualifiedModes: ['PRACTICE', 'EXAM_SIMULATION'] } };
    const mock = await db.ieltsMockTest.create({ data: { slug: 'mode-fixture', status: 'PUBLISHED', draftContent: v2 as unknown as Prisma.InputJsonValue } });
    const version = await db.ieltsMockTestVersion.create({ data: { mockTestId: mock.id, version: 1, sourceHash: randomUUID(), content: v2 as unknown as Prisma.InputJsonValue } });
    await db.ieltsMockTest.update({ where: { id: mock.id }, data: { currentPublishedVersionId: version.id } });
    const input = { clientAttemptId: randomUUID(), mockTestId: mock.id, mode: 'PRACTICE' };
    await learner.agent.post('/api/v1/me/ielts-mocks/attempts').send({ ...input, policyVersion: 'legacy-v1' }).expect(400);
    await learner.agent.post('/api/v1/me/ielts-mocks/attempts').send({ ...input, mode: 'LEARNING' }).expect(422);
    const practice = await learner.agent.post('/api/v1/me/ielts-mocks/attempts').send(input).expect(200);
    expect(practice.body.policyVersion).toBe('v2');
    const question = v1.listening.parts[0]!.questions[0]!;
    const saved = await learner.agent.put(`/api/v1/me/ielts-mocks/attempts/${practice.body.id}/responses`).send({ expectedRevision: practice.body.revision, responses: { [question.id]: question.answerPolicy.acceptedAnswers[0] } }).expect(200);
    time.advance(20_000);
    const pauseInput = { expectedRevision: saved.body.revision, clientOperationId: randomUUID() };
    const pause = await learner.agent.post(`/api/v1/me/ielts-mocks/attempts/${practice.body.id}/pause`).send(pauseInput).expect(200);
    expect(pause.body.elapsedMs).toBe(20_000);
    time.advance(60 * 60_000);
    const paused = await learner.agent.get(`/api/v1/me/ielts-mock-attempts/${practice.body.id}`).expect(200);
    expect(paused.body.elapsedMs).toBe(20_000); expect(paused.body.currentSection).toBe('LISTENING');
    expect((await learner.agent.post(`/api/v1/me/ielts-mocks/attempts/${practice.body.id}/pause`).send(pauseInput).expect(200)).body).toEqual(pause.body);
    const resumeInput = { expectedRevision: paused.body.revision, clientOperationId: randomUUID() };
    const resumed = await learner.agent.post(`/api/v1/me/ielts-mock-attempts/${practice.body.id}/resume`).send(resumeInput).expect(200);
    time.advance(2000);
    expect((await learner.agent.post(`/api/v1/me/ielts-mock-attempts/${practice.body.id}/resume`).send(resumeInput).expect(200)).body).toEqual(resumed.body);
    expect(resumed.body.responses[question.id]).toBe(question.answerPolicy.acceptedAnswers[0]);
    await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${practice.body.id}/sections/LISTENING/review`).expect(409);
    await learner.agent.post(`/api/v1/me/ielts-mocks/attempts/${practice.body.id}/sections/LISTENING/submit`).send({ expectedRevision: resumed.body.revision }).expect(200);
    const review = await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${practice.body.id}/sections/LISTENING/review`).expect(200);
    expect(review.body.questions[0].acceptedAnswers).toEqual(question.answerPolicy.acceptedAnswers);
    await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${practice.body.id}/sections/READING/review`).expect(409);
    const strict = await learner.agent.post('/api/v1/me/ielts-mock-attempts').send({ ...input, clientAttemptId: randomUUID(), mode: 'EXAM_SIMULATION' }).expect(200);
    await learner.agent.post(`/api/v1/me/ielts-mocks/attempts/${strict.body.id}/pause`).send({ expectedRevision: strict.body.revision, clientOperationId: randomUUID() }).expect(409);
    await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${strict.body.id}/sections/LISTENING/review`).expect(409);
    const deadline = strict.body.sectionDeadlineAt;
    expect((await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${strict.body.id}`).expect(200)).body.sectionDeadlineAt).toBe(deadline);
    const strictSaved = await learner.agent.put(`/api/v1/me/ielts-mocks/attempts/${strict.body.id}/responses`).send({ expectedRevision: 1, responses: { [question.id]: question.answerPolicy.acceptedAnswers[0] } }).expect(200);
    time.setTime(new Date(deadline));
    const concurrent = await Promise.all([
      learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${strict.body.id}`),
      learner.agent.get(`/api/v1/me/ielts-mock-attempts/${strict.body.id}`),
      learner.agent.put(`/api/v1/me/ielts-mocks/attempts/${strict.body.id}/responses`).send({ expectedRevision: strictSaved.body.revision, responses: { [question.id]: 'too late' } }),
      learner.agent.post(`/api/v1/me/ielts-mocks/attempts/${strict.body.id}/sections/LISTENING/submit`).send({ expectedRevision: strictSaved.body.revision }),
    ]);
    expect(concurrent.slice(0, 2).every(response => response.status === 200)).toBe(true);
    expect(concurrent.slice(0, 2).map(response => response.body.currentSection)).toEqual(['READING', 'READING']);
    expect(concurrent[2]!.status).toBe(409);
    expect([200, 409]).toContain(concurrent[3]!.status);
    const strictRow = await db.ieltsMockAttempt.findUniqueOrThrow({ where: { id: strict.body.id } });
    expect(strictRow.submittedSections).toEqual(['LISTENING']); expect(strictRow.revision).toBe(3);
    expect(strictRow.responses).toEqual({ [question.id]: question.answerPolicy.acceptedAnswers[0] });
    expect(strictRow.objectiveScore).toMatchObject({ listening: { rawScore: 1 } });
    const legacyVersion = await db.ieltsMockTestVersion.create({ data: { mockTestId: mock.id, version: 2, sourceHash: randomUUID(), status: 'ARCHIVED', content: v1 as unknown as Prisma.InputJsonValue } });
    const legacyDeadline = new Date(Date.now() + 60 * 60_000);
    const legacyAttempt = await db.ieltsMockAttempt.create({ data: { learnerId: learner.user.id, clientAttemptId: randomUUID(), mockTestVersionId: legacyVersion.id, mode: 'LEARNING', sectionDeadlineAt: legacyDeadline, responses: { [question.id]: 'legacy answer' } } });
    const legacyRead = await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${legacyAttempt.id}`).expect(200);
    expect(legacyRead.body).toMatchObject({ policyVersion: 'legacy-v1', mode: 'LEARNING', sectionDeadlineAt: legacyDeadline.toISOString(), responses: { [question.id]: 'legacy answer' } });
    await learner.agent.put(`/api/v1/me/ielts-mocks/attempts/${strict.body.id}/responses`).send({ expectedRevision: 1, responses: { [question.id]: 'late' } }).expect(409);
    context.app.get(ConfigService).set('ieltsFlow', 'legacy');
    expect((await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${legacyAttempt.id}`).expect(200)).body).toEqual(legacyRead.body);
    expect((await learner.agent.get(`/api/v1/me/ielts-mocks/attempts/${practice.body.id}`).expect(200)).body.policyVersion).toBe('v2');
    await learner.agent.post('/api/v1/me/ielts-mocks/attempts').send({ ...input, clientAttemptId: randomUUID() }).expect(409);
  });
});
