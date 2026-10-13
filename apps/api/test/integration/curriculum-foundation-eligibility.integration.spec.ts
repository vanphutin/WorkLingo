import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CurriculumEligibilityService } from '../../src/curriculum-foundation/application/curriculum-eligibility.service.js';
import { createLearningSessionTestContext, registerLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('Foundation curriculum eligibility and session binding', () => {
  let context: LearningSessionTestContext;
  let eligibility: CurriculumEligibilityService;
  let missionId: string;
  let prerequisiteMissionId: string;
  let lessonVersionId: string;
  let sequence = 1;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('foundation_eligibility');
    eligibility = context.app.get(CurriculumEligibilityService);
    const mission = await context.database.mission.findFirstOrThrow({ where: { purpose: 'LEARNING' }, include: { lessons: true } });
    missionId = mission.id;
    const version = await context.database.lessonVersion.findFirstOrThrow({ where: { lessonId: mission.lessons[0]!.lessonId, status: 'PUBLISHED' } });
    lessonVersionId = version.id;
    prerequisiteMissionId = (await context.database.mission.create({ data: {
      levelId: mission.levelId, slug: `eligibility-prerequisite-${randomUUID()}`, title: 'Eligibility prerequisite',
      objective: 'Complete prerequisite', order: 99, status: 'PUBLISHED',
      lessons: { create: { lessonId: version.lessonId, order: 1 } },
    } })).id;
  }, 60_000);

  beforeEach(async () => {
    await context.resetLearners();
    await context.database.curriculumPrerequisite.deleteMany();
    await context.database.curriculumRevisionLesson.deleteMany();
    await context.database.curriculumRevision.deleteMany();
    await context.database.curriculumDefinition.deleteMany();
    await context.database.level.update({ where: { code: 'FOUNDATION_1' }, data: { status: 'PUBLISHED' } });
  });
  afterAll(async () => { await context?.close(); });

  async function revision(targetMissionId: string, prerequisiteRevisionIds: string[] = []) {
    const revision = await context.database.curriculumRevision.create({ data: {
      missionId: targetMissionId, revision: sequence++, status: 'PUBLISHED', snapshot: {
        category: 'grammar', prerequisiteRevisionIds, objectives: [{ slug: 'objective', statement: 'Understand work', skills: ['reading'], required: true,
          evidence: [{ lessonVersionId, activitySlug: 'reading-main-purpose', languageBlockSlugs: [] }] }],
      },
      lessons: { create: { lessonVersionId, order: 1 } },
      prerequisites: { create: prerequisiteRevisionIds.map((prerequisiteRevisionId) => ({ prerequisiteRevisionId })) },
    } });
    return revision.id;
  }

  async function learner(email: string) {
    const agent = await registerLearner(context.app, { displayName: email, email });
    const user = await context.database.user.findUniqueOrThrow({ where: { email } });
    const enrollment = await context.database.learnerProgramEnrollment.findFirstOrThrow({ where: { learnerId: user.id } });
    return { agent, user, enrollment };
  }

  it('requires an exact prerequisite completion from the active enrollment', async () => {
    const prerequisite = await revision(prerequisiteMissionId);
    const dependent = await revision(missionId, [prerequisite]);
    const first = await learner(`eligibility-a-${randomUUID()}@example.test`);
    const foreign = await learner(`eligibility-b-${randomUUID()}@example.test`);
    expect(await eligibility.resolve(first.user.id, missionId)).toEqual({
      revisionId: dependent, available: false, reasons: [`prerequisite_incomplete:${prerequisite}`],
    });
    await context.database.curriculumCompletion.create({ data: {
      enrollmentId: foreign.enrollment.id, curriculumRevisionId: prerequisite, policyVersion: 'test-v1', evidenceSnapshot: {},
    } });
    expect((await eligibility.resolve(first.user.id, missionId)).available).toBe(false);
    await context.database.curriculumCompletion.create({ data: {
      enrollmentId: first.enrollment.id, curriculumRevisionId: prerequisite, policyVersion: 'test-v1', evidenceSnapshot: {},
    } });
    expect(await eligibility.resolve(first.user.id, missionId)).toEqual({ revisionId: dependent, available: true, reasons: [] });
  });

  it('binds new sessions to the current revision while old sessions remain frozen and resumable', async () => {
    const firstRevision = await revision(missionId);
    const owner = await learner(`binding-${randomUUID()}@example.test`);
    const clientSessionId = randomUUID();
    const created = await owner.agent.post('/api/v1/learning-sessions').send({ clientSessionId, durationMinutes: 60 }).expect(201);
    expect((await context.database.learningSession.findUniqueOrThrow({ where: { id: created.body.id } })).curriculumRevisionId).toBe(firstRevision);

    const secondRevision = await revision(missionId);
    const replay = await owner.agent.post('/api/v1/learning-sessions').send({ clientSessionId, durationMinutes: 60 }).expect(201);
    expect(replay.body.id).toBe(created.body.id);
    expect((await context.database.learningSession.findUniqueOrThrow({ where: { id: created.body.id } })).curriculumRevisionId).toBe(firstRevision);
    const newer = await owner.agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201);
    expect((await context.database.learningSession.findUniqueOrThrow({ where: { id: newer.body.id } })).curriculumRevisionId).toBe(secondRevision);

    await context.database.curriculumRevision.update({ where: { id: firstRevision }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
    await owner.agent.get(`/api/v1/learning-sessions/${created.body.id}`).expect(200);
    await owner.agent.post(`/api/v1/learning-sessions/${created.body.id}/start`).expect(200);
  });

  it('rejects direct creation while prerequisites are locked and rejects a mismatched bound version', async () => {
    const prerequisite = await revision(prerequisiteMissionId);
    await revision(missionId, [prerequisite]);
    const owner = await learner(`locked-${randomUUID()}@example.test`);
    const locked = await owner.agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(422);
    expect(locked.body).toMatchObject({ code: 'CURRICULUM_UNAVAILABLE', reasons: [expect.stringContaining('prerequisite_incomplete')] });

    await context.database.curriculumCompletion.create({ data: { enrollmentId: owner.enrollment.id, curriculumRevisionId: prerequisite, policyVersion: 'test-v1', evidenceSnapshot: {} } });
    const version = await context.database.lessonVersion.findUniqueOrThrow({ where: { id: lessonVersionId } });
    await context.database.$executeRawUnsafe('ALTER TABLE "LessonVersion" DISABLE TRIGGER lesson_version_immutable');
    try {
      await context.database.lessonVersion.update({ where: { id: lessonVersionId }, data: { title: `${version.title} mismatch` } });
      await owner.agent.get('/api/v1/learning-sessions/availability').expect(409);
    } finally {
      await context.database.lessonVersion.update({ where: { id: lessonVersionId }, data: { title: version.title } });
      await context.database.$executeRawUnsafe('ALTER TABLE "LessonVersion" ENABLE TRIGGER lesson_version_immutable');
    }
  });

  it('keeps legacy missions available without fabricating a revision binding', async () => {
    const owner = await learner(`legacy-${randomUUID()}@example.test`);
    expect(await eligibility.resolve(owner.user.id, missionId)).toEqual({ revisionId: null, available: true, reasons: [] });
    const created = await owner.agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201);
    expect((await context.database.learningSession.findUniqueOrThrow({ where: { id: created.body.id } })).curriculumRevisionId).toBeNull();
  });
});
