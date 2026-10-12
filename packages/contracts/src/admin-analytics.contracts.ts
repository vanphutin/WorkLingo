import { z } from 'zod';

export const pilotMetricEventTypeSchema = z.enum([
  'REGISTRATION_COMPLETED',
  'ONBOARDING_CONFIRMED',
  'LEARNING_SESSION_STARTED',
  'LEARNING_SESSION_COMPLETED',
  'LEARNING_SESSION_RESUMED',
  'PLACEMENT_CONFIRMED',
  'EVALUATION_TERMINAL',
  'CONTENT_IMPORT_VALIDATED',
  'CONTENT_PUBLISHED',
  'ENGAGEMENT_TARGET_MET',
]);
export type PilotMetricEventType = z.infer<typeof pilotMetricEventTypeSchema>;

export const pilotMetricDimensionsSchema = z.object({
  durationBucket: z.enum(['45', '60', '90', '120', '150']).optional(),
  levelCode: z.string().regex(/^[A-Z0-9_]{1,64}$/u).optional(),
  missionCode: z.string().regex(/^[a-z0-9-]{1,96}$/u).optional(),
  outcome: z.enum([
    'completed',
    'failed',
    'passed',
    'reinforcement_required',
    'self_placement',
    'test_placement',
  ]).optional(),
  skill: z.enum(['reading', 'listening', 'speaking', 'writing']).optional(),
}).strict();
export type PilotMetricDimensions = z.infer<typeof pilotMetricDimensionsSchema>;

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

export const adminPilotAnalyticsQuerySchema = z.object({
  from: dateKeySchema,
  to: dateKeySchema,
}).superRefine((value, context) => {
  const from = Date.parse(`${value.from}T00:00:00.000Z`);
  const to = Date.parse(`${value.to}T00:00:00.000Z`);
  const maxRangeMs = 180 * 24 * 60 * 60 * 1_000;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    context.addIssue({ code: 'custom', message: 'from must be on or before to' });
  } else if (to - from > maxRangeMs) {
    context.addIssue({ code: 'custom', message: 'date range cannot exceed 180 days' });
  }
});
export type AdminPilotAnalyticsQuery = z.infer<typeof adminPilotAnalyticsQuerySchema>;

export const pilotMetricDefinitionSchema = z.object({
  description: z.string().min(1),
  eventType: pilotMetricEventTypeSchema,
});

export const pilotMetricDailySchema = z.object({
  count: z.number().int().nonnegative(),
  dateKey: dateKeySchema,
  dimensions: pilotMetricDimensionsSchema,
  eventType: pilotMetricEventTypeSchema,
});

const retentionPointSchema = z.object({
  cohortSize: z.number().int().nonnegative(),
  retainedCount: z.number().int().nonnegative(),
  retentionRate: z.number().min(0).max(1),
});

export const adminPilotAnalyticsResponseSchema = z.object({
  definitions: z.array(pilotMetricDefinitionSchema),
  from: dateKeySchema,
  metrics: z.array(pilotMetricDailySchema),
  retention: z.object({
    week1: retentionPointSchema,
    week4: retentionPointSchema,
  }),
  to: dateKeySchema,
});
export type AdminPilotAnalyticsResponse = z.infer<typeof adminPilotAnalyticsResponseSchema>;
