import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { CurriculumDefinitionInput } from '@worklingo/contracts';
import type { LearningSessionDto } from '../../src/learning-sessions/application/learning-session.types.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { CurriculumProgressService } from '../../src/curriculum-foundation/application/curriculum-progress.service.js';
import { createLearningSessionTestContext, registerLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('R2 actual Admin to Learner progression', () => {
  let context: LearningSessionTestContext;
  beforeAll(async () => { context = await createLearningSessionTestContext('r2_vertical'); }, 60_000);
  afterAll(async () => { await context?.close(); });

  it('publishes two lessons, enrolls, completes without AI mastery, unlocks and resumes immutable pins', async () => {
    const suffix = randomUUID();
    const adminEmail = `admin-${suffix}@example.test`;
    await seedContentAdmin(context.database, { email: adminEmail, password: 'R2-Isolated-Admin-123!' });
    const admin = request.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send({ email: adminEmail, password: 'R2-Isolated-Admin-123!' }).expect(200);
    const learnerEmail = `learner-${suffix}@example.test`;
    const learner = await registerLearner(context.app, { displayName: 'Synthetic R2 learner', email: learnerEmail });
    const learnerRow = await context.database.user.findUniqueOrThrow({ where: { email: learnerEmail } });
    const metadata = { slug: `r2-${suffix}`, name: 'Local progression course', description: 'Two source-bound lessons', learningGoal: 'Complete and resume a curriculum', proficiencyLabel: 'Practice', iconKey: 'intermediate', displayOrder: 100 };
    await learner.post('/api/v1/admin/learning-programs').send({ ...metadata, idempotencyKey: randomUUID() }).expect(403);
    const created = await admin.post('/api/v1/admin/learning-programs').send({ ...metadata, idempotencyKey: randomUUID() }).expect(201);
    const programId = created.body.id as string;
    const path = await admin.post('/api/v1/admin/curriculum/paths').send({ programId, name: 'R2 local path', slug: `path-${suffix}`, idempotencyKey: randomUUID() }).expect(201);
    const level = await admin.post('/api/v1/admin/curriculum/levels').send({ pathId: path.body.id, code: `R2_${suffix.replaceAll('-', '_').toUpperCase()}`, name: 'R2 start', cefrReference: 'A1', idempotencyKey: randomUUID() }).expect(201);
    const version = await context.database.lessonVersion.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
    const snapshot = lessonSnapshotSchema.parse(version.parsedContent);
    const evidenceActivities = ['reading', 'listening', 'speaking', 'writing'].map(skill => snapshot.activities.find(activity => activity.activityType === skill && activity.learningBlock !== 'activate')!);
    expect(evidenceActivities.every(Boolean)).toBe(true);
    const missions: string[] = [];
    const revisionIds: string[] = [];
    const definition = (prerequisiteRevisionIds: string[]): CurriculumDefinitionInput => ({
      category: 'grammar', prerequisiteRevisionIds,
      objectives: evidenceActivities.map(activity => ({ slug: `complete-${activity.activityType}`, statement: `Complete ${activity.activityType} evidence`, skills: [activity.activityType], required: true,
        evidence: [{ lessonVersionId: version.id, activitySlug: activity.slug, languageBlockSlugs: [] }] })),
    });
    for (const order of [1, 2]) {
      const mission = await admin.post('/api/v1/admin/curriculum/missions').send({ levelId: level.body.id, slug: `r2-m${order}-${suffix}`, title: `R2 Lesson ${order}`, objective: 'Practice all four skills', purpose: 'LEARNING', order, idempotencyKey: randomUUID() }).expect(201);
      const id = mission.body.id as string;
      missions.push(id);
      const attached = await admin.put(`/api/v1/admin/curriculum/missions/${id}/lessons`).send({ lessonIds: [version.lessonId], expectedRevision: mission.body.revision, idempotencyKey: randomUUID() }).expect(200);
      await admin.post(`/api/v1/admin/curriculum/missions/${id}/publish`).send({ expectedRevision: attached.body.revision, idempotencyKey: randomUUID() }).expect(200);
      await admin.put(`/api/v1/admin/curriculum/missions/${id}/foundation`).send({ definition: definition(order === 2 ? [revisionIds[0]!] : []), expectedRevision: null, idempotencyKey: randomUUID() }).expect(200);
      await admin.post(`/api/v1/admin/curriculum/missions/${id}/foundation/validate`).send({ expectedRevision: 1, idempotencyKey: randomUUID() }).expect(200);
      const published = await admin.post(`/api/v1/admin/curriculum/missions/${id}/foundation/publish`).send({ expectedRevision: 1, idempotencyKey: randomUUID() }).expect(200);
      revisionIds.push(published.body.id as string);
    }
    await admin.post(`/api/v1/admin/curriculum/levels/${level.body.id}/publish`).send({ expectedRevision: level.body.revision, idempotencyKey: randomUUID() }).expect(200);
    await admin.post(`/api/v1/admin/curriculum/paths/${path.body.id}/publish`).send({ expectedRevision: path.body.revision, idempotencyKey: randomUUID() }).expect(200);
    await admin.post(`/api/v1/admin/learning-programs/${programId}/publish`).send({ curriculumRevisionIds: revisionIds, expectedRevision: created.body.revision, idempotencyKey: randomUUID() }).expect(200);
    const catalog = await learner.get('/api/v1/learning-programs').expect(200);
    expect(catalog.body.programs.find((row: { slug: string }) => row.slug === metadata.slug)).toMatchObject({ isSelectable: true, destination: '/dashboard' });
    const current = await learner.get('/api/v1/me/program-context').expect(200);
    const enrollmentInput = { programSlug: metadata.slug, expectedRevision: current.body.enrollment.revision };
    const enrollments = await Promise.all([learner.post('/api/v1/me/program-enrollments').send(enrollmentInput), learner.post('/api/v1/me/program-enrollments').send(enrollmentInput)]);
    expect(enrollments.map(response => response.status)).toEqual([200, 200]);
    expect(enrollments[0]!.body.enrollment.id).toBe(enrollments[1]!.body.enrollment.id);
    const enrollmentId = enrollments[0]!.body.enrollment.id as string;
    expect(await context.database.learnerProgramEnrollment.count({ where: { learnerId: learnerRow.id, programId } })).toBe(1);
    expect((await context.database.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: enrollmentId } })).curriculumRevisionIds).toEqual(revisionIds);
    const initialRoadmap = await learner.get('/api/v1/me/curriculum-roadmap').expect(200);
    expect(initialRoadmap.body.items.map((item: { state: string }) => item.state)).toEqual(['available', 'locked']);
    const target = { missionId: missions[0], expectedCurriculumRevisionId: revisionIds[0], durationMinutes: 45, clientSessionId: randomUUID() };
    await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, missionId: missions[1], expectedCurriculumRevisionId: revisionIds[1] }).expect(422);
    await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, expectedCurriculumRevisionId: randomUUID() }).expect(409);
    const starts = await Promise.all([learner.post('/api/v1/learning-sessions/curriculum').send(target), learner.post('/api/v1/learning-sessions/curriculum').send(target)]);
    expect(starts.map(response => response.status)).toEqual([201, 201]);
    expect(starts[0]!.body.id).toBe(starts[1]!.body.id);
    const session = starts[0]!.body as LearningSessionDto;
    expect(session.lessonVersionId).toBe(version.id);
    await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, missionId: missions[1], expectedCurriculumRevisionId: revisionIds[1] }).expect(409);
    await learner.post(`/api/v1/learning-sessions/${session.id}/start`).expect(200);
    const attemptIds: string[] = [];
    for (const activityId of session.plan.blocks.flatMap(block => block.activityIds)) {
      const activity = snapshot.activities.find(row => row.id === activityId)!;
      const response = activity.activityType === 'reading' || activity.activityType === 'listening'
        ? { answerIndexes: activity.payload.questions.map(question => question.answerIndex) }
        : { text: 'Hello. My name is An. I work in sales. Nice to meet you.' };
      const attempt = { clientAttemptId: randomUUID(), sessionId: session.id, response };
      const submitted = await learner.post(`/api/v1/activities/${activityId}/attempts`).send(attempt).expect(201);
      attemptIds.push(submitted.body.id as string);
      const replay = await learner.post(`/api/v1/activities/${activityId}/attempts`).send(attempt).expect(201);
      expect(replay.body.id).toBe(submitted.body.id);
    }
    expect((await learner.get(`/api/v1/learning-sessions/${session.id}`).expect(200)).body.status).toBe('completed');
    const progress = context.app.get(CurriculumProgressService);
    await Promise.all([progress.projectSession(session.id), progress.projectSession(session.id)]);
    const completions = await context.database.curriculumCompletion.findMany({ where: { enrollmentId } });
    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({ curriculumRevisionId: revisionIds[0], policyVersion: 'curriculum-activity-completion-v1' });
    const writing = await context.database.activityAttempt.findMany({ where: { sessionId: session.id, activity: { activityType: 'writing' } } });
    expect(writing.length).toBeGreaterThan(0);
    expect(writing.every(attempt => attempt.score === null && attempt.evaluationStatus === 'QUEUED')).toBe(true);
    expect(await context.database.masteryEvent.count({ where: { learnerId: learnerRow.id, skill: { in: ['writing', 'speaking'] } } })).toBe(0);
    const after = await learner.get('/api/v1/me/curriculum-roadmap').expect(200);
    expect(after.body.items.map((item: { state: string }) => item.state)).toEqual(['completed', 'available']);
    expect(after.body.items[0].objectives.every((objective: { completed: boolean }) => objective.completed)).toBe(true);
    const next = await learner.post('/api/v1/learning-sessions/curriculum').send({ missionId: missions[1], expectedCurriculumRevisionId: revisionIds[1], durationMinutes: 45, clientSessionId: randomUUID() }).expect(201);
    await learner.post(`/api/v1/learning-sessions/${next.body.id}/start`).expect(200);
    await learner.post(`/api/v1/learning-sessions/${next.body.id}/pause`).expect(200);
    expect((await learner.get('/api/v1/me/curriculum-roadmap').expect(200)).body.items[1]).toMatchObject({ state: 'in_progress', activeSessionId: next.body.id });
    await learner.post(`/api/v1/learning-sessions/${next.body.id}/resume`).expect(200);
    await learner.get('/api/v1/me/dashboard/overview').expect(200);
    // A later program publication changes future admission, never the enrolled learner's pins.
    const newer: string[] = [];
    for (const [index, missionId] of missions.entries()) {
      await admin.put(`/api/v1/admin/curriculum/missions/${missionId}/foundation`).send({ definition: definition(index === 1 ? [newer[0]!] : []), expectedRevision: 1, idempotencyKey: randomUUID() }).expect(200);
      await admin.post(`/api/v1/admin/curriculum/missions/${missionId}/foundation/validate`).send({ expectedRevision: 2, idempotencyKey: randomUUID() }).expect(200);
      const revision = await admin.post(`/api/v1/admin/curriculum/missions/${missionId}/foundation/publish`).send({ expectedRevision: 2, idempotencyKey: randomUUID() }).expect(200);
      newer.push(revision.body.id as string);
    }
    await admin.post(`/api/v1/admin/learning-programs/${programId}/publish`).send({ curriculumRevisionIds: newer, expectedRevision: 2, idempotencyKey: randomUUID() }).expect(200);
    expect((await learner.get('/api/v1/me/curriculum-roadmap').expect(200)).body.items.map((item: { revisionId: string }) => item.revisionId)).toEqual(revisionIds);
    expect((await learner.get(`/api/v1/learning-sessions/${next.body.id}`).expect(200)).body.curriculumRevisionId).toBe(revisionIds[1]);
    expect((await context.database.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: enrollmentId } })).curriculumRevisionIds).toEqual(revisionIds);
    expect(await context.database.activityAttempt.count({ where: { sessionId: session.id } })).toBe(attemptIds.length);
  }, 60_000);
});

