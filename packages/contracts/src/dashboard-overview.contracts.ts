import { z } from 'zod';
import { programContextSchema } from './program-context.contracts.ts';
import { learnerDashboardAnalyticsSchema } from './dashboard.contracts.ts';
import { engagementSummarySchema } from './engagement.contracts.ts';
import { curriculumRoadmapSchema } from './curriculum-foundation.contracts.ts';
import { sessionAvailabilitySchema } from './learning-session.contracts.ts';
import { learnerTopicSchema } from './intermediate-topics.contracts.ts';

export const learnerProgressDtoSchema = z.object({
  activityAttempts: z.number().int().nonnegative(), completedActivities: z.number().int().nonnegative(), currentLevelCode: z.string().nullable(),
  sessions: z.object({ completed: z.number().int().nonnegative(), inProgress: z.number().int().nonnegative(), paused: z.number().int().nonnegative(), planned: z.number().int().nonnegative() }),
});
export const dashboardSectionErrorSchema = z.object({ code: z.string().min(1), status: z.number().int().min(400).max(599) }).strict();
export const dashboardSectionSchema = <T extends z.ZodType>(schema: T) => z.discriminatedUnion('status', [
  z.object({ status: z.literal('ready'), data: schema }).strict(),
  z.object({ status: z.literal('error'), error: dashboardSectionErrorSchema }).strict(),
]);
export const dashboardOverviewSchema = z.object({
  programContext: programContextSchema,
  progress: dashboardSectionSchema(learnerProgressDtoSchema.nullable()),
  availability: dashboardSectionSchema(sessionAvailabilitySchema.nullable()),
  roadmap: dashboardSectionSchema(curriculumRoadmapSchema.nullable()),
  analytics: dashboardSectionSchema(learnerDashboardAnalyticsSchema),
  engagement: dashboardSectionSchema(engagementSummarySchema),
  topics: dashboardSectionSchema(z.array(learnerTopicSchema)),
}).strict();
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
