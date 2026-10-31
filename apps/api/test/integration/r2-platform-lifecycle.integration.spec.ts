import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ProgramVersionInput } from '@worklingo/contracts';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { AdminProgramsService } from '../../src/learning-programs/application/admin-programs.service.js';
import { ProgramVersionsService } from '../../src/learning-programs/application/program-versions.service.js';
import { ProgramEnrollmentsService } from '../../src/learning-programs/application/program-enrollments.service.js';
import { createLearningSessionTestContext, registerLearner, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('R2 platform release lifecycle and enrollment API', () => {
  let context: LearningSessionTestContext;
  let admin: ReturnType<typeof request.agent>;
  let learner: ReturnType<typeof request.agent>;
  let learnerId: string;
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL?.includes(':55447/')) throw Error('DISPOSABLE_R2_DATABASE_REQUIRED');
    context = await createLearningSessionTestContext('r2_lifecycle', { migrationConfig: 'prisma.r2.config.ts' });
    const email = 'r2-release-admin@example.test';
    await seedContentAdmin(context.database, { email, password: 'R2-Synthetic-Admin-123!' });
    admin = request.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send({ email, password: 'R2-Synthetic-Admin-123!' }).expect(200);
    learner = await registerLearner(context.app, { email: 'r2-release-learner@example.test', displayName: 'Synthetic learner' });
    learnerId = (await context.database.user.findUniqueOrThrow({ where: { email: 'r2-release-learner@example.test' } })).id;
  }, 60_000);
  afterAll(async () => { await context?.close(); });

  async function fixture() {
    const suffix = randomUUID();
    const program = await admin.post('/api/v1/admin/learning-programs').send({ slug: `release-${suffix}`, name: 'Release course', description: 'Source validated release', learningGoal: 'Practice English', proficiencyLabel: 'A1–A2', iconKey: 'intermediate', displayOrder: 100 + await context.database.learningProgram.count(), idempotencyKey: randomUUID() }).expect(201);
    const path = await context.database.learningPath.create({ data: { programId: program.body.id, name: 'Release path', slug: `path-${suffix}`, status: 'PUBLISHED' } });
    const level = await context.database.level.create({ data: { pathId: path.id, name: 'Release stage', code: `REL_${suffix}`, cefrReference: 'A1', order: 1, status: 'PUBLISHED' } });
    const mission = await context.database.mission.create({ data: { levelId: level.id, slug: `unit-${suffix}`, title: 'Release unit', objective: 'Use workplace English', order: 1, status: 'PUBLISHED' } });
    const version = await context.database.lessonVersion.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
    const snapshot = lessonSnapshotSchema.parse(version.parsedContent);
    const activity = snapshot.activities.find(row => row.skills.length)!;
    await context.database.missionLesson.create({ data: { missionId: mission.id, lessonId: version.lessonId, order: 1 } });
    const revision = await context.database.curriculumRevision.create({ data: { missionId: mission.id, revision: 1, snapshot: { category: 'grammar', prerequisiteRevisionIds: [], objectives: [{ slug: 'workplace', statement: 'Use workplace English', required: true, skills: [activity.skills[0]!], evidence: [{ lessonVersionId: version.id, activitySlug: activity.slug, languageBlockSlugs: [] }] }] }, lessons: { create: { lessonVersionId: version.id, order: 1 } } } });
    const content: ProgramVersionInput = { title: 'Release course', description: 'Source validated release', objectives: ['Use workplace English'], estimatedMinutes: 45, difficulty: 'A1–A2', supportedLanguages: ['en'], audiences: ['adult'], policy: { version: 1, sequential: { stages: true, units: true, lessons: true }, completion: { requiredActivityRatio: 1 }, mastery: { required: false, threshold: 0.8, minimumQualifiedAttempts: 1 }, retry: { maxAttempts: 3, cooldownMinutes: 0 }, remediation: { enabled: true, afterAttempts: 2 }, review: { scheduleVersion: 'program-review-v1', intervalsDays: [1, 7, 30], requiredForReadiness: false } }, curriculumBindings: [{ curriculumRevisionId: revision.id, pathId: path.id, levelId: level.id, missionId: mission.id, order: 1, title: 'Release unit', objectives: ['Use workplace English'], required: true, prerequisiteRevisionIds: [], lessons: [{ lessonVersionId: version.id, order: 1, title: snapshot.title, objectives: ['Use workplace English'], estimatedMinutes: 45, difficulty: 'A1–A2', activityIds: snapshot.activities.map(row => row.id), vocabularyRefs: [], resourceRefs: [] }] }] };
    return { programId: program.body.id as string, content, learnerId };
  }
  async function publishFixture() {
    const fixtureRow = await fixture();
    const base = `/api/v1/admin/learning-programs/${fixtureRow.programId}/versions`;
    let release = (await admin.post(base).send({ content: fixtureRow.content, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(201)).body;
    for (const targetStatus of ['IN_REVIEW', 'APPROVED', 'PUBLISHED']) release = (await admin.post(`${base}/${release.id}/transition`).send({ targetStatus, expectedRevision: release.revision, idempotencyKey: randomUUID() }).expect(200)).body;
    return { ...fixtureRow, release };
  }

  it('creates a source-validated immutable release through explicit review and approval', async () => {
    const { programId, content } = await fixture();
    const base = `/api/v1/admin/learning-programs/${programId}/versions`;
    const input = { content, expectedRevision: 1, idempotencyKey: randomUUID() };
    const draft = await admin.post(base).send(input).expect(201);
    expect(draft.body).toMatchObject({ status: 'DRAFT', version: 1, revision: 1, source: 'AUTHORED' });
    expect((await admin.post(base).send(input).expect(201)).body).toEqual(draft.body);
    let release = draft.body;
    for (const targetStatus of ['IN_REVIEW', 'APPROVED', 'PUBLISHED']) {
      const command = { targetStatus, expectedRevision: release.revision, idempotencyKey: randomUUID() };
      if (targetStatus === 'PUBLISHED') {
        const results = await Promise.all([admin.post(`${base}/${release.id}/transition`).send(command), admin.post(`${base}/${release.id}/transition`).send(command)]);
        expect(results.map(row => row.status)).toEqual([200, 200]);
        expect(results[0]!.body).toEqual(results[1]!.body);
        release = results[0]!.body;
      } else release = (await admin.post(`${base}/${release.id}/transition`).send(command).expect(200)).body;
      expect(release.status).toBe(targetStatus);
    }
    await admin.put(`${base}/${release.id}`).send({ content: { ...content, title: 'Changed after publication' }, expectedRevision: release.revision, idempotencyKey: randomUUID() }).expect(409);
    const preview = await admin.get(`${base}/${release.id}/preview`).expect(200);
    expect(preview.body).toEqual(release);
  });

  it('enforces actor authorization inside legacy and release services, including replay', async () => {
    const { programId, content } = await fixture();
    const versions = context.app.get(ProgramVersionsService);
    const programs = context.app.get(AdminProgramsService);
    await expect(versions.createDraft(learnerId, programId, { content, expectedRevision: 1, idempotencyKey: randomUUID() })).rejects.toMatchObject({ status: 403 });
    await expect(programs.list(learnerId)).rejects.toMatchObject({ status: 403 });
    const email = 'r2-disabled-admin@example.test';
    await seedContentAdmin(context.database, { email, password: 'R2-Synthetic-Admin-123!' });
    const actor = await context.database.user.findUniqueOrThrow({ where: { email } });
    const input = { content, expectedRevision: 1, idempotencyKey: randomUUID() };
    await versions.createDraft(actor.id, programId, input);
    await context.database.user.update({ where: { id: actor.id }, data: { status: 'DISABLED' } });
    await expect(versions.createDraft(actor.id, programId, input)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects incomplete memberships, fabricated evidence, unsafe resources and stale writes', async () => {
    const { programId, content } = await fixture();
    const base = `/api/v1/admin/learning-programs/${programId}/versions`;
    const binding = content.curriculumBindings[0]!;
    const lesson = binding.lessons[0]!;
    for (const invalid of [
      { ...content, curriculumBindings: [{ ...binding, lessons: [{ ...lesson, activityIds: [lesson.activityIds[0]!] }] }] },
      { ...content, curriculumBindings: [{ ...binding, objectives: ['Invented objective'] }] },
      { ...content, curriculumBindings: [{ ...binding, lessons: [{ ...lesson, resourceRefs: [{ id: 'unsafe', type: 'link', url: 'javascript:alert(1)' }] }] }] },
      { ...content, curriculumBindings: [{ ...binding, pathId: randomUUID() }] },
    ]) await admin.post(base).send({ content: invalid, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(422);
    const draft = (await admin.post(base).send({ content, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(201)).body;
    const save = { content, expectedRevision: draft.revision, idempotencyKey: randomUUID() };
    const updated = (await admin.put(`${base}/${draft.id}`).send(save).expect(200)).body;
    await admin.put(`${base}/${draft.id}`).send({ ...save, idempotencyKey: randomUUID() }).expect(409);
    const transition = { targetStatus: 'IN_REVIEW', expectedRevision: updated.revision, idempotencyKey: randomUUID() };
    const concurrent = await Promise.all([admin.post(`${base}/${draft.id}/transition`).send(transition), admin.post(`${base}/${draft.id}/transition`).send(transition)]);
    expect(concurrent.map(row => row.status)).toEqual([200, 200]);
    expect(concurrent[0]!.body).toEqual(concurrent[1]!.body);
    await admin.post(`${base}/${draft.id}/transition`).send({ ...transition, idempotencyKey: randomUUID() }).expect(409);
  });

  it('clones owned draft identities, rolls back as draft, retires immutably and preserves legacy responses', async () => {
    const { programId, content } = await fixture();
    const base = `/api/v1/admin/learning-programs/${programId}`;
    let release = (await admin.post(`${base}/versions`).send({ content, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(201)).body;
    for (const targetStatus of ['IN_REVIEW', 'APPROVED', 'PUBLISHED']) release = (await admin.post(`${base}/versions/${release.id}/transition`).send({ targetStatus, expectedRevision: release.revision, idempotencyKey: randomUUID() }).expect(200)).body;
    const copy = (await admin.post(`${base}/duplicate`).send({ slug: `copy-${randomUUID()}`, name: 'Separate copy', displayOrder: 100 + await context.database.learningProgram.count(), expectedRevision: 2, idempotencyKey: randomUUID() }).expect(201)).body;
    const versions = (await admin.get(`/api/v1/admin/learning-programs/${copy.id}/versions`).expect(200)).body;
    expect(versions.items).toHaveLength(1);
    expect(versions.items[0]).toMatchObject({ status: 'DRAFT', programId: copy.id, title: 'Separate copy' });
    const cloned = versions.items[0].curriculumBindings[0];
    expect(cloned.pathId).not.toBe(content.curriculumBindings[0]!.pathId);
    expect(cloned.curriculumRevisionId).not.toBe(content.curriculumBindings[0]!.curriculumRevisionId);
    expect(cloned.lessons[0].lessonVersionId).toBe(content.curriculumBindings[0]!.lessons[0]!.lessonVersionId);
    const rollback = (await admin.post(`${base}/rollback`).send({ sourceVersionId: release.id, expectedRevision: 2, idempotencyKey: randomUUID() }).expect(200)).body;
    expect(rollback).toMatchObject({ status: 'DRAFT', version: 2 });
    const retired = (await admin.post(`${base}/versions/${release.id}/transition`).send({ targetStatus: 'RETIRED', expectedRevision: release.revision, idempotencyKey: randomUUID() }).expect(200)).body;
    expect(retired.revision).toBe(release.revision);
    expect(retired.curriculumBindings).toEqual(release.curriculumBindings);
    const archived = (await admin.post(`${base}/archive`).send({ expectedRevision: 2, idempotencyKey: randomUUID() }).expect(200)).body;
    expect(archived.availabilityStatus).toBe('DISABLED');
    const legacy = await context.database.programVersion.create({ data: { programId, version: 3, source: 'LEGACY_PIN_BACKFILL', snapshot: { metadataFidelity: 'AVAILABLE_AT_CAPTURE_NOT_HISTORICAL' }, policy: { version: 'legacy-capture-v1' }, curriculumRevisionIds: [] } });
    const readLegacy = await admin.get(`${base}/versions/${legacy.id}/preview`).expect(200);
    expect(readLegacy.body).toMatchObject({ source: 'LEGACY_PIN_BACKFILL', snapshot: { metadataFidelity: 'AVAILABLE_AT_CAPTURE_NOT_HISTORICAL' }, policy: { version: 'legacy-capture-v1' } });
    expect((await admin.get(`${base}/versions`).expect(200)).body.total).toBe(3);
  });

  it('assigns exact releases, serializes duplicate assignment and retains pins across lifecycle transitions', async () => {
    const { programId, release, content } = await publishFixture();
    const base = `/api/v1/admin/learning-programs/${programId}/enrollments`;
    const input = { learnerId, programVersionId: release.id, expectedRevision: 2, idempotencyKey: randomUUID() };
    const assigned = await Promise.all([admin.post(base).send(input), admin.post(base).send(input)]);
    expect(assigned.map(row => row.status)).toEqual([201, 201]);
    expect(assigned[0]!.body).toEqual(assigned[1]!.body);
    let enrollment = assigned[0]!.body;
    expect(enrollment).toMatchObject({ learnerId, programId, programVersionId: release.id, status: 'ACTIVE', curriculumRevisionIds: [content.curriculumBindings[0]!.curriculumRevisionId] });
    expect((await learner.get('/api/v1/me/program-enrollments').expect(200)).body.items.find((row: { id: string }) => row.id === enrollment.id)).toMatchObject({ programVersionId: release.id });
    for (const targetStatus of ['SUSPENDED', 'ACTIVE', 'WITHDRAWN', 'ACTIVE']) {
      enrollment = (await admin.post(`${base}/${enrollment.id}/transition`).send({ targetStatus, reason: 'Synthetic lifecycle command', expectedRevision: enrollment.revision, idempotencyKey: randomUUID() }).expect(200)).body;
      expect(enrollment.status).toBe(targetStatus);
      expect(enrollment.programVersionId).toBe(release.id);
    }
    await admin.post(`${base}/${enrollment.id}/transition`).send({ targetStatus: 'COMPLETED', reason: 'No evidence yet', expectedRevision: enrollment.revision, idempotencyKey: randomUUID() }).expect(422);
    const history = (await admin.get(`${base}/${enrollment.id}/history`).expect(200)).body;
    expect(history.items.map((row: { type: string }) => row.type)).toEqual(['ASSIGNED', 'SUSPENDED', 'ACTIVE', 'WITHDRAWN', 'ACTIVE']);
    expect((await admin.get(base).expect(200)).body.total).toBe(1);
  });

  it('self-enrolls with owned privacy and requires explicit reactivation without silently upgrading', async () => {
    const { programId, release, content } = await publishFixture();
    const program = await context.database.learningProgram.findUniqueOrThrow({ where: { id: programId } });
    const current = (await learner.get('/api/v1/me/program-context').expect(200)).body;
    const input = { programSlug: program.slug, expectedRevision: current.enrollment.revision, idempotencyKey: randomUUID() };
    const concurrent = await Promise.all([learner.post('/api/v1/me/program-enrollments').send(input), learner.post('/api/v1/me/program-enrollments').send(input)]);
    expect(concurrent.map(row => row.status)).toEqual([200, 200]);
    expect(concurrent[0]!.body.enrollment.id).toBe(concurrent[1]!.body.enrollment.id);
    const enrollmentId = concurrent[0]!.body.enrollment.id;
    const enrollment = (await learner.get('/api/v1/me/program-enrollments').expect(200)).body.items.find((row: { id: string }) => row.id === enrollmentId);
    expect(enrollment.programVersionId).toBe(release.id);
    await learner.post('/api/v1/me/program-enrollments').send({ ...input, expectedRevision: enrollment.revision + 1, idempotencyKey: randomUUID() }).expect(409);
    const outsider = await registerLearner(context.app, { email: `other-${randomUUID()}@example.test`, displayName: 'Other learner' });
    const outsiderId = (await context.database.user.findFirstOrThrow({ where: { displayName: 'Other learner' } })).id;
    expect((await outsider.get('/api/v1/me/program-enrollments').expect(200)).body.items.some((row: { id: string }) => row.id === enrollmentId)).toBe(false);
    await outsider.post(`/api/v1/me/program-enrollments/${enrollmentId}/withdraw`).send({ expectedRevision: enrollment.revision, reason: 'Foreign request', idempotencyKey: randomUUID() }).expect(404);
    await expect(context.app.get(ProgramEnrollmentsService).history(outsiderId, programId, enrollmentId, {}, true)).rejects.toMatchObject({ status: 404 });
    const versionBase = `/api/v1/admin/learning-programs/${programId}/versions`;
    let next = (await admin.post(versionBase).send({ content: { ...content, title: 'New release title' }, expectedRevision: 2, idempotencyKey: randomUUID() }).expect(201)).body;
    for (const targetStatus of ['IN_REVIEW', 'APPROVED', 'PUBLISHED']) next = (await admin.post(`${versionBase}/${next.id}/transition`).send({ targetStatus, expectedRevision: next.revision, idempotencyKey: randomUUID() }).expect(200)).body;
    await admin.post(`/api/v1/admin/learning-programs/${programId}/enrollments`).send({ learnerId, programVersionId: next.id, expectedRevision: 3, idempotencyKey: randomUUID() }).expect(409);
    await learner.post('/api/v1/me/program-enrollments').send({ ...input, expectedRevision: enrollment.revision, idempotencyKey: randomUUID() }).expect(200);
    expect((await learner.get('/api/v1/me/program-enrollments').expect(200)).body.items.find((row: { id: string }) => row.id === enrollmentId).programVersionId).toBe(release.id);
    const withdrawn = (await learner.post(`/api/v1/me/program-enrollments/${enrollmentId}/withdraw`).send({ expectedRevision: enrollment.revision, reason: 'Learner chose to withdraw', idempotencyKey: randomUUID() }).expect(200)).body;
    await learner.post('/api/v1/me/program-enrollments').send({ ...input, expectedRevision: withdrawn.revision, idempotencyKey: randomUUID() }).expect(409);
    await admin.post(`/api/v1/admin/learning-programs/${programId}/enrollments/${enrollmentId}/transition`).send({ targetStatus: 'ACTIVE', expectedRevision: withdrawn.revision, reason: 'Explicit resume', idempotencyKey: randomUUID() }).expect(200);
    expect((await learner.get('/api/v1/me/program-context').expect(200)).body.activeProgram.name).toBe(content.title);
    expect((await learner.get('/api/v1/learning-programs').expect(200)).body.programs.find((row: { slug: string }) => row.slug === program.slug).name).toBe('New release title');
  });

  it('rejects ineligible and foreign assignments, gates inactive session resolution and completes only with required evidence', async () => {
    const { programId, release, content } = await publishFixture();
    const foreign = await publishFixture();
    const base = `/api/v1/admin/learning-programs/${programId}/enrollments`;
    const input = { learnerId, programVersionId: release.id, expectedRevision: 2, idempotencyKey: randomUUID() };
    await admin.post(base).send({ ...input, programVersionId: foreign.release.id }).expect(422);
    const pending = await registerPendingLearner(context.app, { email: `pending-${randomUUID()}@example.test`, displayName: 'Pending learner' });
    await admin.post(base).send({ ...input, learnerId: pending.user.id }).expect(409);
    await expect(context.app.get(ProgramEnrollmentsService).assign(learnerId, programId, input)).rejects.toMatchObject({ status: 403 });
    const assigned = (await admin.post(base).send(input).expect(201)).body;
    const current = (await learner.get('/api/v1/me/program-context').expect(200)).body;
    const program = await context.database.learningProgram.findUniqueOrThrow({ where: { id: programId } });
    await learner.put('/api/v1/me/program-context').send({ programSlug: program.slug, expectedRevision: current.enrollment.revision }).expect(200);
    const activated = (await learner.get('/api/v1/me/program-enrollments').expect(200)).body.items.find((row: { id: string }) => row.id === assigned.id);
    const suspended = (await admin.post(`${base}/${assigned.id}/transition`).send({ targetStatus: 'SUSPENDED', expectedRevision: activated.revision, reason: 'Pause learning', idempotencyKey: randomUUID() }).expect(200)).body;
    await learner.post('/api/v1/learning-sessions/curriculum').send({ missionId: content.curriculumBindings[0]!.missionId, expectedCurriculumRevisionId: content.curriculumBindings[0]!.curriculumRevisionId, durationMinutes: 45, clientSessionId: randomUUID() }).expect(409);
    const resumed = (await admin.post(`${base}/${assigned.id}/transition`).send({ targetStatus: 'ACTIVE', expectedRevision: suspended.revision, reason: 'Resume learning', idempotencyKey: randomUUID() }).expect(200)).body;
    await admin.post(`${base}/${assigned.id}/transition`).send({ targetStatus: 'COMPLETED', expectedRevision: resumed.revision, reason: 'Missing required evidence', idempotencyKey: randomUUID() }).expect(422);
    await context.database.curriculumCompletion.create({ data: { enrollmentId: assigned.id, curriculumRevisionId: content.curriculumBindings[0]!.curriculumRevisionId, policyVersion: 'curriculum-activity-completion-v1', evidenceSnapshot: { fixture: 'required completion evidence' } } });
    const completeInput = { targetStatus: 'COMPLETED', expectedRevision: resumed.revision, reason: 'All required curricula complete', idempotencyKey: randomUUID() };
    const completed = (await admin.post(`${base}/${assigned.id}/transition`).send(completeInput).expect(200)).body;
    expect((await admin.post(`${base}/${assigned.id}/transition`).send(completeInput).expect(200)).body).toEqual(completed);
    expect(completed.status).toBe('COMPLETED');
    const reactivated = (await admin.post(`${base}/${assigned.id}/transition`).send({ targetStatus: 'ACTIVE', expectedRevision: completed.revision, reason: 'Explicit repeat learning', idempotencyKey: randomUUID() }).expect(200)).body;
    expect(reactivated.programVersionId).toBe(release.id);
  });

  it('bounds authoring choices and excludes retired releases from new discovery', async () => {
    const { programId, content, release } = await publishFixture();
    const base = `/api/v1/admin/learning-programs/${programId}`;
    const choices = (await admin.get(`${base}/authoring-options?page=1&limit=1`).expect(200)).body;
    expect(choices.items).toHaveLength(1);
    expect(choices.items[0]).toMatchObject({ curriculumRevisionId: content.curriculumBindings[0]!.curriculumRevisionId, title: 'Release unit', lessons: [{ lessonVersionId: content.curriculumBindings[0]!.lessons[0]!.lessonVersionId }] });
    await admin.get(`${base}/authoring-options?limit=101`).expect(400);
    const approval = { targetStatus: 'RETIRED', expectedRevision: release.revision, idempotencyKey: randomUUID() };
    const retired = await Promise.all([admin.post(`${base}/versions/${release.id}/transition`).send(approval), admin.post(`${base}/versions/${release.id}/transition`).send(approval)]);
    expect(retired.map(row => row.status)).toEqual([200, 200]);
    const program = await context.database.learningProgram.findUniqueOrThrow({ where: { id: programId } });
    expect((await learner.get('/api/v1/learning-programs').expect(200)).body.programs.find((row: { slug: string }) => row.slug === program.slug).isSelectable).toBe(false);
  });

  it.each(['DISABLED', 'PENDING'] as const)('manages existing pinned enrollments when target eligibility becomes %s', async state => {
    const { programId, release, content } = await publishFixture();
    const email = `transition-${randomUUID()}@example.test`;
    await registerLearner(context.app, { email, displayName: 'Existing enrolled learner' });
    const target = await context.database.user.findUniqueOrThrow({ where: { email } });
    const base = `/api/v1/admin/learning-programs/${programId}/enrollments`;
    const assignment = { learnerId: target.id, programVersionId: release.id, expectedRevision: 2, idempotencyKey: randomUUID() };
    let enrollment = (await admin.post(base).send(assignment).expect(201)).body;
    if (state === 'DISABLED') await context.database.user.update({ where: { id: target.id }, data: { status: 'DISABLED' } });
    else await context.database.learnerProfile.update({ where: { userId: target.id }, data: { onboardingStatus: 'PENDING' } });
    await admin.post(base).send({ ...assignment, idempotencyKey: randomUUID() }).expect(state === 'DISABLED' ? 422 : 409);
    for (const targetStatus of ['SUSPENDED', 'ACTIVE', 'WITHDRAWN', 'ACTIVE']) {
      enrollment = (await admin.post(`${base}/${enrollment.id}/transition`).send({ targetStatus, expectedRevision: enrollment.revision, reason: 'Admin manages existing enrollment', idempotencyKey: randomUUID() }).expect(200)).body;
      expect(enrollment).toMatchObject({ status: targetStatus, programVersionId: release.id, curriculumRevisionIds: [content.curriculumBindings[0]!.curriculumRevisionId] });
    }
    expect((await admin.get(`${base}/${enrollment.id}/history`).expect(200)).body.items.map((row: { type: string }) => row.type)).toEqual(['ASSIGNED', 'SUSPENDED', 'ACTIVE', 'WITHDRAWN', 'ACTIVE']);
  });

  it('captures catalog metadata from the locked program instead of caller overrides at draft save and publication', async () => {
    const { programId, content } = await fixture();
    const base = `/api/v1/admin/learning-programs/${programId}`;
    const spoofed = { ...content, catalogMetadata: { iconKey: 'toeic', displayOrder: 1 } };
    let release = (await admin.post(`${base}/versions`).send({ content: spoofed, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(201)).body;
    expect(release.catalogMetadata.iconKey).toBe('intermediate');
    const program = await context.database.learningProgram.findUniqueOrThrow({ where: { id: programId } });
    expect(release.catalogMetadata.displayOrder).toBe(program.displayOrder);
    release = (await admin.put(`${base}/versions/${release.id}`).send({ content: spoofed, expectedRevision: release.revision, idempotencyKey: randomUUID() }).expect(200)).body;
    expect(release.catalogMetadata).toEqual({ iconKey: 'intermediate', displayOrder: program.displayOrder });
    await admin.put(base).send({ name: program.name, description: program.description, learningGoal: program.learningGoal, proficiencyLabel: program.proficiencyLabel, iconKey: 'toeic', displayOrder: program.displayOrder + 1000, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(200);
    for (const targetStatus of ['IN_REVIEW', 'APPROVED', 'PUBLISHED']) release = (await admin.post(`${base}/versions/${release.id}/transition`).send({ targetStatus, expectedRevision: release.revision, idempotencyKey: randomUUID() }).expect(200)).body;
    expect(release.catalogMetadata).toEqual({ iconKey: 'toeic', displayOrder: program.displayOrder + 1000 });
  });

  it('keeps release presentation immutable after optional-label publication and authoring hierarchy edits', async () => {
    const { programId, content } = await publishFixture();
    const program = await context.database.learningProgram.findUniqueOrThrow({ where: { id: programId } });
    await admin.put(`/api/v1/admin/learning-programs/${programId}`).send({ name: program.name, description: program.description, learningGoal: program.learningGoal, proficiencyLabel: 'Unpublished authoring label', iconKey: 'toeic', displayOrder: program.displayOrder, expectedRevision: 2, idempotencyKey: randomUUID() }).expect(200);
    await context.database.learningPath.update({ where: { id: content.curriculumBindings[0]!.pathId }, data: { status: 'ARCHIVED' } });
    const published = (await learner.get('/api/v1/learning-programs').expect(200)).body.programs.find((row: { slug: string }) => row.slug === program.slug);
    expect(published).toMatchObject({ proficiencyLabel: content.difficulty, iconKey: 'intermediate', publishedPathCount: 1, publishedLevelCount: 1 });
  });
});
