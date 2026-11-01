import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { programAnalyticsSchema, type ProgramVersionInput } from '@worklingo/contracts';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { ProgramAnalyticsService } from '../../src/learning-programs/application/program-analytics.service.js';
import { createLearningSessionTestContext, registerLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('R2 program aggregate analytics API', () => {
  let context: LearningSessionTestContext, admin: ReturnType<typeof request.agent>, learner: ReturnType<typeof request.agent>;
  let learnerId: string;
  const from = '2026-10-01T00:00:00.000Z', to = '2026-10-15T00:00:00.000Z';
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL?.includes(':55447/')) throw Error('DISPOSABLE_R2_DATABASE_REQUIRED');
    context = await createLearningSessionTestContext('r2_analytics', { migrationConfig: 'prisma.r2.config.ts' });
    await seedContentAdmin(context.database, { email: 'analytics-admin@example.test', password: 'R2-Synthetic-Admin-123!' });
    admin = request.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send({ email: 'analytics-admin@example.test', password: 'R2-Synthetic-Admin-123!' }).expect(200);
    learner = await registerLearner(context.app, { email: 'analytics-private@example.test', displayName: 'PRIVATE_LEARNER_NAME' });
    learnerId = (await context.database.user.findUniqueOrThrow({ where: { email: 'analytics-private@example.test' } })).id;
  }, 60000);
  afterAll(async () => { await context?.close(); });

  async function fixture(requiredReview = false, publish = true) {
    const suffix = randomUUID();
    const program = await context.database.learningProgram.create({ data: { slug: `analytics-${suffix}`, name: 'Analytics course', description: 'Synthetic historical analytics fixture', learningGoal: 'Practice', proficiencyLabel: 'A1–A2', iconKey: 'intermediate', displayOrder: 400 + await context.database.learningProgram.count(), availabilityStatus: 'IN_DEVELOPMENT', progressionPolicy: 'ACTIVITY_COMPLETION' } });
    const path = await context.database.learningPath.create({ data: { programId: program.id, name: 'Frozen path', slug: `p-${suffix}`, status: 'PUBLISHED' } });
    const level = await context.database.level.create({ data: { pathId: path.id, name: 'Frozen stage', code: suffix, cefrReference: 'A1', order: 1, status: 'PUBLISHED' } });
    const mission = await context.database.mission.create({ data: { levelId: level.id, slug: `m-${suffix}`, title: 'Frozen unit', objective: 'Read English', order: 1, status: 'PUBLISHED' } });
    const lesson = await context.database.lessonVersion.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
    const snapshot = lessonSnapshotSchema.parse(lesson.parsedContent);
    const activity = snapshot.activities.find(a => a.activityType === 'reading')!;
    await context.database.missionLesson.create({ data: { missionId: mission.id, lessonId: lesson.lessonId, order: 1 } });
    const revision = await context.database.curriculumRevision.create({ data: { missionId: mission.id, revision: 1, snapshot: { category: 'grammar', prerequisiteRevisionIds: [], objectives: [{ slug: 'read', statement: 'Read English', required: true, skills: ['reading'], evidence: [{ lessonVersionId: lesson.id, activitySlug: activity.slug, languageBlockSlugs: [] }] }] }, lessons: { create: { lessonVersionId: lesson.id, order: 1 } } } });
    const options = (await admin.get(`/api/v1/admin/learning-programs/${program.id}/authoring-options`).expect(200)).body;
    const content: ProgramVersionInput = { title: program.name, description: program.description, objectives: ['Read English'], estimatedMinutes: 45, difficulty: 'A1–A2', supportedLanguages: ['en'], audiences: ['adult'], policy: { version: 1, sequential: { stages: true, units: true, lessons: true }, completion: { requiredActivityRatio: 1 }, mastery: { required: false, threshold: .8, minimumQualifiedAttempts: 1 }, retry: { maxAttempts: 3, cooldownMinutes: 0 }, remediation: { enabled: true, afterAttempts: 2 }, review: { scheduleVersion: 'program-review-v1', intervalsDays: [1, 7], requiredForReadiness: false } }, curriculumBindings: options.items };
    content.policy.review.requiredForReadiness = requiredReview;
    const versions = [];
    for (let i = 1; i <= 2; i++) versions.push(await context.database.programVersion.create({ data: { programId: program.id, version: i, status: 'DRAFT', snapshot: { ...content, title: `Frozen release ${i}` }, policy: content.policy, curriculumRevisionIds: [revision.id], curricula: { create: { curriculumRevisionId: revision.id, order: 1 } } } }));
    if (publish) for (const v of versions) await context.database.programVersion.update({ where: { id: v.id }, data: { status: 'PUBLISHED' } });
    return { program, content, versions, revision, lesson, mission, level };
  }

  it('returns literal cohort boundaries, empty evidence and empty version comparisons without private fields', async () => {
    const f = await fixture();
    await context.database.learnerProgramEnrollment.create({ data: { learnerId, programId: f.program.id, programVersionId: f.versions[0]!.id, currentLevelId: f.level.id, curriculumRevisionIds: [f.revision.id], createdAt: new Date(from) } });
    const url = `/api/v1/admin/learning-programs/${f.program.id}/analytics`;
    const response = await admin.get(url).query({ from, to }).expect(200);
    expect(programAnalyticsSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.summary).toMatchObject({ cohortEnrollments: 1, cohortStatus: { ACTIVE: 1, SUSPENDED: 0, COMPLETED: 0, WITHDRAWN: 0 }, activeLearners: 0, completedEnrollments: 0, projectedEnrollments: 0, activityCompletedEnrollments: 0, readyEnrollments: 0, unknownProjectionEnrollments: 1 });
    expect(response.body.versions.items).toHaveLength(2);
    expect(response.body.versions.items[1]).toMatchObject({ version: 2, cohortEnrollments: 0, totalEnrollments: 0, completionRate: null });
    expect(response.body.skills.find((s: { dimension: string }) => s.dimension === 'speaking')).toMatchObject({ qualifiedAttempts: 0, pendingAttempts: 0, meanQualifiedScore: null, unknownEnrollments: 1 });
    expect(response.body.retention).toEqual([{ day: 1, matureEnrollments: 1, retainedEnrollments: 0, rate: 0 }, { day: 7, matureEnrollments: 1, retainedEnrollments: 0, rate: 0 }, { day: 30, matureEnrollments: 0, retainedEnrollments: 0, rate: null }]);
    const serialized = JSON.stringify(response.body);
    for (const privateValue of [learnerId, 'analytics-private@example.test', 'PRIVATE_LEARNER_NAME', 'rawResponse', 'normalizedResponse']) expect(serialized).not.toContain(privateValue);
    await learner.get(url).query({ from, to }).expect(403);
    await request(context.app.getHttpServer()).get(url).query({ from, to }).expect(401);
    await admin.get(url).query({ from, to, limit: 101 }).expect(400);
    await admin.get(url).query({ from, to: from }).expect(400);
    const foreign = await fixture();
    await admin.get(url).query({ from, to, versionId: foreign.versions[0]!.id }).expect(404);
    const atEnd = await registerLearner(context.app, { email: 'analytics-end@example.test', displayName: 'End boundary' });
    void atEnd;
    const endId = (await context.database.user.findUniqueOrThrow({ where: { email: 'analytics-end@example.test' } })).id;
    await context.database.learnerProgramEnrollment.create({ data: { learnerId: endId, programId: f.program.id, programVersionId: f.versions[1]!.id, createdAt: new Date(to) } });
    expect((await admin.get(url).query({ from, to, versionPage: 2, nodePage: 2, limit: 1 }).expect(200)).body).toMatchObject({ summary: { cohortEnrollments: 1 }, versions: { total: 2, page: 2 }, nodes: { page: 2 } });
    await context.database.learnerProgramEnrollment.update({ where: { learnerId_programId: { learnerId: endId, programId: f.program.id } }, data: { createdAt: new Date('2026-10-14T00:00:00.000Z'), status: 'WITHDRAWN' } });
    const immature = (await admin.get(url).query({ from, to }).expect(200)).body;
    expect(immature.summary).toMatchObject({ cohortEnrollments: 2, totalEnrollments: 2, cohortStatus: { ACTIVE: 1, WITHDRAWN: 1 }, withdrawnEnrollments: 0 });
    expect(immature.retention[0]).toEqual({ day: 1, matureEnrollments: 1, retainedEnrollments: 0, rate: 0 });
    await context.database.learnerProgramEnrollment.update({ where: { learnerId_programId: { learnerId: endId, programId: f.program.id } }, data: { createdAt: new Date('2026-09-30T23:59:59.999Z') } });
    expect((await admin.get(url).query({ from, to }).expect(200)).body.summary).toMatchObject({ cohortEnrollments: 1, totalEnrollments: 2, unknownProjectionEnrollments: 2 });
  });

  it('separates completion events, actual activity and persisted coverage/readiness across exact releases', async () => {
    const f = await fixture(true);
    const enrollment = await context.database.learnerProgramEnrollment.create({ data: { learnerId, programId: f.program.id, programVersionId: f.versions[0]!.id, currentLevelId: f.level.id, curriculumRevisionIds: [f.revision.id], createdAt: new Date(from) } });
    await context.database.learningProgram.update({ where: { id: f.program.id }, data: { availabilityStatus: 'AVAILABLE', curriculumRevisionIds: [f.revision.id] } });
    const current = (await learner.get('/api/v1/me/program-context').expect(200)).body;
    await learner.put('/api/v1/me/program-context').send({ programSlug: f.program.slug, expectedRevision: current.enrollment.revision }).expect(200);
    // Real API plan/start/submissions produce Task 3's persisted evidence;
    // historical boundaries below use explicit synthetic timestamps only.
    const session = (await learner.post('/api/v1/learning-sessions/curriculum').send({ missionId: f.mission.id, expectedCurriculumRevisionId: f.revision.id, durationMinutes: 60, clientSessionId: randomUUID() }).expect(201)).body;
    const start = new Date(Date.now() - 60000).toISOString();
    await learner.post(`/api/v1/learning-sessions/${session.id}/start`).expect(200);
    const snapshot = lessonSnapshotSchema.parse(f.lesson.parsedContent);
    for (const id of session.plan.blocks.flatMap((b: { activityIds: string[] }) => b.activityIds)) {
      const activity = snapshot.activities.find(a => a.id === id)!;
      const response = activity.activityType === 'reading' || activity.activityType === 'listening' ? { answerIndexes: activity.payload.questions.map(q => q.answerIndex) } : { text: 'PRIVATE_ATTEMPT_TEXT I help my colleagues every day in the office.' };
      await learner.post(`/api/v1/activities/${id}/attempts`).send({ clientAttemptId: randomUUID(), sessionId: session.id, response }).expect(201);
    }
    const url = `/api/v1/admin/learning-programs/${f.program.id}/analytics`;
    const end = new Date(Date.now() + 60000).toISOString();
    const actual = programAnalyticsSchema.parse((await admin.get(url).query({ from: start, to: end }).expect(200)).body);
    expect(actual.summary).toMatchObject({ totalEnrollments: 1, cohortEnrollments: 0, activeLearners: 1, projectedEnrollments: 1, completedEnrollments: 0 });
    expect(actual.skills.find(s => s.dimension === 'reading')).toMatchObject({ qualifiedAttempts: 1, meanQualifiedScore: 1, masteredEnrollments: 1 });
    expect(actual.skills.find(s => s.dimension === 'speaking')).toMatchObject({ pendingAttempts: 1, qualifiedAttempts: 0, meanQualifiedScore: null, pendingEnrollments: 1 });
    expect(actual.skills.find(s => s.dimension === 'pronunciation')).toMatchObject({ qualifiedAttempts: 0, meanQualifiedScore: null, unknownEnrollments: 1 });
    expect(JSON.stringify(actual)).not.toContain('PRIVATE_ATTEMPT_TEXT');
    expect(actual.nodes.items.filter(n => n.versionId === f.versions[0]!.id)).toHaveLength(3);
    expect(actual.nodes.items.filter(n => n.versionId === f.versions[1]!.id).every(n => n.totalEnrollments === 0)).toBe(true);
    let progress = (await learner.get(`/api/v1/me/program-enrollments/${enrollment.id}/progress`).expect(200)).body;
    for (let round = 0; round < 5 && !progress.completed; round++) {
      await context.database.rateLimitBucket.deleteMany();
      const extra = (await learner.post('/api/v1/learning-sessions/curriculum').send({ missionId: f.mission.id, expectedCurriculumRevisionId: f.revision.id, durationMinutes: progress.items[0].recommendedDurationMinutes, clientSessionId: randomUUID() }).expect(201)).body;
      await learner.post(`/api/v1/learning-sessions/${extra.id}/start`).expect(200);
      for (const id of extra.plan.blocks.flatMap((b: { activityIds: string[] }) => b.activityIds)) {
        const activity = snapshot.activities.find(a => a.id === id)!;
        const response = activity.activityType === 'reading' || activity.activityType === 'listening' ? { answerIndexes: activity.payload.questions.map(q => q.answerIndex) } : { text: 'PRIVATE_ATTEMPT_TEXT I help my colleagues in the office.' };
        await learner.post(`/api/v1/activities/${id}/attempts`).send({ clientAttemptId: randomUUID(), sessionId: extra.id, response }).expect(201);
      }
      progress = (await learner.get(`/api/v1/me/program-enrollments/${enrollment.id}/progress`).expect(200)).body;
    }
    expect(progress).toMatchObject({ completed: true, ready: false });
    const covered = (await admin.get(url).query({ from: start, to: new Date(Date.now() + 60000).toISOString() }).expect(200)).body;
    expect(covered.summary).toMatchObject({ activityCompletedEnrollments: 1, readyEnrollments: 0, completedEnrollments: 0 });
    expect(covered.nodes.items.filter((n: { versionId: string }) => n.versionId === f.versions[0]!.id).every((n: { completedEnrollments: number; readyEnrollments: number }) => n.completedEnrollments === 1 && n.readyEnrollments === 0)).toBe(true);
    expect(covered.reviews).toMatchObject({ basis: 'CURRENT', scheduled: 1, overdue: 0, completedEventsInWindow: 0 });
    await context.database.level.update({ where: { id: f.level.id }, data: { name: 'Live changed title', status: 'ARCHIVED' } });
    await context.database.mission.update({ where: { id: f.mission.id }, data: { title: 'Live changed unit', status: 'ARCHIVED' } });
    const archived = (await admin.get(url).query({ from: start, to: end }).expect(200)).body;
    expect(archived.nodes.items.find((n: { type: string }) => n.type === 'stage').title).toBe('Frozen stage');
    expect(archived.nodes.items.find((n: { type: string }) => n.type === 'unit').title).toBe('Frozen unit');
    // Lifecycle events at from included, at to excluded, even for an old cohort.
    for (const [revision, createdAt, type] of [[10, from, 'COMPLETED'], [11, to, 'WITHDRAWN']] as const) await context.database.enrollmentEvent.create({ data: { enrollmentId: enrollment.id, revision, createdAt: new Date(createdAt), type, reason: 'Synthetic historical event', nextState: { status: type } } });
    await context.database.learningSession.update({ where: { id: session.id }, data: { startedAt: new Date('2026-10-02T00:00:00.000Z') } });
    const history = programAnalyticsSchema.parse((await admin.get(url).query({ from, to }).expect(200)).body);
    expect(history.summary).toMatchObject({ cohortEnrollments: 1, completedEnrollments: 1, withdrawnEnrollments: 0, completionRate: 1, activeLearners: 1, projectedEnrollments: 0, unknownProjectionEnrollments: 1 });
    expect(history.retention[0]).toEqual({ day: 1, matureEnrollments: 1, retainedEnrollments: 1, rate: 1 });
    expect(history.reviews).toMatchObject({ basis: 'CURRENT', scheduled: 1, completedEventsInWindow: 0 });
    expect(history.reviews.asOf).toBe(history.generatedAt);
    await context.database.learningSession.update({ where: { id: session.id }, data: { startedAt: new Date(to) } });
    expect((await admin.get(url).query({ from, to }).expect(200)).body.summary.activeLearners).toBe(0);
    await context.database.learningSession.update({ where: { id: session.id }, data: { startedAt: new Date('2026-10-03T00:00:00.000Z') } });
    expect((await admin.get(url).query({ from, to }).expect(200)).body.retention[0]).toEqual({ day: 1, matureEnrollments: 1, retainedEnrollments: 0, rate: 0 });
    const filtered = (await admin.get(url).query({ from, to, versionId: f.versions[1]!.id }).expect(200)).body;
    expect(filtered.summary).toMatchObject({ totalEnrollments: 0, activeLearners: 0, completedEnrollments: 0 });
    expect(filtered.skills.every((s: { unknownEnrollments: number }) => s.unknownEnrollments === 0)).toBe(true);
    const assessmentInput = { learnerId, clientAssessmentId: randomUUID(), sessionId: session.id, lessonVersionId: f.lesson.id, levelCode: f.level.code, policyVersion: 'synthetic-recorded-status', status: 'pending_evaluation', skills: {}, reinforcement: {}, evidenceSnapshot: { fixture: 'synthetic checkpoint' }, canAdvance: false, createdAt: new Date(from) };
    await context.database.checkpointAssessment.create({ data: assessmentInput });
    await context.database.checkpointAssessment.create({ data: { ...assessmentInput, clientAssessmentId: randomUUID(), createdAt: new Date(to), status: 'passed' } });
    expect((await admin.get(url).query({ from, to }).expect(200)).body.assessments).toEqual({ total: 1, statuses: [{ status: 'pending_evaluation', count: 1 }] });
    // Copy an actual server projection into explicitly dated historical fixtures
    // to prove snapshot/evidence boundaries without inventing grader behavior.
    const latest = await context.database.progressionSnapshot.findFirstOrThrow({ where: { enrollmentId: enrollment.id }, orderBy: { revision: 'desc' } });
    const evidence = latest.evidence as { attempts: { skill: string; attemptId: string; completedAt: string }[] };
    const reading = evidence.attempts.find(a => a.skill === 'reading')!;
    const speaking = evidence.attempts.find(a => a.skill === 'speaking')!;
    const historicalEvidence = { ...evidence, attempts: [{ ...reading, completedAt: from }, { ...reading, completedAt: from }, { ...reading, attemptId: randomUUID(), completedAt: to }, { ...reading, attemptId: randomUUID(), completedAt: '2026-09-30T23:59:59.999Z' }, { ...speaking, completedAt: from }] };
    await context.database.progressionSnapshot.create({ data: { enrollmentId: enrollment.id, programVersionId: f.versions[0]!.id, revision: latest.revision + 1, engineVersion: latest.engineVersion, policyVersion: latest.policyVersion, evidence: historicalEvidence, projection: latest.projection as Prisma.InputJsonValue, createdAt: new Date(from) } });
    await context.database.progressionSnapshot.create({ data: { enrollmentId: enrollment.id, programVersionId: f.versions[0]!.id, revision: latest.revision + 2, engineVersion: latest.engineVersion, policyVersion: latest.policyVersion, evidence: {}, projection: { ...(latest.projection as object), completed: false, ready: true }, createdAt: new Date(to) } });
    const persisted = (await admin.get(url).query({ from, to }).expect(200)).body;
    expect(persisted.summary).toMatchObject({ projectedEnrollments: 1, activityCompletedEnrollments: 1, readyEnrollments: 0 });
    expect(persisted.skills.find((s: { dimension: string }) => s.dimension === 'reading')).toMatchObject({ qualifiedAttempts: 1, meanQualifiedScore: 1 });
    expect(persisted.skills.find((s: { dimension: string }) => s.dimension === 'speaking')).toMatchObject({ pendingAttempts: 1, meanQualifiedScore: null });
    await expect(context.app.get(ProgramAnalyticsService).aggregate(learnerId, f.program.id, { from, to })).rejects.toMatchObject({ status: 403 });
    const disabled = await context.database.user.findUniqueOrThrow({ where: { email: 'analytics-admin@example.test' } });
    await context.database.user.update({ where: { id: disabled.id }, data: { status: 'DISABLED' } });
    try { await expect(context.app.get(ProgramAnalyticsService).aggregate(disabled.id, f.program.id, { from, to })).rejects.toMatchObject({ status: 403 }); }
    finally { await context.database.user.update({ where: { id: disabled.id }, data: { status: 'ACTIVE' } }); }
  }, 60000);

  it('keeps mixed sibling unit and lesson observations separate across releases', async () => {
    const f = await fixture(false, false);
    const secondLesson = await context.database.lesson.create({ data: { slug: `analytics-second-${randomUUID()}` } });
    const secondVersion = await context.database.lessonVersion.create({ data: { lessonId: secondLesson.id, title: 'Sibling lesson', sourceHash: 'synthetic-analytics-sibling', version: 1, status: 'PUBLISHED', parsedContent: f.lesson.parsedContent! } });
    const secondMission = await context.database.mission.create({ data: { levelId: f.level.id, slug: `analytics-sibling-${randomUUID()}`, title: 'Sibling unit', objective: 'Second lesson', order: 2, status: 'PUBLISHED' } });
    await context.database.missionLesson.create({ data: { missionId: secondMission.id, lessonId: secondLesson.id, order: 1 } });
    const secondRevision = await context.database.curriculumRevision.create({ data: { missionId: secondMission.id, revision: 1, snapshot: f.revision.snapshot!, lessons: { create: { lessonVersionId: secondVersion.id, order: 1 } } } });
    const content = structuredClone(f.content);
    const sibling = structuredClone(content.curriculumBindings[0]!);
    sibling.curriculumRevisionId = secondRevision.id; sibling.missionId = secondMission.id; sibling.title = 'Sibling unit'; sibling.order = 2;
    sibling.lessons[0]!.lessonVersionId = secondVersion.id; sibling.lessons[0]!.title = 'Sibling lesson';
    content.curriculumBindings.push(sibling);
    // Deliberately dated persisted observations test aggregation, not grader qualification.
    for (const v of f.versions) {
      await context.database.programVersion.update({ where: { id: v.id }, data: { snapshot: content, curriculumRevisionIds: [f.revision.id, secondRevision.id] } });
      await context.database.programVersion.update({ where: { id: v.id }, data: { status: 'PUBLISHED' } });
    }
    const enrollment = await context.database.learnerProgramEnrollment.create({ data: { learnerId, programId: f.program.id, programVersionId: f.versions[0]!.id, curriculumRevisionIds: [f.revision.id, secondRevision.id], createdAt: new Date(from) } });
    await context.database.progressionSnapshot.create({ data: { enrollmentId: enrollment.id, programVersionId: f.versions[0]!.id, revision: 1, engineVersion: 'program-progression-v1', policyVersion: '1', createdAt: new Date(from), evidence: {}, projection: { completed: false, ready: false, items: [
      { curriculumRevisionId: f.revision.id, lessonVersionId: f.lesson.id, completed: true, ready: true },
      { curriculumRevisionId: secondRevision.id, lessonVersionId: secondVersion.id, completed: false, ready: false },
    ] } } });
    const result = programAnalyticsSchema.parse((await admin.get(`/api/v1/admin/learning-programs/${f.program.id}/analytics`).query({ from, to }).expect(200)).body);
    const first = result.nodes.items.filter(n => n.versionId === f.versions[0]!.id);
    expect(first).toHaveLength(5);
    expect(first.find(n => n.type === 'stage')).toMatchObject({ observedEnrollments: 1, completedEnrollments: 0, readyEnrollments: 0, completionRate: 0 });
    for (const type of ['unit', 'lesson']) {
      expect(first.find(n => n.type === type && n.curriculumRevisionId === f.revision.id)).toMatchObject({ completedEnrollments: 1, readyEnrollments: 1, completionRate: 1 });
      expect(first.find(n => n.type === type && n.curriculumRevisionId === secondRevision.id)).toMatchObject({ completedEnrollments: 0, readyEnrollments: 0, completionRate: 0 });
    }
    expect(result.nodes.items.filter(n => n.versionId === f.versions[1]!.id)).toHaveLength(5);
    expect(result.nodes.items.filter(n => n.versionId === f.versions[1]!.id).every(n => n.totalEnrollments === 0)).toBe(true);
    expect(result.versions.items.map(v => [v.totalEnrollments, v.activityCompletedEnrollments, v.readyEnrollments])).toEqual([[1, 0, 0], [0, 0, 0]]);
  });

  it('authors exact real A2 source references with immutable provenance and rejects invalid vocabulary through HTTP', async () => {
    const real = JSON.parse(readFileSync('test/fixtures/r2-vocabulary-source.json', 'utf8')) as {
      source: Prisma.VocabularySourceCreateInput; document: Prisma.VocabularyDocumentUncheckedCreateInput;
      entry: Prisma.LexicalEntryCreateInput; sense: Prisma.LexicalSenseUncheckedCreateInput;
      occurrence: Prisma.VocabularySourceEntryUncheckedCreateInput; resolution: Prisma.VocabularyEntryResolutionUncheckedCreateInput;
      pronunciation: Prisma.LexicalPronunciationUncheckedCreateInput; cefr: Prisma.LexicalCefrAssociationUncheckedCreateInput;
    };
    await context.database.vocabularySource.create({ data: real.source });
    await context.database.vocabularyDocument.create({ data: real.document });
    await context.database.lexicalEntry.create({ data: real.entry });
    await context.database.lexicalSense.create({ data: real.sense });
    await context.database.vocabularySourceEntry.create({ data: real.occurrence });
    await context.database.vocabularyEntryResolution.create({ data: real.resolution });
    await context.database.lexicalPronunciation.create({ data: real.pronunciation });
    await context.database.lexicalCefrAssociation.create({ data: real.cefr });
    const f = await fixture();
    const base = `/api/v1/admin/learning-programs/${f.program.id}`;
    const collection = (await admin.post('/api/v1/admin/vocabulary/collections').send({ name: 'Actual A2 source fixture', type: 'LESSON', ownerReference: 'r2-disposable-source-copy' }).expect(201)).body;
    const vocabularyVersion = (await admin.post(`/api/v1/admin/vocabulary/collections/${collection.id}/versions`).send({ senseIds: [real.sense.id] }).expect(201)).body;
    await admin.post(`/api/v1/admin/vocabulary/versions/${vocabularyVersion.id}/publish`).send({}).expect(200);
    await admin.post(`/api/v1/admin/vocabulary/versions/${vocabularyVersion.id}/bindings`).send({ missionId: f.mission.id }).expect(201);
    const options = (await admin.get(`${base}/authoring-options`).expect(200)).body;
    expect(options.vocabularyLibrary).toEqual({ searchPath: '/api/v1/admin/vocabulary/entries', detailPath: '/api/v1/admin/vocabulary/entries/:id', provenancePath: '/api/v1/admin/vocabulary/entries/:id/provenance' });
    expect(options.items[0].lessons[0].vocabularyRefs[0]).toMatchObject({ lexicalEntryId: real.entry.id, senseId: real.sense.id, provenance: { sourceId: real.source.id, cefrAssociations: [{ cefrLevel: 'A2', sourceEntryId: real.occurrence.id }] } });
    const detail = (await admin.get(`/api/v1/admin/vocabulary/entries/${real.entry.id}`).expect(200)).body;
    expect(detail).toMatchObject({ id: 'f645a610-9c89-48c8-b029-1ef6ba81a583', canonicalForm: 'from', cefrAssociations: [{ cefrLevel: 'A2' }] });
    const found = (await admin.get('/api/v1/admin/vocabulary/entries').query({ search: 'from', cefr: 'A2' }).expect(200)).body;
    expect(found.items.map((e: { id: string }) => e.id)).toContain(real.entry.id);
    const provenance = (await admin.get(`/api/v1/admin/vocabulary/entries/${real.entry.id}/provenance`).expect(200)).body;
    expect(provenance.items[0]).toMatchObject({ sourceEntryId: real.occurrence.id, senseId: real.sense.id, sourceEntry: { cefrLevel: 'A2', document: { source: { permissionReference: real.source.permissionReference, attributionRequirements: real.source.attributionRequirements } } } });
    const content = structuredClone(f.content);
    const ref = { lexicalEntryId: real.entry.id!, senseId: real.sense.id! };
    content.curriculumBindings[0]!.lessons[0]!.vocabularyRefs = [{ ...ref, provenance: { sourceId: randomUUID(), rightsBasis: 'Caller spoof', permissionReference: 'Caller spoof', attributionRequirements: 'Caller spoof', cefrAssociations: [{ cefrLevel: 'C2', sourceEntryId: randomUUID() }] } }];
    const draft = (await admin.post(`${base}/versions`).send({ content, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(201)).body;
    expect(draft.curriculumBindings[0].lessons[0].vocabularyRefs[0]).toEqual({ ...ref, provenance: { sourceId: real.source.id, rightsBasis: real.sense.rightsBasis, permissionReference: real.source.permissionReference, attributionRequirements: real.source.attributionRequirements, cefrAssociations: [{ cefrLevel: 'A2', sourceEntryId: real.occurrence.id }] } });
    const otherEntry = await context.database.lexicalEntry.create({ data: { language: 'en', canonicalForm: 'Synthetic mismatch', normalizedForm: 'synthetic mismatch', partOfSpeech: 'NOUN', editorialStatus: 'REVIEWED' } });
    for (const [refs, status] of [[[ref, { lexicalEntryId: ref.lexicalEntryId.toUpperCase(), senseId: ref.senseId.toUpperCase() }], 400], [[{ lexicalEntryId: otherEntry.id, senseId: ref.senseId }], 422], [[{ lexicalEntryId: ref.lexicalEntryId, senseId: randomUUID() }], 404]] as const) {
      const invalid = structuredClone(content);
      invalid.curriculumBindings[0]!.lessons[0]!.vocabularyRefs = [...refs];
      await admin.post(`${base}/versions`).send({ content: invalid, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(status);
    }
    const unsafe = structuredClone(content);
    unsafe.curriculumBindings[0]!.lessons[0]!.resourceRefs = [{ id: 'unsafe', type: 'reference', url: 'javascript:alert(1)' }];
    await admin.post(`${base}/versions`).send({ content: unsafe, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(422);
    await context.database.vocabularySource.update({ where: { id: real.source.id! }, data: { rightsStatus: 'REVOKED' } });
    await admin.post(`${base}/versions`).send({ content, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(422);
    // Restore fixture authorization and verify authoring did not alter master data.
    await context.database.vocabularySource.update({ where: { id: real.source.id! }, data: { rightsStatus: 'APPROVED' } });
    expect((await admin.get(`/api/v1/admin/vocabulary/entries/${real.entry.id}`).expect(200)).body).toEqual(detail);
    expect((await admin.get('/api/v1/admin/vocabulary/entries').query({ cefr: 'C2' }).expect(200)).body.total).toBe(0);
    await learner.get(`/api/v1/admin/vocabulary/entries/${real.entry.id}`).expect(403);
  });
});
