import { z } from 'zod';
import { learningProgramAvailabilityStatusSchema } from './learning-program.contracts.ts';

const count = z.number().int().nonnegative();
const ratio = z.number().min(0).max(1);
const dateKey = z.iso.date();
const program = z.object({
  id: z.string().uuid(), slug: z.string().min(1), name: z.string().min(1),
  availabilityStatus: learningProgramAvailabilityStatusSchema,
});

export const adminDashboardOverviewSchema = z.object({
  totalLearners: count, activeLearners7d: count, programEnrollments: count,
  sessionCompletionRate: ratio.nullable(),
  programs: z.array(program.extend({
    enrollments: count, publishedMissions: count, completedSessions: count, totalSessions: count,
  }).strict()),
  activity: z.array(z.object({ dateKey, startedSessions: count, completedSessions: count }).strict()).max(14),
  recentActivity: z.array(z.object({
    id: z.string().uuid(), missionTitle: z.string(), programName: z.string(), status: z.string(), updatedAt: z.iso.datetime(),
  }).strict()).max(10),
}).strict();
export type AdminDashboardOverview = z.infer<typeof adminDashboardOverviewSchema>;

export const learnerDashboardAnalyticsSchema = z.object({
  displayName: z.string(), activeProgramSlug: z.string().nullable(),
  activity: z.array(z.object({ dateKey, sessions: count, completedSessions: count }).strict()).max(14),
  accuracyTrend: z.array(z.object({ dateKey, averageScore: ratio, samples: count.positive() }).strict()).max(14),
  skills: z.array(z.object({
    skill: z.enum(['listening', 'speaking', 'reading', 'writing']), averageScore: ratio, samples: count.positive(),
  }).strict()).max(4),
  programs: z.array(program.extend({
    enrolled: z.boolean(), active: z.boolean(), currentLevelCode: z.string().nullable(),
    completedMissions: count, totalMissions: count, completedLessons: count, totalLessons: count,
  }).strict()),
}).strict();
export type LearnerDashboardAnalytics = z.infer<typeof learnerDashboardAnalyticsSchema>;
