import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CurriculumProgressService } from '../../src/curriculum-foundation/application/curriculum-progress.service.js';
import { createLearningSessionTestContext, registerLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('Foundation curriculum objective progress', () => {
  let context: LearningSessionTestContext;
  let progress: CurriculumProgressService;
  let missionId: string;
  let otherMissionId: string;
  let lessonVersionId: string;
  let activityId: string;
  let activitySlug: string;
  let sequence = 100;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('foundation_progress');
    progress = context.app.get(CurriculumProgressService);
    const mission = await context.database.mission.findFirstOrThrow({ where: { purpose: 'LEARNING' }, include: { lessons: true } });
    missionId = mission.id;
    const version = await context.database.lessonVersion.findFirstOrThrow({
      where: { lessonId: mission.lessons[0]!.lessonId, status: 'PUBLISHED' }, include: { activities: { orderBy: { order: 'asc' } } },
    });
    lessonVersionId = version.id;
    activityId = version.activities[0]!.id;
    activitySlug = version.activities[0]!.slug;
    otherMissionId = (await context.database.mission.create({ data: {
      levelId: mission.levelId, slug: `progress-shared-${randomUUID()}`, title: 'Shared lesson mission',
      objective: 'Do not share progress', order: 98, status: 'PUBLISHED',
      lessons: { create: { lessonId: version.lessonId, order: 1 } },
    } })).id;
  }, 60_000);

  beforeEach(async () => {
    await context.resetLearners();
    await context.database.curriculumCompletion.deleteMany();
    await context.database.curriculumPrerequisite.deleteMany();
    await context.database.curriculumRevisionLesson.deleteMany();
    await context.database.curriculumRevision.deleteMany();
    await context.database.curriculumDefinition.deleteMany();
  });
  afterAll(async () => context?.close());

  async function learner(label: string) {
    const email = `${label}-${randomUUID()}@example.test`;
    const agent = await registerLearner(context.app, { displayName: label, email });
    const user = await context.database.user.findUniqueOrThrow({ where: { email } });
    const enrollment = await context.database.learnerProgramEnrollment.findFirstOrThrow({ where: { learnerId: user.id } });
    return { agent, user, enrollment };
  }

  async function revision(targetMissionId = missionId) {
    return context.database.curriculumRevision.create({ data: {
      missionId: targetMissionId, revision: sequence++, status: 'PUBLISHED',
      snapshot: { category: 'grammar', prerequisiteRevisionIds: [], objectives: [{
        slug: 'read-objective', statement: 'Read workplace information', skills: ['reading'], required: true,
        evidence: [{ lessonVersionId, activitySlug, languageBlockSlugs: [] }],
      }] },
      lessons: { create: { lessonVersionId, order: 1 } },
    } });
  }

  async function completedSession(learnerId: string, curriculumRevisionId: string, status: 'QUEUED' | 'EVALUATED', score: number | null) {
    return context.database.learningSession.create({ data: {
      learnerId, clientSessionId: randomUUID(), missionId, lessonVersionId, curriculumRevisionId,
      durationMinutes: 45, status: 'COMPLETED', completedAt: new Date(),
      planSnapshot: { missionId, lessonVersionId, durationMinutes: 45, blocks: [] },
      attempts: { create: {
        activityId, clientAttemptId: randomUUID(), rawResponse: {}, evaluationStatus: status, score,
      } },
    } });
  }

  it('pending_failed_and_missing_evidence_never_completes and foreign evidence never contributes', async () => {
    const published = await revision();
    const owner = await learner('progress-owner');
    const foreign = await learner('progress-foreign');
    const pending = await completedSession(owner.user.id, published.id, 'QUEUED', null);
    await completedSession(foreign.user.id, published.id, 'EVALUATED', 1);

    await progress.projectSession(pending.id);
    expect(await context.database.curriculumCompletion.count({ where: { enrollmentId: owner.enrollment.id } })).toBe(0);

    const roadmap = await owner.agent.get('/api/v1/me/curriculum-roadmap').expect(200);
    expect(roadmap.body.items.find((item: { revisionId: string }) => item.revisionId === published.id)).toMatchObject({
      state: 'available', objectives: [{ slug: 'read-objective', completed: false }],
    });
  });

  it('duplicate_projection_writes_one_receipt and late evaluation updates only the bound old revision', async () => {
    const oldRevision = await revision();
    const owner = await learner('progress-late');
    const initialLevelId = owner.enrollment.currentLevelId;
    const session = await completedSession(owner.user.id, oldRevision.id, 'EVALUATED', 1);
    const newerRevision = await revision();
    await revision(otherMissionId);

    await progress.projectSession(session.id);
    await progress.projectSession(session.id);

    const receipts = await context.database.curriculumCompletion.findMany({ where: { enrollmentId: owner.enrollment.id } });
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ curriculumRevisionId: oldRevision.id, policyVersion: 'curriculum-objective-v1' });
    expect(receipts.some((receipt) => receipt.curriculumRevisionId === newerRevision.id)).toBe(false);
    expect((await context.database.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: owner.enrollment.id } })).currentLevelId).toBe(initialLevelId);
  });
});
