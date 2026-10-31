import { z } from 'zod';
const count = z.number().int().nonnegative();
const rate = z.number().min(0).max(1).nullable();
const uuid = z.uuid().transform(value => value.toLowerCase());
export const programAnalyticsQuerySchema = z.object({
  from: z.iso.datetime(), to: z.iso.datetime(), versionId: uuid.optional(),
  versionPage: z.coerce.number().int().min(1).max(100000).default(1),
  nodePage: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict().refine(value => {
  const duration = Date.parse(value.to) - Date.parse(value.from);
  return duration > 0 && duration <= 180 * 86400000;
}, 'UTC range must be positive and at most 180 days');
const metrics = {
  totalEnrollments: count, cohortEnrollments: count,
  cohortStatus: z.object({ ACTIVE: count, SUSPENDED: count, COMPLETED: count, WITHDRAWN: count }).strict(),
  activeLearners: count, completedEnrollments: count, withdrawnEnrollments: count,
  projectedEnrollments: count, activityCompletedEnrollments: count, readyEnrollments: count,
  unknownProjectionEnrollments: count, completionRate: rate,
};
const page = { total: count, page: count, limit: z.number().int().min(1).max(100) };
export const programAnalyticsSchema = z.object({
  programId: uuid, versionId: uuid.nullable(), from: z.iso.datetime(), to: z.iso.datetime(), generatedAt: z.iso.datetime(),
  definitions: z.object({ cohort: z.string(), activity: z.string(), completion: z.string(), projection: z.string(), skills: z.string(), retention: z.string(), nodes: z.string(), review: z.string(), assessment: z.string(), comparison: z.string() }).strict(),
  summary: z.object(metrics).strict(),
  versions: z.object({ ...page, items: z.array(z.object({ versionId: uuid, version: count, title: z.string(), source: z.enum(['AUTHORED', 'LEGACY_PIN_BACKFILL']), ...metrics }).strict()).max(100) }).strict(),
  nodes: z.object({ ...page, items: z.array(z.object({ versionId: uuid, type: z.enum(['stage', 'unit', 'lesson']), pathId: uuid, levelId: uuid, missionId: uuid.nullable(), curriculumRevisionId: uuid.nullable(), lessonVersionId: uuid.nullable(), title: z.string(), totalEnrollments: count, observedEnrollments: count, unknownEnrollments: count, completedEnrollments: count, readyEnrollments: count, completionRate: rate }).strict()).max(100) }).strict(),
  skills: z.array(z.object({ dimension: z.enum(['reading', 'listening', 'speaking', 'writing', 'vocabulary', 'grammar', 'pronunciation']), qualifiedAttempts: count, pendingAttempts: count, unqualifiedAttempts: count, meanQualifiedScore: rate, unknownEnrollments: count, pendingEnrollments: count, developingEnrollments: count, masteredEnrollments: count }).strict()).length(7),
  retention: z.array(z.object({ day: z.union([z.literal(1), z.literal(7), z.literal(30)]), matureEnrollments: count, retainedEnrollments: count, rate }).strict()).length(3),
  reviews: z.object({ basis: z.literal('CURRENT'), asOf: z.iso.datetime(), scheduled: count, overdue: count, completedEventsInWindow: count }).strict(),
  assessments: z.object({ total: count, statuses: z.array(z.object({ status: z.string(), count }).strict()) }).strict(),
}).strict();
export type ProgramAnalyticsQuery = z.infer<typeof programAnalyticsQuerySchema>;
export type ProgramAnalyticsDto = z.infer<typeof programAnalyticsSchema>;
