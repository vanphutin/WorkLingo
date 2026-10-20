import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { adminDashboardOverviewSchema, learnerDashboardAnalyticsSchema } from '@worklingo/contracts';
import { DashboardAnalyticsService } from '../../src/analytics/application/dashboard-analytics.service.js';
import { createLearningSessionTestContext, registerLearner, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('Dashboard analytics', () => {
  let context: LearningSessionTestContext;
  beforeAll(async () => { context = await createLearningSessionTestContext('dashboard_v2'); }, 60_000);
  beforeEach(async () => { await context.resetLearners(); });
  afterAll(async () => { await context?.close(); });

  it('enforces server-side authentication and separates learner and admin roles', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/me/dashboard').expect(401);
    await request(context.app.getHttpServer()).get('/api/v1/admin/analytics/overview').expect(401);
    const { agent, user } = await registerPendingLearner(context.app, { displayName: 'Admin', email: 'admin@example.test' });
    await agent.get('/api/v1/admin/analytics/overview').expect(403);
    await context.database.user.update({ where: { id: user.id }, data: { role: 'CONTENT_ADMIN' } });
    await agent.get('/api/v1/admin/analytics/overview').expect(200);
    await agent.get('/api/v1/me/dashboard').expect(403);
  });

  it('returns honest empty metrics for a pending learner and a zero-denominator overview', async () => {
    const { agent, user } = await registerPendingLearner(context.app, { displayName: 'New Learner', email: 'new@example.test' });
    const dashboard = learnerDashboardAnalyticsSchema.parse((await agent.get('/api/v1/me/dashboard').expect(200)).body);
    expect(dashboard).toMatchObject({ displayName: 'New Learner', activeProgramSlug: null, skills: [], accuracyTrend: [] });
    expect(dashboard.activity).toHaveLength(14);
    expect(dashboard.activity.every((day) => day.sessions === 0 && day.completedSessions === 0)).toBe(true);
    expect(dashboard.programs.every((program) => !program.enrolled && !program.active && program.currentLevelCode === null)).toBe(true);
    await context.database.user.update({ where: { id: user.id }, data: { role: 'SYSTEM_ADMIN' } });
    const overview = adminDashboardOverviewSchema.parse((await agent.get('/api/v1/admin/analytics/overview').expect(200)).body);
    expect(overview).toMatchObject({ totalLearners: 0, activeLearners7d: 0, programEnrollments: 0, sessionCompletionRate: null, recentActivity: [] });
  });

  it('scopes activity and valid evaluated scores to the authenticated learner and active program', async () => {
    const agent = await registerLearner(context.app, { displayName: 'Scoped Learner', email: 'scoped@example.test' });
    const other = await registerLearner(context.app, { displayName: 'Other Learner', email: 'other@example.test' });
    const session = (await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201)).body;
    const otherSession = (await other.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201)).body;
    await context.database.learningSession.updateMany({ where: { id: { in: [session.id, otherSession.id] } }, data: { status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() } });
    const own = await context.database.learningSession.findUniqueOrThrow({ where: { id: session.id } });
    const activity = await context.database.activity.findFirstOrThrow({ where: { lessonVersionId: own.lessonVersionId, activityType: 'reading' } });
    await context.database.activityAttempt.createMany({ data: [
      { learnerId: own.learnerId, sessionId: own.id, activityId: activity.id, clientAttemptId: randomUUID(), rawResponse: {}, evaluationStatus: 'EVALUATED', score: 0.8 },
      { learnerId: own.learnerId, sessionId: own.id, activityId: activity.id, clientAttemptId: randomUUID(), rawResponse: {}, evaluationStatus: 'EVALUATION_FAILED', score: 0.1 },
    ] });
    const path = await context.database.learningPath.create({ data: { programId: '10000000-0000-4000-8000-000000000004', slug: randomUUID(), name: 'Foreign' } });
    const level = await context.database.level.create({ data: { pathId: path.id, code: randomUUID(), name: 'Foreign', cefrReference: 'B1', order: 0 } });
    const mission = await context.database.mission.create({ data: { levelId: level.id, slug: randomUUID(), title: 'Foreign', objective: 'Foreign', order: 0 } });
    await context.database.learningSession.create({ data: { learnerId: own.learnerId, clientSessionId: randomUUID(), missionId: mission.id, lessonVersionId: own.lessonVersionId, durationMinutes: 60, planSnapshot: {}, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() } });
    const result = learnerDashboardAnalyticsSchema.parse((await agent.get('/api/v1/me/dashboard').expect(200)).body);
    expect(result.activeProgramSlug).toBe('intermediate');
    expect(result.activity.reduce((total, day) => total + day.sessions, 0)).toBe(1);
    expect(result.accuracyTrend).toEqual([{ dateKey: new Date().toISOString().slice(0, 10), averageScore: 0.8, samples: 1 }]);
    expect(result.skills).toEqual([{ skill: 'reading', averageScore: 0.8, samples: 1 }]);
    expect(result.programs.find((program) => program.slug === 'intermediate')).toMatchObject({ active: true, enrolled: true, currentLevelCode: 'FOUNDATION_1' });
    expect(result.programs.find((program) => program.slug === 'ielts')).toMatchObject({ active: false, enrolled: false, completedMissions: 0, completedLessons: 0 });
  });

  it('counts distinct active learners and excludes planned/placement sessions from completion rate', async () => {
    const agent = await registerLearner(context.app, { displayName: 'Learner', email: 'count@example.test' });
    const created = [];
    for (let index = 0; index < 3; index++) created.push((await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201)).body.id as string);
    await context.database.learningSession.update({ where: { id: created[0]! }, data: { status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() } });
    await context.database.learningSession.update({ where: { id: created[1]! }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
    const template = await context.database.learningSession.findUniqueOrThrow({ where: { id: created[0]! }, include: { mission: true } });
    const placement = await context.database.mission.create({ data: { levelId: template.mission.levelId, slug: randomUUID(), title: 'Placement only', objective: 'Placement', order: 999, purpose: 'PLACEMENT' } });
    await context.database.learningSession.create({ data: { learnerId: template.learnerId, clientSessionId: randomUUID(), missionId: placement.id, lessonVersionId: template.lessonVersionId, durationMinutes: 60, planSnapshot: {}, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() } });
    const { agent: admin, user } = await registerPendingLearner(context.app, { displayName: 'Admin', email: 'metrics-admin@example.test' });
    await context.database.user.update({ where: { id: user.id }, data: { role: 'CONTENT_ADMIN' } });
    const result = adminDashboardOverviewSchema.parse((await admin.get('/api/v1/admin/analytics/overview').expect(200)).body);
    expect(result).toMatchObject({ totalLearners: 1, activeLearners7d: 1, programEnrollments: 1, sessionCompletionRate: 0.5 });
    expect(result.programs.find((program) => program.slug === 'intermediate')).toMatchObject({ enrollments: 1, completedSessions: 1, totalSessions: 2 });
    expect(result.programs.find((program) => program.slug === 'intermediate')?.publishedMissions).toBeGreaterThan(0);
    expect(result.recentActivity).toHaveLength(2);
    expect(result.activity.reduce((total, day) => total + day.startedSessions, 0)).toBe(2);
    expect(result.activity.reduce((total, day) => total + day.completedSessions, 0)).toBe(1);
  });

  it('counts a published lesson once and requires completion evidence for the current mission revision', async () => {
    const agent = await registerLearner(context.app, { displayName: 'Progress Learner', email: 'completion@example.test' });
    const first = (await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201)).body;
    const second = (await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201)).body;
    const session = await context.database.learningSession.findUniqueOrThrow({ where: { id: first.id } });
    await context.database.learningSession.updateMany({ where: { id: { in: [first.id, second.id] } }, data: { status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() } });
    const legacy = learnerDashboardAnalyticsSchema.parse((await agent.get('/api/v1/me/dashboard').expect(200)).body);
    expect(legacy.programs.find((program) => program.active)).toMatchObject({ completedLessons: 1, totalLessons: 1 });
    const oldRevision = await context.database.curriculumRevision.create({ data: { missionId: session.missionId, revision: 901, snapshot: {}, status: 'PUBLISHED', lessons: { create: { lessonVersionId: session.lessonVersionId, order: 1 } } } });
    const currentRevision = await context.database.curriculumRevision.create({ data: { missionId: session.missionId, revision: 902, snapshot: {}, status: 'PUBLISHED', lessons: { create: { lessonVersionId: session.lessonVersionId, order: 1 } } } });
    const enrollment = await context.database.learnerProgramEnrollment.findFirstOrThrow({ where: { learnerId: session.learnerId } });
    await context.database.curriculumCompletion.create({ data: { enrollmentId: enrollment.id, curriculumRevisionId: oldRevision.id, policyVersion: 'test', evidenceSnapshot: {} } });
    const before = learnerDashboardAnalyticsSchema.parse((await agent.get('/api/v1/me/dashboard').expect(200)).body);
    expect(before.programs.find((program) => program.active)).toMatchObject({ completedLessons: 1, totalLessons: 1, totalMissions: 1, completedMissions: 0 });
    await context.database.curriculumCompletion.create({ data: { enrollmentId: enrollment.id, curriculumRevisionId: currentRevision.id, policyVersion: 'test', evidenceSnapshot: {} } });
    const after = learnerDashboardAnalyticsSchema.parse((await agent.get('/api/v1/me/dashboard').expect(200)).body);
    expect(after.programs.find((program) => program.active)).toMatchObject({ completedLessons: 1, totalMissions: 1, completedMissions: 1 });
  });

  it('uses UTC event dates within a bounded window and omits scores outside that window', async () => {
    const agent = await registerLearner(context.app, { displayName: 'Dated Learner', email: 'date@example.test' });
    const session = (await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201)).body;
    const stored = await context.database.learningSession.findUniqueOrThrow({ where: { id: session.id } });
    await context.database.learningSession.update({ where: { id: stored.id }, data: {
      status: 'COMPLETED', startedAt: new Date('2026-10-14T23:59:00Z'), completedAt: new Date('2026-10-15T00:01:00Z'),
    } });
    const activity = await context.database.activity.findFirstOrThrow({ where: { lessonVersionId: stored.lessonVersionId } });
    await context.database.activityAttempt.create({ data: {
      learnerId: stored.learnerId, sessionId: stored.id, activityId: activity.id, clientAttemptId: randomUUID(),
      rawResponse: {}, evaluationStatus: 'EVALUATED', score: 0.7, createdAt: new Date('2026-10-01T23:59:59Z'),
    } });
    const result = await context.app.get(DashboardAnalyticsService).learner(stored.learnerId, new Date('2026-10-15T12:00:00Z'));
    expect(result.activity[0]?.dateKey).toBe('2026-10-02');
    expect(result.activity.find((day) => day.dateKey === '2026-10-14')).toMatchObject({ sessions: 1, completedSessions: 0 });
    expect(result.activity.find((day) => day.dateKey === '2026-10-15')).toMatchObject({ sessions: 0, completedSessions: 1 });
    expect(result.accuracyTrend).toEqual([]);
    expect(result.skills).toEqual([]);
  });
});
