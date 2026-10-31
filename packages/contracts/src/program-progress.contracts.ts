import { z } from 'zod';
import { programEnrollmentStatusSchema } from './program-platform.contracts.ts';
const uuid = z.uuid();
const date = z.iso.datetime();
export const programProgressReasonSchema = z.string().min(1).max(200);
const mastery = z.object({ status: z.enum(['UNKNOWN', 'PENDING', 'DEVELOPING', 'MASTERED']), score: z.number().min(0).max(1).nullable(), qualifiedAttempts: z.number().int().nonnegative() }).strict();
export const programProgressItemSchema = z.object({
    curriculumRevisionId: uuid, pathId: uuid, levelId: uuid, missionId: uuid, lessonVersionId: uuid,
    title: z.string(), objectives: z.array(z.string()), required: z.boolean(), order: z.number().int().positive(),
    state: z.enum(['locked', 'available', 'in_progress', 'completed']), eligible: z.boolean(), readinessReasons: z.array(programProgressReasonSchema), reasons: z.array(programProgressReasonSchema),
    completed: z.boolean(), completionRatio: z.number().min(0).max(1), ready: z.boolean(), mastery,
    attempts: z.number().int().nonnegative(), retryAt: date.nullable(), remediation: z.boolean(),
    activeSessionId: uuid.nullable(), reviewDueAt: date.nullable(), reviewCompleted: z.boolean(), estimatedMinutes: z.number().nonnegative(),
}).strict();
const aggregate = z.object({ id: uuid, title: z.string(), itemCount: z.number().int().nonnegative(), completedCount: z.number().int().nonnegative(), ready: z.boolean() }).strict();
export const programNextActionSchema = z.object({ type: z.enum(['resume', 'review', 'remediation', 'retry', 'learn', 'complete', 'wait']), curriculumRevisionId: uuid.nullable(), lessonVersionId: uuid.nullable(), sessionId: uuid.nullable(), reasons: z.array(programProgressReasonSchema) }).strict();
export const programProgressSchema = z.object({
    enrollmentId: uuid, programVersionId: uuid, status: programEnrollmentStatusSchema, engineVersion: z.literal('program-progression-v1'), policyVersion: z.literal(1), projectedAt: date,
    completed: z.boolean(), ready: z.boolean(), completionPercentage: z.number().min(0).max(100), mastery,
    evidenceDimensions: z.array(z.object({ dimension: z.enum(['vocabulary', 'grammar', 'pronunciation', 'reading', 'listening', 'speaking', 'writing']), status: z.enum(['UNKNOWN', 'PENDING', 'DEVELOPING', 'MASTERED']), score: z.number().min(0).max(1).nullable(), qualifiedAttempts: z.number().int().nonnegative(), sources: z.array(z.enum(['DETERMINISTIC', 'AI'])), reason: z.string().nullable() }).strict()),
    stages: z.array(aggregate), units: z.array(aggregate), items: z.array(programProgressItemSchema),
    estimatedRemainingMinutes: z.number().nonnegative(), nextAction: programNextActionSchema,
}).strict();
export const programRecalculateSchema = z.object({ idempotencyKey: z.uuid() }).strict();
export const completeProgramReviewSchema = z.object({ learningSessionId: uuid, idempotencyKey: z.uuid() }).strict();
export const programProgressHistorySchema = z.object({ items: z.array(z.object({ id: uuid, revision: z.number().int().positive(), createdAt: date, projection: programProgressSchema }).strict()), total: z.number().int().nonnegative(), page: z.number().int().positive(), limit: z.number().int().positive() }).strict();
export const programReviewSchema = z.object({ id: uuid, enrollmentId: uuid, curriculumRevisionId: uuid, lessonVersionId: uuid, scheduleVersion: z.literal('program-review-v1'), revision: z.number().int().positive(), iteration: z.number().int().nonnegative(), dueAt: date, lastCompletedAt: date.nullable(), due: z.boolean(), events: z.array(z.object({ id: uuid, learningSessionId: uuid.nullable(), revision: z.number().int().positive(), type: z.enum(['SCHEDULED', 'COMPLETED']), createdAt: date }).strict()) }).strict();
export const programReviewsSchema = z.object({ items: z.array(programReviewSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), limit: z.number().int().positive() }).strict();
export type ProgramProgressDto = z.infer<typeof programProgressSchema>;
export type ProgramProgressItem = z.infer<typeof programProgressItemSchema>;
