import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { completeProgramReviewSchema, programPageSchema, programProgressHistorySchema, programProgressSchema, programRecalculateSchema, programReviewsSchema, programVersionInputSchema, sessionPlanSchema, type ProgramProgressDto, type ProgramVersionInput } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { lessonSnapshotSchema } from '../../curriculum/domain/curriculum.types.js';
import { projectProgramProgress, type ProgramEvidence } from '../domain/program-progression.js';
import { scheduleProgramReview } from '../domain/program-review.js';
import { jsonValue, parseProgramInput, programCommand, requireProgramActor } from './program-command.js';
/** Database-only release evidence adapter; deliberately independent of session and curriculum modules. */
@Injectable()
export class ProgramProgressService {
    constructor(
    @Inject(PrismaService)
    private readonly database: PrismaService) { }
    async getProgress(learnerId: string, enrollmentId: string): Promise<ProgramProgressDto> {
        return this.database.$transaction(async (tx) => { await requireProgramActor(tx, learnerId, false, false); const { enrollment, snapshot } = await this.owned(tx, learnerId, enrollmentId); return this.project(tx, enrollment, snapshot); }, { isolationLevel: 'RepeatableRead' });
    }
    async recalculate(learnerId: string, enrollmentId: string, raw: unknown) {
        const input = parseProgramInput(programRecalculateSchema, raw);
        return programCommand(this.database, learnerId, 'progress.recalculate', input.idempotencyKey, { enrollmentId, input }, async (tx) => {
            const { enrollment, snapshot } = await this.owned(tx, learnerId, enrollmentId, true);
            if (enrollment.status !== 'ACTIVE')
                throw new ConflictException('PROGRAM_ENROLLMENT_INACTIVE');
            await this.syncReviews(tx, enrollment, snapshot);
            return this.persist(tx, enrollment, snapshot, true);
        }, false);
    }
    async history(learnerId: string, enrollmentId: string, raw: unknown) {
        const query = parseProgramInput(programPageSchema, raw);
        return this.database.$transaction(async (tx) => { await requireProgramActor(tx, learnerId, false, false); await this.owned(tx, learnerId, enrollmentId); const where = { enrollmentId }; const [rows, total] = await Promise.all([tx.progressionSnapshot.findMany({ where, orderBy: { revision: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }), tx.progressionSnapshot.count({ where })]); return programProgressHistorySchema.parse({ items: rows.map(row => ({ id: row.id, revision: row.revision, createdAt: row.createdAt.toISOString(), projection: row.projection })), total, ...query }); }, { isolationLevel: 'RepeatableRead' });
    }
    async reviews(learnerId: string, enrollmentId: string, raw: unknown) {
        const query = parseProgramInput(programPageSchema, raw);
        return this.database.$transaction(async (tx) => { await requireProgramActor(tx, learnerId, false, false); await this.owned(tx, learnerId, enrollmentId); const where = { enrollmentId }; const [rows, total] = await Promise.all([tx.programReview.findMany({ where, orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit, include: { events: { orderBy: { revision: 'asc' } } } }), tx.programReview.count({ where })]); return programReviewsSchema.parse({ items: rows.map(row => ({ id: row.id, enrollmentId: row.enrollmentId, curriculumRevisionId: row.curriculumRevisionId, lessonVersionId: row.lessonVersionId, scheduleVersion: row.scheduleVersion, revision: row.revision, iteration: row.iteration, dueAt: row.dueAt.toISOString(), lastCompletedAt: row.lastCompletedAt?.toISOString() ?? null, due: row.dueAt <= new Date(), events: row.events.map(event => ({ id: event.id, learningSessionId: event.learningSessionId, revision: event.revision, type: event.type, createdAt: event.createdAt.toISOString() })) })), total, ...query }); }, { isolationLevel: 'RepeatableRead' });
    }
    async completeReview(learnerId: string, enrollmentId: string, reviewId: string, raw: unknown) {
        const input = parseProgramInput(completeProgramReviewSchema, raw);
        return programCommand(this.database, learnerId, 'reviews.complete', input.idempotencyKey, { enrollmentId, reviewId, input }, async (tx) => {
            const { enrollment, snapshot } = await this.owned(tx, learnerId, enrollmentId, true);
            if (enrollment.status !== 'ACTIVE')
                throw new ConflictException('PROGRAM_ENROLLMENT_INACTIVE');
            const review = await tx.programReview.findFirst({ where: { id: reviewId, enrollmentId } });
            if (!review)
                throw new NotFoundException('Program review not found');
            const existing = await tx.programReviewEvent.findUnique({ where: { reviewId_learningSessionId: { reviewId, learningSessionId: input.learningSessionId } } });
            if (existing?.type !== 'COMPLETED') {
                await this.syncReviews(tx, enrollment, snapshot);
                const completed = await tx.programReviewEvent.findUnique({ where: { reviewId_learningSessionId: { reviewId, learningSessionId: input.learningSessionId } } });
                if (completed?.type !== 'COMPLETED')
                    throw new UnprocessableEntityException('PROGRAM_REVIEW_SESSION_REQUIRED');
            }
            return this.persist(tx, enrollment, snapshot, false);
        }, false);
    }
    async planningOptions(tx: Prisma.TransactionClient, learnerId: string, revisionId: string | null, lessonVersionId: string) {
        if (!revisionId)
            return {};
        const enrollment = await tx.learnerProgramEnrollment.findFirst({ where: { learnerId, curriculumRevisionIds: { has: revisionId } }, include: { programVersion: true } });
        if (enrollment?.programVersion?.source !== 'AUTHORED')
            return {};
        const evidence = await this.evidence(tx, enrollment, programVersionInputSchema.parse(enrollment.programVersion.snapshot));
        const review = await tx.programReview.findUnique({ where: { enrollmentId_curriculumRevisionId_lessonVersionId: { enrollmentId: enrollment.id, curriculumRevisionId: revisionId, lessonVersionId } } });
        const since = review ? (review.lastCompletedAt ?? review.createdAt).toISOString() : null;
        return { programEnrollmentId: enrollment.id, programVersionId: enrollment.programVersionId!, missionTitle: programVersionInputSchema.parse(enrollment.programVersion.snapshot).curriculumBindings.find(b => b.curriculumRevisionId === revisionId)!.title, productivePairPerRespondBlock: true, completedActivityIds: [...new Set(evidence.attempts.filter(a => a.curriculumRevisionId === revisionId && a.lessonVersionId === lessonVersionId && (!since || a.completedAt > since)).map(a => a.activityId))] };
    }
    async forEnrollment(tx: Prisma.TransactionClient, learnerId: string, enrollmentId: string): Promise<ProgramProgressDto | null> {
        const enrollment = await tx.learnerProgramEnrollment.findFirst({ where: { id: enrollmentId, learnerId }, include: { programVersion: true } });
        if (!enrollment?.programVersion || enrollment.programVersion.source !== 'AUTHORED')
            return null;
        const owned = await this.owned(tx, learnerId, enrollmentId);
        return this.project(tx, owned.enrollment, owned.snapshot);
    }
    async assertSessionMutation(tx: Prisma.TransactionClient, learnerId: string, session: {
        curriculumRevisionId: string | null;
        lessonVersionId: string;
        missionId: string;
        id: string;
    }) {
        if (!session.curriculumRevisionId)
            return;
        const mission = await tx.mission.findUnique({ where: { id: session.missionId }, select: { level: { select: { path: { select: { programId: true } } } } } });
        const target = mission ? await tx.learnerProgramEnrollment.findUnique({ where: { learnerId_programId: { learnerId, programId: mission.level.path.programId } }, select: { id: true } }) : null;
        if (target)
            await tx.$queryRaw `SELECT "id" FROM "LearnerProgramEnrollment" WHERE "id"=${target.id}::uuid FOR UPDATE`;
        const enrollment = target ? await tx.learnerProgramEnrollment.findUnique({ where: { id: target.id }, include: { programVersion: true } }) : null;
        if (!enrollment)
            throw new ConflictException('CURRICULUM_NOT_ENROLLED');
        if (enrollment.status !== 'ACTIVE')
            throw new ConflictException('PROGRAM_ENROLLMENT_INACTIVE');
        if (enrollment.programVersion?.source !== 'AUTHORED')
            return;
        const projection = await this.forEnrollment(tx, learnerId, enrollment.id);
        const item = projection?.items.find(i => i.curriculumRevisionId === session.curriculumRevisionId && i.lessonVersionId === session.lessonVersionId && i.missionId === session.missionId);
        if (!item?.eligible)
            throw new UnprocessableEntityException({ code: 'CURRICULUM_UNAVAILABLE', reasons: item?.reasons ?? ['curriculum_not_enrolled'] });
    }
    async projectSession(sessionId: string, tx: Prisma.TransactionClient): Promise<boolean> {
        const session = await tx.learningSession.findUnique({ where: { id: sessionId } });
        if (!session?.curriculumRevisionId)
            return false;
        const row = await tx.learnerProgramEnrollment.findFirst({ where: { learnerId: session.learnerId, curriculumRevisionIds: { has: session.curriculumRevisionId } }, include: { programVersion: true } });
        if (row?.programVersion?.source !== 'AUTHORED')
            return false;
        if (session.status !== 'COMPLETED')
            return true;
        const { enrollment, snapshot } = await this.owned(tx, session.learnerId, row.id, true);
        await this.syncReviews(tx, enrollment, snapshot);
        const projection = await this.persist(tx, enrollment, snapshot, false);
        for (const binding of snapshot.curriculumBindings)
            if (projection.items.filter(i => i.curriculumRevisionId === binding.curriculumRevisionId).every(i => i.completed))
                await tx.curriculumCompletion.upsert({ where: { enrollmentId_curriculumRevisionId: { enrollmentId: enrollment.id, curriculumRevisionId: binding.curriculumRevisionId } }, create: { enrollmentId: enrollment.id, curriculumRevisionId: binding.curriculumRevisionId, policyVersion: 'program-activity-completion-v1', evidenceSnapshot: jsonValue({ sessionIds: [...new Set((await this.evidence(tx, enrollment, snapshot)).attempts.filter(a => a.curriculumRevisionId === binding.curriculumRevisionId).map(a => a.sessionId))] }) }, update: {} });
        return true;
    }
    private async owned(tx: Prisma.TransactionClient, learnerId: string, id: string, lock = false) {
        if (lock)
            await tx.$queryRaw `SELECT "id" FROM "LearnerProgramEnrollment" WHERE "id"=${id}::uuid AND "learnerId"=${learnerId}::uuid FOR UPDATE`;
        const enrollment = await tx.learnerProgramEnrollment.findFirst({ where: { id, learnerId }, include: { programVersion: true } });
        if (!enrollment)
            throw new NotFoundException('Enrollment not found');
        if (!enrollment.programVersion || enrollment.programVersion.source !== 'AUTHORED')
            throw new UnprocessableEntityException('PROGRAM_PROGRESS_LEGACY');
        if (enrollment.programVersion.programId !== enrollment.programId || JSON.stringify(enrollment.curriculumRevisionIds) !== JSON.stringify(enrollment.programVersion.curriculumRevisionIds))
            throw new ConflictException('PROGRAM_RELEASE_PIN_MISMATCH');
        return { enrollment, snapshot: programVersionInputSchema.parse(enrollment.programVersion.snapshot) };
    }
    private async evidence(tx: Prisma.TransactionClient, enrollment: Enrollment, snapshot: ProgramVersionInput): Promise<ProgramEvidence> {
        const sessions = await tx.learningSession.findMany({ where: { learnerId: enrollment.learnerId, curriculumRevisionId: { in: enrollment.curriculumRevisionIds }, status: { in: ['COMPLETED', 'PLANNED', 'IN_PROGRESS', 'PAUSED'] } }, include: { attempts: { include: { activity: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, lessonVersion: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
        const reviews = await tx.programReview.findMany({ where: { enrollmentId: enrollment.id }, orderBy: [{ curriculumRevisionId: 'asc' }, { lessonVersionId: 'asc' }], include: { events: { where: { type: 'COMPLETED' }, include: { learningSession: true }, orderBy: { revision: 'asc' } } } });
        const evidence: ProgramEvidence = { enrollmentId: enrollment.id, programVersionId: enrollment.programVersionId!, status: enrollment.status, attempts: [], resumes: [], reviews: [] };
        for (const session of sessions) {
            const binding = snapshot.curriculumBindings.find(b => b.curriculumRevisionId === session.curriculumRevisionId && b.missionId === session.missionId);
            const lesson = binding?.lessons.find(l => l.lessonVersionId === session.lessonVersionId);
            const plan = sessionPlanSchema.safeParse(session.planSnapshot);
            const content = lessonSnapshotSchema.safeParse(session.lessonVersion.parsedContent);
            if (!lesson || !plan.success || !content.success || plan.data.missionId !== session.missionId || plan.data.lessonVersionId !== lesson.lessonVersionId || plan.data.programEnrollmentId !== enrollment.id || plan.data.programVersionId !== enrollment.programVersionId)
                continue;
            const planned = plan.data.blocks.flatMap(b => b.activityIds);
            if (planned.some(id => !lesson.activityIds.includes(id)))
                continue;
            if (session.status !== 'COMPLETED') {
                evidence.resumes.push({ curriculumRevisionId: binding!.curriculumRevisionId, lessonVersionId: lesson.lessonVersionId, sessionId: session.id, createdAt: session.createdAt.toISOString() });
                continue;
            }
            if (!session.completedAt || session.currentCheckpoint !== planned.length || planned.some(id => !session.attempts.some(a => a.activityId === id && a.learnerId === enrollment.learnerId && a.sessionId === session.id && a.activity.lessonVersionId === lesson.lessonVersionId)))
                continue;
            for (const attempt of session.attempts) {
                const activity = content.data.activities.find(a => a.id === attempt.activityId);
                if (!activity || !planned.includes(attempt.activityId) || attempt.learnerId !== enrollment.learnerId || attempt.sessionId !== session.id || attempt.activity.lessonVersionId !== lesson.lessonVersionId)
                    continue;
                const deterministic = activity.activityType === 'reading' || activity.activityType === 'listening';
                const normalized = attempt.normalizedResponse;
                const answers = normalized && typeof normalized === 'object' && !Array.isArray(normalized) ? normalized.answerIndexes : null;
                const verified = deterministic && Array.isArray(answers) && answers.length === activity.payload.questions.length && answers.every(Number.isInteger) && attempt.score === activity.payload.questions.filter((q, index) => answers[index] === q.answerIndex).length / activity.payload.questions.length;
                for (const skill of activity.skills)
                    evidence.attempts.push({ enrollmentId: enrollment.id, programVersionId: enrollment.programVersionId!, curriculumRevisionId: binding!.curriculumRevisionId, lessonVersionId: lesson.lessonVersionId, activityId: attempt.activityId, attemptId: attempt.id, sessionId: session.id, skill, attemptedAt: attempt.createdAt.toISOString(), completedAt: session.completedAt.toISOString(), source: deterministic ? 'DETERMINISTIC' : 'AI', evaluationStatus: attempt.evaluationStatus, qualification: verified && attempt.evaluationStatus === 'EVALUATED' ? 'QUALIFIED' : 'PENDING', score: verified ? attempt.score : null, evaluationVersion: deterministic ? 'deterministic-v1' : 'ai-unqualified' });
            }
        }
        evidence.reviews = reviews.map(review => {
            const completed = review.events.filter(event => {
                const session = event.learningSession;
                return session?.status === 'COMPLETED' && session.learnerId === enrollment.learnerId && session.curriculumRevisionId === review.curriculumRevisionId && session.lessonVersionId === review.lessonVersionId && session.completedAt && evidence.attempts.some(a => a.sessionId === session.id && a.curriculumRevisionId === review.curriculumRevisionId && a.lessonVersionId === review.lessonVersionId);
            }).at(-1)?.learningSession?.completedAt;
            return { curriculumRevisionId: review.curriculumRevisionId, lessonVersionId: review.lessonVersionId, dueAt: review.dueAt.toISOString(), lastCompletedAt: completed?.toISOString() ?? null };
        });
        return evidence;
    }
    private async project(tx: Prisma.TransactionClient, enrollment: Enrollment, snapshot: ProgramVersionInput) { return programProgressSchema.parse(projectProgramProgress(snapshot, await this.evidence(tx, enrollment, snapshot), new Date().toISOString())); }
    private async persist(tx: Prisma.TransactionClient, enrollment: Enrollment, snapshot: ProgramVersionInput, force: boolean) {
        const evidence = await this.evidence(tx, enrollment, snapshot);
        const projection = programProgressSchema.parse(projectProgramProgress(snapshot, evidence, new Date().toISOString()));
        const hash = createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
        const latest = await tx.progressionSnapshot.findFirst({ where: { enrollmentId: enrollment.id }, orderBy: { revision: 'desc' } });
        if (force || !latest || (latest.evidence as {
            hash?: string;
        }).hash !== hash)
            await tx.progressionSnapshot.create({ data: { enrollmentId: enrollment.id, programVersionId: enrollment.programVersionId!, revision: (latest?.revision ?? 0) + 1, engineVersion: projection.engineVersion, policyVersion: '1', evidence: jsonValue({ hash, ...evidence }), projection: jsonValue(projection) } });
        return projection;
    }
    private async syncReviews(tx: Prisma.TransactionClient, enrollment: Enrollment, snapshot: ProgramVersionInput) {
        const evidence = await this.evidence(tx, enrollment, snapshot);
        const projection = projectProgramProgress(snapshot, evidence, new Date().toISOString());
        for (const item of projection.items.filter(i => i.completed)) {
            const attempts = evidence.attempts.filter(a => a.curriculumRevisionId === item.curriculumRevisionId && a.lessonVersionId === item.lessonVersionId);
            const sessions = [...new Set(attempts.map(a => a.sessionId))].map(id => ({ id, at: attempts.find(a => a.sessionId === id)!.completedAt })).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
            let review = await tx.programReview.findUnique({ where: { enrollmentId_curriculumRevisionId_lessonVersionId: { enrollmentId: enrollment.id, curriculumRevisionId: item.curriculumRevisionId, lessonVersionId: item.lessonVersionId } } });
            for (const session of sessions) {
                if (await tx.programReviewEvent.findFirst({ where: { reviewId: review?.id ?? '00000000-0000-4000-8000-000000000000', learningSessionId: session.id } }))
                    continue;
                if (!review) {
                    const covered = new Set(attempts.filter(a => a.completedAt <= session.at).map(a => a.activityId));
                    const lesson = snapshot.curriculumBindings.find(b => b.curriculumRevisionId === item.curriculumRevisionId)!.lessons.find(l => l.lessonVersionId === item.lessonVersionId)!;
                    if (covered.size / lesson.activityIds.length < snapshot.policy.completion.requiredActivityRatio)
                        continue;
                    const next = scheduleProgramReview(snapshot.policy, [{ curriculumRevisionId: item.curriculumRevisionId, lessonVersionId: item.lessonVersionId, iteration: 0 }], session.at)[0]!;
                    review = await tx.programReview.create({ data: { enrollmentId: enrollment.id, curriculumRevisionId: item.curriculumRevisionId, lessonVersionId: item.lessonVersionId, scheduleVersion: next.scheduleVersion, iteration: 0, dueAt: new Date(next.dueAt) } });
                    await tx.programReviewEvent.create({ data: { reviewId: review.id, learningSessionId: session.id, revision: 1, type: 'SCHEDULED', nextState: jsonValue(review) } });
                }
                else {
                    const last = review.lastCompletedAt ?? review.createdAt;
                    if (session.at <= last.toISOString())
                        continue;
                    const row = await tx.learningSession.findUniqueOrThrow({ where: { id: session.id } });
                    if (!row.startedAt || row.startedAt < last)
                        continue;
                    const lesson = snapshot.curriculumBindings.find(b => b.curriculumRevisionId === item.curriculumRevisionId)!.lessons.find(l => l.lessonVersionId === item.lessonVersionId)!;
                    const cycleSessions = new Set((await tx.learningSession.findMany({ where: { id: { in: sessions.map(s => s.id) }, startedAt: { gte: last } }, select: { id: true } })).map(s => s.id));
                    const cycleAttempts = attempts.filter(a => cycleSessions.has(a.sessionId) && a.completedAt > last.toISOString() && a.completedAt <= session.at);
                    if (new Set(cycleAttempts.map(a => a.activityId)).size / lesson.activityIds.length < snapshot.policy.completion.requiredActivityRatio)
                        continue;
                    const next = scheduleProgramReview(snapshot.policy, [{ curriculumRevisionId: item.curriculumRevisionId, lessonVersionId: item.lessonVersionId, iteration: review.iteration + 1, completedAt: session.at }], session.at)[0]!;
                    const updated = await tx.programReview.update({ where: { id: review.id }, data: { iteration: review.iteration + 1, revision: review.revision + 1, lastCompletedAt: new Date(session.at), dueAt: new Date(next.dueAt) } });
                    await tx.programReviewEvent.create({ data: { reviewId: review.id, learningSessionId: session.id, revision: updated.revision, type: 'COMPLETED', previousState: jsonValue(review), nextState: jsonValue(updated) } });
                    review = updated;
                }
            }
        }
    }
}
type Enrollment = Prisma.LearnerProgramEnrollmentGetPayload<{
    include: {
        programVersion: true;
    };
}>;
