import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { programVersionInputSchema } from '@worklingo/contracts';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { EvaluationService } from '../../src/teacher-ai/application/evaluation.service.js';
import { CurriculumProgressService } from '../../src/curriculum-foundation/application/curriculum-progress.service.js';
import { createLearningSessionTestContext, registerLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';
describe('R2 exact lessons, review provenance and retained releases', () => {
    let context: LearningSessionTestContext;
    beforeAll(async () => { context = await createLearningSessionTestContext('r2_review_api', { migrationConfig: 'prisma.r2.config.ts' }); }, 60000);
    afterAll(async () => { await context?.close(); });
    it('selects exact lessons, completes real reviews, retains archives and guards direct session mutations', async () => {
        const suffix = randomUUID();
        const email = `admin-${suffix}@example.test`;
        await seedContentAdmin(context.database, { email, password: 'R2-Synthetic-Admin-123!' });
        const admin = request.agent(context.app.getHttpServer());
        await admin.post('/api/v1/auth/login').send({ email, password: 'R2-Synthetic-Admin-123!' }).expect(200);
        const learner = await registerLearner(context.app, { email: `learner-${suffix}@example.test`, displayName: 'Synthetic learner' });
        const slug = `review-${suffix}`;
        const program = (await admin.post('/api/v1/admin/learning-programs').send({ slug, name: 'Pinned course', description: 'Two exact lessons', learningGoal: 'Practice English', proficiencyLabel: 'A1', iconKey: 'intermediate', displayOrder: 500, idempotencyKey: randomUUID() }).expect(201)).body;
        const path = await context.database.learningPath.create({ data: { programId: program.id, name: 'Path', slug: `p-${suffix}`, status: 'PUBLISHED' } });
        const level = await context.database.level.create({ data: { pathId: path.id, name: 'Stage', code: `T_${suffix}`, cefrReference: 'A1', order: 1, status: 'PUBLISHED' } });
        const mission = await context.database.mission.create({ data: { levelId: level.id, slug: `m-${suffix}`, title: 'Pinned unit', objective: 'Practice', order: 1, status: 'PUBLISHED' } });
        const original = await context.database.lessonVersion.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
        const originalSnapshot = lessonSnapshotSchema.parse(original.parsedContent);
        const cloneSnapshot = lessonSnapshotSchema.parse({ ...originalSnapshot, title: 'Second exact lesson', activities: originalSnapshot.activities.map(a => ({ ...a, id: randomUUID() })), contentBlocks: originalSnapshot.contentBlocks.map(b => ({ ...b, id: randomUUID() })) });
        const newLesson = await context.database.lesson.create({ data: { slug: `lesson-${suffix}` } });
        const clone = await context.database.lessonVersion.create({ data: { lessonId: newLesson.id, version: 1, title: cloneSnapshot.title, sourceHash: randomUUID(), parsedContent: cloneSnapshot as Prisma.InputJsonValue } });
        for (const [order, block] of cloneSnapshot.contentBlocks.entries())
            await context.database.contentBlock.create({ data: { id: block.id, slug: block.slug, type: block.type, text: block.text, metadata: block.audio ? { audio: block.audio } : {}, order, lessonVersionId: clone.id } });
        for (const activity of cloneSnapshot.activities)
            await context.database.activity.create({ data: { ...activity, payload: activity.payload as Prisma.InputJsonValue, lessonVersionId: clone.id } });
        for (const bank of await context.database.lessonVersionWordBank.findMany({ where: { lessonVersionId: original.id } }))
            await context.database.lessonVersionWordBank.create({ data: { lessonVersionId: clone.id, wordBankId: bank.wordBankId, wordBankVersionId: bank.wordBankVersionId } });
        await context.database.lessonVersion.update({ where: { id: clone.id }, data: { status: 'PUBLISHED' } });
        const versions = [original, clone];
        const snapshots = [originalSnapshot, cloneSnapshot];
        for (const [index, version] of versions.entries())
            await context.database.missionLesson.create({ data: { missionId: mission.id, lessonId: version.lessonId, order: index + 1 } });
        const objectives = versions.map((version, index) => ({ slug: `reading-${index}`, statement: `Read lesson ${index + 1}`, skills: ['reading'], required: true, evidence: [{ lessonVersionId: version.id, activitySlug: snapshots[index]!.activities.find(a => a.activityType === 'reading' && a.learningBlock !== 'activate')!.slug, languageBlockSlugs: [] }] }));
        const revision = await context.database.curriculumRevision.create({ data: { missionId: mission.id, revision: 1, snapshot: { category: 'grammar', prerequisiteRevisionIds: [], objectives }, lessons: { create: versions.map((v, index) => ({ lessonVersionId: v.id, order: index + 1 })) } } });
        await admin.post(`/api/v1/admin/learning-programs/${program.id}/publish`).send({ curriculumRevisionIds: [revision.id], expectedRevision: 1, idempotencyKey: randomUUID() }).expect(200);
        let release = (await admin.get(`/api/v1/admin/learning-programs/${program.id}/versions`).expect(200)).body.items[0];
        const keys = ['title', 'description', 'objectives', 'estimatedMinutes', 'difficulty', 'supportedLanguages', 'audiences', 'proficiencyLabel', 'catalogMetadata', 'policy', 'curriculumBindings'];
        const content = programVersionInputSchema.parse(Object.fromEntries(keys.filter(key => release[key] !== undefined).map(key => [key, release[key]])));
        content.policy.review.requiredForReadiness = true;
        release = (await admin.post(`/api/v1/admin/learning-programs/${program.id}/versions`).send({ content, expectedRevision: 2, idempotencyKey: randomUUID() }).expect(201)).body;
        for (const targetStatus of ['IN_REVIEW', 'APPROVED', 'PUBLISHED'])
            release = (await admin.post(`/api/v1/admin/learning-programs/${program.id}/versions/${release.id}/transition`).send({ targetStatus, expectedRevision: release.revision, idempotencyKey: randomUUID() }).expect(200)).body;
        const current = (await learner.get('/api/v1/me/program-context').expect(200)).body;
        const enrollment = (await learner.post('/api/v1/me/program-enrollments').send({ programSlug: slug, expectedRevision: current.enrollment.revision, idempotencyKey: randomUUID() }).expect(200)).body.enrollment;
        const url = `/api/v1/me/program-enrollments/${enrollment.id}`;
        const target = { missionId: mission.id, expectedCurriculumRevisionId: revision.id, durationMinutes: 60, clientSessionId: randomUUID() };
        expect((await learner.post('/api/v1/learning-sessions/curriculum').send(target).expect(409)).body.code).toBe('CURRICULUM_LESSON_SELECTION_REQUIRED');
        await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, lessonVersionId: clone.id }).expect(422);
        const initialProgress = (await learner.get(`${url}/progress`).expect(200)).body;
        expect(initialProgress.items[0].availableDurations).toContain(60);
        expect(initialProgress.items[0].availableDurations).not.toContain(45);
        const availability = (await learner.get('/api/v1/learning-sessions/availability').expect(200)).body;
        expect(availability.availableDurations).toEqual(initialProgress.items[0].availableDurations);
        for (const endpoint of ['/api/v1/learning-sessions', '/api/v1/learning-sessions/curriculum']) {
            const rejected = await learner.post(endpoint).send(endpoint.endsWith('/curriculum')
                ? { ...target, clientSessionId: randomUUID(), lessonVersionId: original.id, durationMinutes: 45 }
                : { clientSessionId: randomUUID(), durationMinutes: 45 }).expect(422);
            expect(rejected.body).toMatchObject({ code: 'PROGRAM_DURATION_CANNOT_COVER_PENDING_ACTIVITIES', availableDurations: initialProgress.items[0].availableDurations });
        }
        const first = (await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, lessonVersionId: original.id }).expect(201)).body;
        await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, lessonVersionId: clone.id }).expect(409);
        const finish = async (session: typeof first) => {
            await context.database.rateLimitBucket.deleteMany();
            await learner.post(`/api/v1/learning-sessions/${session.id}/start`).expect(200);
            const snapshot = snapshots[versions.findIndex(v => v.id === session.lessonVersionId)]!;
            const attempts: string[] = [];
            for (const activityId of session.plan.blocks.flatMap((b: {
                activityIds: string[];
            }) => b.activityIds)) {
                const activity = snapshot.activities.find(a => a.id === activityId)!;
                const response = activity.activityType === 'reading' || activity.activityType === 'listening' ? { answerIndexes: activity.payload.questions.map(q => q.answerIndex) } : { text: 'Hello. I work in sales. I help my team serve customers every day.' };
                const result = await learner.post(`/api/v1/activities/${activityId}/attempts`).send({ clientAttemptId: randomUUID(), sessionId: session.id, response }).expect(201);
                attempts.push(result.body.id as string);
            }
            return attempts;
        };
        const attempts = await finish(first);
        // An old overlapping session starts during study and finishes after review scheduling.
        const overlap = (await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, clientSessionId: randomUUID(), lessonVersionId: original.id }).expect(201)).body;
        await learner.post(`/api/v1/learning-sessions/${overlap.id}/start`).expect(200);
        for (let round = 0; round < 10; round++) {
            const progress = (await learner.get(`${url}/progress`).expect(200)).body;
            if (progress.items[0].completed)
                break;
            const extra = (await learner.post('/api/v1/learning-sessions').send({ durationMinutes: progress.items[0].recommendedDurationMinutes, clientSessionId: randomUUID() }).expect(201)).body;
            expect(extra.lessonVersionId).toBe(original.id);
            await finish(extra);
        }
        const progress = (await learner.get(`${url}/progress`).expect(200)).body;
        expect(progress.items[0]).toMatchObject({ completed: true, ready: false, readinessReasons: ['review_completion_required'] });
        expect(progress.items[1]).toMatchObject({ completed: false, eligible: false });
        expect(progress.evidenceDimensions.find((d: {
            dimension: string;
        }) => d.dimension === 'reading')).toMatchObject({ status: 'MASTERED', score: 1, sources: ['DETERMINISTIC'] });
        expect(progress.evidenceDimensions.find((d: {
            dimension: string;
        }) => d.dimension === 'pronunciation')).toMatchObject({ status: 'UNKNOWN', score: null, reason: 'no_qualified_foundation_evidence' });
        expect((await learner.get('/api/v1/me/curriculum-roadmap').expect(200)).body.items[0].objectives).toHaveLength(2);
        const review = (await learner.get(`${url}/reviews`).expect(200)).body.items[0];
        expect(review).toMatchObject({ iteration: 0, lastCompletedAt: null });
        await context.database.programReview.update({ where: { id: review.id }, data: { lastCompletedAt: new Date() } });
        expect((await learner.get(`${url}/progress`).expect(200)).body.items[0].reviewCompleted).toBe(false);
        await context.database.programReview.update({ where: { id: review.id }, data: { lastCompletedAt: null } });
        await learner.post(`${url}/reviews/${review.id}/complete`).send({ learningSessionId: first.id, idempotencyKey: randomUUID() }).expect(422);
        await learner.post(`${url}/recalculate`).send({ score: 1, idempotencyKey: randomUUID() }).expect(400);
        const writing = await context.database.activityAttempt.findFirstOrThrow({ where: { id: { in: attempts }, activity: { activityType: 'writing' } } });
        await context.app.get(EvaluationService).evaluateAttempt(writing.id);
        expect((await learner.get(`/api/v1/attempts/${writing.id}/evaluation`).expect(200)).body.status).toBe('evaluated');
        expect((await learner.get(`${url}/progress`).expect(200)).body.items[0].mastery.status).toBe('PENDING');
        expect(await context.database.masteryEvent.count({ where: { attemptId: writing.id } })).toBe(0);
        await finish(overlap);
        expect((await learner.get(`${url}/reviews`).expect(200)).body.items[0].iteration).toBe(0);
        const firstReview = (await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, clientSessionId: randomUUID(), lessonVersionId: original.id }).expect(201)).body;
        await finish(firstReview);
        const nextReview = (await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, clientSessionId: randomUUID(), lessonVersionId: original.id }).expect(201)).body;
        expect(nextReview.plan.blocks.flatMap((b: {activityIds: string[]}) => b.activityIds)).toEqual(overlap.plan.blocks.flatMap((b: {activityIds: string[]}) => b.activityIds));
        await finish(nextReview);
        let lastReviewSession = nextReview.id as string;
        for (let round = 0; round < 10; round++) {
            if ((await learner.get(`${url}/reviews`).expect(200)).body.items[0].iteration === 1)
                break;
            const extra = (await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, clientSessionId: randomUUID(), lessonVersionId: original.id }).expect(201)).body;
            lastReviewSession = extra.id as string;
            await finish(extra);
        }
        const reviewed = (await learner.get(`${url}/reviews`).expect(200)).body.items[0];
        expect(reviewed.iteration).toBe(1);
        expect(reviewed.events.map((e: {
            type: string;
        }) => e.type)).toEqual(['SCHEDULED', 'COMPLETED']);
        const complete = { learningSessionId: lastReviewSession, idempotencyKey: randomUUID() };
        await Promise.all([context.app.get(CurriculumProgressService).projectSession(lastReviewSession), context.app.get(CurriculumProgressService).projectSession(lastReviewSession)]);
        await learner.post(`${url}/reviews/${review.id}/complete`).send(complete).expect(200);
        await learner.post(`${url}/reviews/${review.id}/complete`).send(complete).expect(200);
        expect((await learner.get(`${url}/reviews`).expect(200)).body.items[0].events).toHaveLength(2);
        // Each synthetic study/review phase gets its own disposable throttle fixture.
        await context.database.rateLimitBucket.deleteMany();
        const next = (await learner.post('/api/v1/learning-sessions').send({ durationMinutes: 60, clientSessionId: randomUUID() }).expect(201)).body;
        expect(next.lessonVersionId).toBe(clone.id);
        let enrollmentRow = (await learner.get('/api/v1/me/program-enrollments').expect(200)).body.items.find((e: {
            id: string;
        }) => e.id === enrollment.id);
        const transition = async (status: string) => { enrollmentRow = (await admin.post(`/api/v1/admin/learning-programs/${program.id}/enrollments/${enrollment.id}/transition`).send({ targetStatus: status, reason: 'Synthetic verification', expectedRevision: enrollmentRow.revision, idempotencyKey: randomUUID() }).expect(200)).body; };
        await transition('SUSPENDED');
        await learner.post(`/api/v1/learning-sessions/${next.id}/start`).expect(409);
        await learner.post(`/api/v1/learning-sessions/${next.id}/resume`).expect(409);
        await learner.post(`/api/v1/activities/${next.plan.blocks[0].activityIds[0]}/attempts`).send({ sessionId: next.id, clientAttemptId: randomUUID(), response: { answerIndexes: [0] } }).expect(409);
        await learner.get(`${url}/history`).expect(200);
        await learner.get(`${url}/reviews`).expect(200);
        await transition('ACTIVE');
        await learner.post(`/api/v1/learning-sessions/${next.id}/start`).expect(200);
        await transition('SUSPENDED');
        const firstActivity = cloneSnapshot.activities.find(a => a.id === next.plan.blocks[0].activityIds[0])!;
        const validResponse = firstActivity.activityType === 'reading' || firstActivity.activityType === 'listening' ? { answerIndexes: firstActivity.payload.questions.map(q => q.answerIndex) } : { text: 'Hello. I help customers every day.' };
        await learner.post(`/api/v1/activities/${firstActivity.id}/attempts`).send({ sessionId: next.id, clientAttemptId: randomUUID(), response: validResponse }).expect(409);
        expect((await learner.get(`/api/v1/learning-sessions/${next.id}`).expect(200)).body.currentCheckpoint).toBe(0);
        await transition('ACTIVE');
        await learner.post(`/api/v1/learning-sessions/${next.id}/pause`).expect(200);
        await transition('WITHDRAWN');
        await learner.post(`/api/v1/learning-sessions/${next.id}/resume`).expect(409);
        await transition('ACTIVE');
        await admin.post(`/api/v1/admin/learning-programs/${program.id}/versions/${release.id}/transition`).send({ targetStatus: 'RETIRED', expectedRevision: release.revision, idempotencyKey: randomUUID() }).expect(200);
        await admin.post(`/api/v1/admin/learning-programs/${program.id}/archive`).send({ expectedRevision: 3, idempotencyKey: randomUUID() }).expect(200);
        await context.database.mission.update({ where: { id: mission.id }, data: { status: 'ARCHIVED', title: 'Changed authoring title' } });
        await context.database.level.update({ where: { id: level.id }, data: { status: 'ARCHIVED' } });
        await context.database.learningPath.update({ where: { id: path.id }, data: { status: 'ARCHIVED' } });
        expect((await learner.get('/api/v1/me/curriculum-roadmap').expect(200)).body.items[0]).toMatchObject({ title: 'Pinned unit', state: 'in_progress' });
        const before = (await learner.get('/api/v1/me/program-context').expect(200)).body;
        const away = (await learner.put('/api/v1/me/program-context').send({ programSlug: 'intermediate', expectedRevision: before.enrollment.revision }).expect(200)).body;
        await learner.put('/api/v1/me/program-context').send({ programSlug: slug, expectedRevision: away.enrollment.revision }).expect(200);
        await learner.post(`/api/v1/learning-sessions/${next.id}/resume`).expect(200);
        expect((await learner.get(`/api/v1/learning-sessions/${next.id}`).expect(200)).body.mission.title).toBe('Pinned unit');
        await context.database.lessonVersion.update({ where: { id: clone.id }, data: { status: 'ARCHIVED' } });
        const archivedStart = await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, clientSessionId: randomUUID(), lessonVersionId: clone.id }).expect(201);
        expect(archivedStart.body.mission.title).toBe('Pinned unit');
        await finish(next);
        for (let round = 0; round < 10; round++) {
            if ((await learner.get(`${url}/progress`).expect(200)).body.items[1].completed)
                break;
            await finish((await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, clientSessionId: randomUUID(), lessonVersionId: clone.id }).expect(201)).body);
        }
        const pendingReadiness = (await learner.get(`${url}/progress`).expect(200)).body;
        expect(pendingReadiness).toMatchObject({ completed: true, ready: false });
        enrollmentRow = (await learner.get('/api/v1/me/program-enrollments').expect(200)).body.items.find((e: {
            id: string;
        }) => e.id === enrollment.id);
        const terminal = () => ({ targetStatus: 'COMPLETED', reason: 'Server-owned readiness gate', expectedRevision: enrollmentRow.revision, idempotencyKey: randomUUID() });
        await admin.post(`/api/v1/admin/learning-programs/${program.id}/enrollments/${enrollment.id}/transition`).send(terminal()).expect(422);
        for (let round = 0; round < 10; round++) {
            if ((await learner.get(`${url}/progress`).expect(200)).body.ready)
                break;
            await finish((await learner.post('/api/v1/learning-sessions/curriculum').send({ ...target, clientSessionId: randomUUID(), lessonVersionId: clone.id }).expect(201)).body);
        }
        expect((await learner.get(`${url}/progress`).expect(200)).body.ready).toBe(true);
        const completed = await admin.post(`/api/v1/admin/learning-programs/${program.id}/enrollments/${enrollment.id}/transition`).send(terminal()).expect(200);
        expect(completed.body.status).toBe('COMPLETED');
        const after = (await learner.get(`${url}/progress`).expect(200)).body;
        expect(after.programVersionId).toBe(release.id);
        expect(after.stages[0].title).toBe('Stage');
        const stored = await context.database.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
        expect(stored.programVersionId).toBe(release.id);
    }, 60000);
});
