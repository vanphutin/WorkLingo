import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lessonSnapshotSchema, type LessonSnapshot } from '../../src/curriculum/domain/curriculum.types.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { createLearningSessionTestContext, registerLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('R2 final review public regressions', () => {
  let context: LearningSessionTestContext, admin: ReturnType<typeof request.agent>;
  beforeAll(async () => {
    context = await createLearningSessionTestContext('r2_final_review', { migrationConfig: 'prisma.r2.config.ts' });
    const account = { email: 'final-review-admin@example.test', password: 'Synthetic-R2-Only-123!' };
    await seedContentAdmin(context.database, account);
    admin = request.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send(account).expect(200);
  }, 60000);
  afterAll(async () => { await context?.close(); });

  async function fixture(edit: (snapshot: LessonSnapshot) => void) {
    const suffix = randomUUID();
    const original = await context.database.lessonVersion.findFirstOrThrow({ where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' } });
    const snapshot = lessonSnapshotSchema.parse(original.parsedContent);
    snapshot.activities = snapshot.activities.map(a => ({ ...a, id: randomUUID() }));
    snapshot.contentBlocks = snapshot.contentBlocks.map(b => ({ ...b, id: randomUUID() }));
    edit(snapshot);
    lessonSnapshotSchema.parse(snapshot);
    const lesson = await context.database.lesson.create({ data: { slug: `final-${suffix}` } });
    const version = await context.database.lessonVersion.create({ data: { lessonId: lesson.id, version: 1, title: snapshot.title, sourceHash: suffix, parsedContent: snapshot as Prisma.InputJsonValue } });
    for (const [order, block] of snapshot.contentBlocks.entries()) await context.database.contentBlock.create({ data: { id: block.id, slug: block.slug, type: block.type, text: block.text, metadata: block.audio ? { audio: block.audio } : {}, order, lessonVersionId: version.id } });
    for (const activity of snapshot.activities) await context.database.activity.create({ data: { ...activity, payload: activity.payload as Prisma.InputJsonValue, lessonVersionId: version.id } });
    for (const bank of await context.database.lessonVersionWordBank.findMany({ where: { lessonVersionId: original.id } })) await context.database.lessonVersionWordBank.create({ data: { lessonVersionId: version.id, wordBankId: bank.wordBankId, wordBankVersionId: bank.wordBankVersionId } });
    await context.database.lessonVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED' } });
    const program = (await admin.post('/api/v1/admin/learning-programs').send({ slug: `final-${suffix}`, name: 'Final review course', description: 'Synthetic regression fixture', learningGoal: 'Practice', proficiencyLabel: 'A1', iconKey: 'intermediate', displayOrder: 800 + await context.database.learningProgram.count(), idempotencyKey: randomUUID() }).expect(201)).body;
    const path = await context.database.learningPath.create({ data: { programId: program.id, name: 'Path', slug: `path-${suffix}`, status: 'PUBLISHED' } });
    const level = await context.database.level.create({ data: { pathId: path.id, name: 'Level', code: suffix, cefrReference: 'A1', order: 1, status: 'PUBLISHED' } });
    const mission = await context.database.mission.create({ data: { levelId: level.id, slug: `mission-${suffix}`, title: 'Unit', objective: 'Read', order: 1, status: 'PUBLISHED', lessons: { create: { lessonId: lesson.id, order: 1 } } } });
    const reading = snapshot.activities.find(a => a.activityType === 'reading')!;
    const revision = await context.database.curriculumRevision.create({ data: { missionId: mission.id, revision: 1, snapshot: { category: 'grammar', prerequisiteRevisionIds: [], objectives: [{ slug: 'read', statement: 'Read', required: true, skills: ['reading'], evidence: [{ lessonVersionId: version.id, activitySlug: reading.slug, languageBlockSlugs: [] }] }] }, lessons: { create: { lessonVersionId: version.id, order: 1 } } } });
    return { program, version, revision, mission, snapshot };
  }

  it.each(['writing-in-activate', 'unreachable-required-reading'] as const)('rejects %s before publication with an actionable lesson reference', async layout => {
    const f = await fixture(snapshot => {
      if (layout === 'writing-in-activate') for (const activity of snapshot.activities.filter(a => a.activityType === 'writing')) activity.learningBlock = 'activate';
      else {
        const reading = snapshot.activities.find(a => a.activityType === 'reading')!;
        snapshot.activities.push({ ...reading, id: randomUUID(), slug: 'required-extra-reading', order: 99, learningBlock: 'respond' });
      }
    });
    const response = await admin.post(`/api/v1/admin/learning-programs/${f.program.id}/publish`).send({ curriculumRevisionIds: [f.revision.id], expectedRevision: 1, idempotencyKey: randomUUID() }).expect(422);
    expect(response.body).toMatchObject({ code: 'PROGRAM_LESSON_UNPLAYABLE', lessonVersionId: f.version.id });
    expect(response.body.message).toMatch(/session|activities/i);
    expect(await context.database.programVersion.count({ where: { programId: f.program.id, status: 'PUBLISHED' } })).toBe(0);
    expect((await context.database.learningProgram.findUniqueOrThrow({ where: { id: f.program.id } })).availabilityStatus).toBe('IN_DEVELOPMENT');
  });

  it('qualifies only assessed comprehension skills in learner progress and persisted admin analytics', async () => {
    const f = await fixture(snapshot => {
      for (const activity of snapshot.activities) {
        if (activity.activityType === 'reading') activity.skills = ['reading', 'speaking'];
        if (activity.activityType === 'listening') activity.skills = ['listening', 'writing'];
      }
    });
    await admin.post(`/api/v1/admin/learning-programs/${f.program.id}/publish`).send({ curriculumRevisionIds: [f.revision.id], expectedRevision: 1, idempotencyKey: randomUUID() }).expect(200);
    const learner = await registerLearner(context.app, { email: `multi-${randomUUID()}@example.test`, displayName: 'Multi skill learner' });
    const current = (await learner.get('/api/v1/me/program-context').expect(200)).body;
    const enrollment = (await learner.post('/api/v1/me/program-enrollments').send({ programSlug: f.program.slug, expectedRevision: current.enrollment.revision, idempotencyKey: randomUUID() }).expect(200)).body.enrollment;
    let progress = (await learner.get(`/api/v1/me/program-enrollments/${enrollment.id}/progress`).expect(200)).body;
    const covered = new Set<string>();
    for (let round = 0; round < f.snapshot.activities.length && !progress.completed; round++) {
      const session = (await learner.post('/api/v1/learning-sessions/curriculum').send({ missionId: f.mission.id, expectedCurriculumRevisionId: f.revision.id, lessonVersionId: f.version.id, durationMinutes: progress.items[0].recommendedDurationMinutes, clientSessionId: randomUUID() }).expect(201)).body;
      await learner.post(`/api/v1/learning-sessions/${session.id}/start`).expect(200);
      for (const id of session.plan.blocks.flatMap((b: { activityIds: string[] }) => b.activityIds)) {
        const activity = f.snapshot.activities.find(a => a.id === id)!;
        const response = activity.activityType === 'reading' || activity.activityType === 'listening' ? { answerIndexes: activity.payload.questions.map(q => q.answerIndex) } : { text: 'Hello. I work in sales and help my team every day.' };
        await learner.post(`/api/v1/activities/${id}/attempts`).send({ clientAttemptId: randomUUID(), sessionId: session.id, response }).expect(201);
        covered.add(id);
      }
      progress = (await learner.get(`/api/v1/me/program-enrollments/${enrollment.id}/progress`).expect(200)).body;
      for (const dimension of ['speaking', 'writing']) expect(progress.evidenceDimensions.find((d: { dimension: string }) => d.dimension === dimension)).toMatchObject({ status: 'PENDING', qualifiedAttempts: 0, score: null });
      for (const dimension of ['reading', 'listening']) expect(progress.evidenceDimensions.find((d: { dimension: string }) => d.dimension === dimension)).toMatchObject({ score: 1 });
    }
    expect(progress.completed).toBe(true);
    expect([...covered].sort()).toEqual(f.snapshot.activities.map(a => a.id).sort());
    const analytics = (await admin.get(`/api/v1/admin/learning-programs/${f.program.id}/analytics`).query({ from: new Date(Date.now() - 60000).toISOString(), to: new Date(Date.now() + 60000).toISOString() }).expect(200)).body;
    for (const dimension of ['speaking', 'writing']) expect(analytics.skills.find((d: { dimension: string }) => d.dimension === dimension)).toMatchObject({ qualifiedAttempts: 0, meanQualifiedScore: null, pendingEnrollments: 1 });
    expect(analytics.summary.activityCompletedEnrollments).toBe(1);
  });
});
