import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import {
  createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('locale preferences API', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('locale_preferences');
  }, 45_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('uses a migrated isolated schema', async () => {
    const rows = await context.database.$queryRaw<{ schema: string }[]>`SELECT current_schema() AS schema`;
    expect(rows[0]?.schema).toBe(context.schemaName);
    expect(context.schemaName).toMatch(/^locale_preferences_[0-9a-f]{32}$/u);
  });
  it('rejects stale account-bound saves after a different account signs in on the same browser', async () => {
    const first = await registerPendingLearner(context.app, { displayName: 'First Account', email: 'first-tab@example.test' });
    const second = await registerPendingLearner(context.app, { displayName: 'Second Account', email: 'second-tab@example.test' });
    await second.agent.patch('/api/v1/me/preferences').set('x-worklingo-account-id', first.user.id).send({ locale: 'en' }).expect(409);
    await second.agent.get('/api/v1/me/preferences').expect(200, { locale: 'vi' });
    await first.agent.get('/api/v1/me/preferences').expect(200, { locale: 'vi' });
  });

  it('defaults old registration clients to vi and persists only the current account', async () => {
    const first = await registerPendingLearner(context.app, { displayName: 'First Learner', email: 'first@example.test' });
    const second = await registerPendingLearner(context.app, { displayName: 'Second Learner', email: 'second@example.test' });
    await first.agent.get('/api/v1/me/preferences').expect(200, { locale: 'vi' });
    await first.agent.get('/api/v1/me').expect(200).expect(({ body }) => expect(body.locale).toBe('vi'));
    await first.agent.patch('/api/v1/me/preferences').send({ locale: 'en' }).expect(200, { locale: 'en' });
    await first.agent.get('/api/v1/me/preferences').expect(200, { locale: 'en' });
    await first.agent.get('/api/v1/me').expect(200).expect(({ body }) => expect(body.locale).toBe('en'));
    await second.agent.get('/api/v1/me/preferences').expect(200, { locale: 'vi' });
    await expect(context.database.learnerProfile.findUniqueOrThrow({ where: { userId: second.user.id } }))
      .resolves.toMatchObject({ locale: 'vi' });
    const returning = request.agent(context.app.getHttpServer());
    await returning.post('/api/v1/auth/login').send({ email: 'first@example.test', password: 'a-secure-local-password' })
      .expect(200).expect(({ body }) => expect(body.locale).toBe('en'));
    await first.agent.patch('/api/v1/me/preferences').send({ locale: 'vi' }).expect(200, { locale: 'vi' });
  });

  it('persists an explicitly selected registration locale', async () => {
    const agent = request.agent(context.app.getHttpServer());
    const response = await agent.post('/api/v1/auth/register').send({
      displayName: 'English Learner', email: 'english@example.test', password: 'a-secure-local-password', locale: 'en',
    }).expect(201);
    expect(response.body.locale).toBe('en');
    await agent.get('/api/v1/me/preferences').expect(200, { locale: 'en' });
    await expect(context.database.learnerProfile.findUniqueOrThrow({ where: { userId: response.body.id } }))
      .resolves.toMatchObject({ locale: 'en' });
  });

  it.each(['en-US', '', null, 1])('rejects invalid registration locale %s without creating an account', async (locale) => {
    await request(context.app.getHttpServer()).post('/api/v1/auth/register').send({
      displayName: 'Invalid Learner', email: 'invalid@example.test', password: 'a-secure-local-password', locale,
    }).expect(400);
    await expect(context.database.user.count()).resolves.toBe(0);
  });

  it.each([{ locale: 'en-US' }, { locale: '' }, { locale: null }, { locale: 1 }, {}, { locale: 'en', userId: 'someone-else' }])(
    'rejects invalid or owner-supplied input %j without changing preferences', async (body) => {
      const learner = await registerPendingLearner(context.app, { displayName: 'Strict Learner', email: 'strict@example.test' });
      await learner.agent.patch('/api/v1/me/preferences').send(body).expect(400);
      await learner.agent.get('/api/v1/me/preferences').expect(200, { locale: 'vi' });
    });

  it('rejects missing, invalid and revoked authentication', async () => {
    for (const cookie of ['', 'worklingo_session=invalid']) {
      await request(context.app.getHttpServer()).get('/api/v1/me/preferences').set('Cookie', cookie).expect(401);
      await request(context.app.getHttpServer()).patch('/api/v1/me/preferences').set('Cookie', cookie)
        .send({ locale: 'en' }).expect(401);
    }
    const learner = await registerPendingLearner(context.app, { displayName: 'Revoked Learner', email: 'revoked@example.test' });
    await context.database.userSession.updateMany({ where: { userId: learner.user.id }, data: { revokedAt: new Date() } });
    await learner.agent.patch('/api/v1/me/preferences').send({ locale: 'en' }).expect(401);
    await expect(context.database.learnerProfile.findUniqueOrThrow({ where: { userId: learner.user.id } }))
      .resolves.toMatchObject({ locale: 'vi' });
  });

  it('changes locale without changing learner progress, settings or sessions', async () => {
    const learner = await registerPendingLearner(context.app, { displayName: 'Progress Learner', email: 'progress@example.test' });
    await learner.agent.post('/api/v1/me/onboarding/self-placement').send({
      clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1',
    }).expect(200);
    const session = await learner.agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 45,
    }).expect(201);
    await learner.agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
    const profile = await context.database.learnerProfile.update({
      where: { userId: learner.user.id },
      data: {
        currentLevelCode: 'FOUNDATION_2', onboardingStatus: 'COMPLETE', onboardingMethod: 'SELF_SELECTED',
        onboardedAt: new Date('2026-10-01T10:00:00Z'), weeklyTargetDays: 5, timezone: 'UTC',
        recordingConsent: true, audioSourceId: 'browser-tts', browserVoiceId: 'english-voice',
      },
    });
    const sessions = await context.database.userSession.findMany({ where: { userId: learner.user.id } });
    const enrollments = await context.database.learnerProgramEnrollment.findMany({ where: { learnerId: learner.user.id } });
    const learningSessions = await context.database.learningSession.findMany({ where: { learnerId: learner.user.id } });
    expect(enrollments).toHaveLength(1);
    expect(learningSessions).toHaveLength(1);
    await learner.agent.patch('/api/v1/me/preferences').send({ locale: 'en' }).expect(200);
    const { locale, updatedAt, ...after } = await context.database.learnerProfile.findUniqueOrThrow({ where: { userId: learner.user.id } });
    const { locale: previousLocale, updatedAt: previousUpdate, ...before } = profile;
    expect(locale).toBe('en');
    expect(previousLocale).toBe('vi');
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdate.getTime());
    expect(after).toEqual(before);
    await expect(context.database.userSession.findMany({ where: { userId: learner.user.id } })).resolves.toEqual(sessions);
    await expect(context.database.learnerProgramEnrollment.findMany({ where: { learnerId: learner.user.id } })).resolves.toEqual(enrollments);
    await expect(context.database.learningSession.findMany({ where: { learnerId: learner.user.id } })).resolves.toEqual(learningSessions);
  });

  it.each(['LEARNER', 'CONTENT_ADMIN', 'SYSTEM_ADMIN'] as const)(
    'reads %s without a profile without mutation and lazily creates only a profile on update', async (role) => {
      const email = 'no-profile@example.test';
      const password = 'a-secure-local-password';
      const user = await seedContentAdmin(context.database, { displayName: 'No Profile', email, password });
      await context.database.user.update({ where: { id: user.id }, data: { role } });
      const agent = request.agent(context.app.getHttpServer());
      await agent.post('/api/v1/auth/login').send({ email, password }).expect(200)
        .expect(({ body }) => expect(body).toMatchObject({ locale: 'vi', roles: [role] }));
      await agent.get('/api/v1/me/preferences').expect(200, { locale: 'vi' });
      await expect(context.database.learnerProfile.findUnique({ where: { userId: user.id } })).resolves.toBeNull();
      await agent.patch('/api/v1/me/preferences').send({ locale: 'en', userId: user.id }).expect(400);
      await expect(context.database.learnerProfile.count()).resolves.toBe(0);
      await agent.patch('/api/v1/me/preferences').send({ locale: 'en' }).expect(200, { locale: 'en' });
      await agent.get('/api/v1/me').expect(200).expect(({ body }) => expect(body).toMatchObject({
        locale: 'en', roles: [role], onboardingStatus: role === 'LEARNER' ? 'PENDING' : null,
      }));
      await expect(context.database.learnerProfile.findUniqueOrThrow({ where: { userId: user.id } })).resolves.toMatchObject({
        locale: 'en', currentLevelCode: 'FOUNDATION_1', onboardingStatus: 'PENDING', activeProgramId: null,
      });
      await expect(context.database.learnerProgramEnrollment.count()).resolves.toBe(0);
      await expect(context.database.learningSession.count()).resolves.toBe(0);
      await expect(context.database.masteryRecord.count()).resolves.toBe(0);
      await expect(context.database.progressionConfirmation.count()).resolves.toBe(0);
      await expect(context.database.userSession.count()).resolves.toBe(1);
    });

  it('returns vi for unsupported legacy stored locales without repairing the profile on read', async () => {
    const learner = await registerPendingLearner(context.app, { displayName: 'Legacy Learner', email: 'legacy@example.test' });
    await context.database.learnerProfile.update({ where: { userId: learner.user.id }, data: { locale: 'en-US' } });
    await learner.agent.get('/api/v1/me/preferences').expect(200, { locale: 'vi' });
    await learner.agent.get('/api/v1/me').expect(200).expect(({ body }) => expect(body.locale).toBe('vi'));
    await expect(context.database.learnerProfile.findUniqueOrThrow({ where: { userId: learner.user.id } }))
      .resolves.toMatchObject({ locale: 'en-US' });
  });
});
