import { z } from 'zod';

export const adminCurriculumErrorCodes = [
  'NOT_FOUND',
  'CURRICULUM_REVISION_CONFLICT',
  'CURRICULUM_ARCHIVE_BLOCKED',
  'CURRICULUM_NOT_PLAYABLE',
  'IDEMPOTENCY_CONFLICT',
  'INVALID_CURRICULUM_RELATIONSHIP',
] as const;

export type AdminCurriculumErrorCode = (typeof adminCurriculumErrorCodes)[number];

export const contentStatusEnum = z.enum(['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED']);
export type ContentStatusDto = z.infer<typeof contentStatusEnum>;

export const missionPurposeEnum = z.enum(['LEARNING', 'PLACEMENT']);
export type MissionPurposeDto = z.infer<typeof missionPurposeEnum>;

// Command schemas
export const createLearningPathInputSchema = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(1, 'Path name is required'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/u, 'Slug must contain only lowercase letters, numbers and hyphens'),
});
export type CreateLearningPathInput = z.infer<typeof createLearningPathInputSchema>;

export const updateLearningPathInputSchema = z.object({
  expectedRevision: z.number().int().positive('expectedRevision must be a positive integer'),
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(1, 'Path name is required').optional(),
});
export type UpdateLearningPathInput = z.infer<typeof updateLearningPathInputSchema>;

export const publishLearningPathInputSchema = z.object({
  expectedRevision: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});
export type PublishLearningPathInput = z.infer<typeof publishLearningPathInputSchema>;

export const archiveLearningPathInputSchema = z.object({
  expectedRevision: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});
export type ArchiveLearningPathInput = z.infer<typeof archiveLearningPathInputSchema>;

export const createLevelInputSchema = z.object({
  cefrReference: z.string().trim().min(1, 'CEFR reference is required'),
  code: z
    .string()
    .trim()
    .min(1, 'Level code is required')
    .regex(/^[A-Z0-9_]+$/u, 'Code must contain uppercase letters, numbers and underscores'),
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(1, 'Level name is required'),
  order: z.number().int().positive().optional(),
  pathId: z.string().uuid(),
});
export type CreateLevelInput = z.infer<typeof createLevelInputSchema>;

export const updateLevelInputSchema = z.object({
  cefrReference: z.string().trim().min(1, 'CEFR reference is required').optional(),
  expectedRevision: z.number().int().positive('expectedRevision must be a positive integer'),
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(1, 'Level name is required').optional(),
});
export type UpdateLevelInput = z.infer<typeof updateLevelInputSchema>;

export const publishLevelInputSchema = z.object({
  expectedRevision: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});
export type PublishLevelInput = z.infer<typeof publishLevelInputSchema>;

export const archiveLevelInputSchema = z.object({
  expectedRevision: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});
export type ArchiveLevelInput = z.infer<typeof archiveLevelInputSchema>;

export const createMissionInputSchema = z.object({
  idempotencyKey: z.string().uuid(),
  levelId: z.string().uuid(),
  objective: z.string().trim().min(1, 'Objective is required'),
  order: z.number().int().positive().optional(),
  purpose: missionPurposeEnum.default('LEARNING'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/u, 'Slug must contain only lowercase letters, numbers and hyphens'),
  title: z.string().trim().min(1, 'Title is required'),
});
export type CreateMissionInput = z.infer<typeof createMissionInputSchema>;

export const updateMissionInputSchema = z.object({
  expectedRevision: z.number().int().positive('expectedRevision must be a positive integer'),
  idempotencyKey: z.string().uuid(),
  objective: z.string().trim().min(1, 'Objective is required').optional(),
  title: z.string().trim().min(1, 'Title is required').optional(),
});
export type UpdateMissionInput = z.infer<typeof updateMissionInputSchema>;

export const publishMissionInputSchema = z.object({
  expectedRevision: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});
export type PublishMissionInput = z.infer<typeof publishMissionInputSchema>;

export const archiveMissionInputSchema = z.object({
  expectedRevision: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});
export type ArchiveMissionInput = z.infer<typeof archiveMissionInputSchema>;

export const reorderCurriculumInputSchema = z.object({
  idempotencyKey: z.string().uuid(),
  orderedIds: z
    .array(z.string().uuid())
    .min(1, 'At least one ID must be provided')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'All ordered IDs must be unique',
    }),
});
export type ReorderCurriculumInput = z.infer<typeof reorderCurriculumInputSchema>;

export const replaceMissionLessonsInputSchema = z.object({
  expectedRevision: z.number().int().positive('expectedRevision must be a positive integer'),
  idempotencyKey: z.string().uuid(),
  lessonIds: z
    .array(z.string().uuid())
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'All lesson IDs must be unique',
    }),
});
export type ReplaceMissionLessonsInput = z.infer<typeof replaceMissionLessonsInputSchema>;

// Tree DTO schemas
export const adminLessonSummarySchema = z.object({
  currentPublishedVersionId: z.string().uuid().nullable(),
  currentPublishedVersionNumber: z.number().int().positive().nullable(),
  hasAudio: z.boolean(),
  id: z.string().uuid(),
  order: z.number().int(),
  slug: z.string(),
  title: z.string().nullable(),
});
export type AdminLessonSummaryDto = z.infer<typeof adminLessonSummarySchema>;

export const adminMissionItemSchema = z.object({
  archiveBlockers: z.array(z.string()),
  id: z.string().uuid(),
  isPlayable: z.boolean(),
  lessons: z.array(adminLessonSummarySchema),
  levelId: z.string().uuid(),
  objective: z.string(),
  order: z.number().int(),
  playabilityReasons: z.array(z.string()),
  purpose: missionPurposeEnum,
  revision: z.number().int(),
  slug: z.string(),
  status: contentStatusEnum,
  title: z.string(),
});
export type AdminMissionItemDto = z.infer<typeof adminMissionItemSchema>;

export const adminLevelItemSchema = z.object({
  archiveBlockers: z.array(z.string()),
  cefrReference: z.string(),
  code: z.string(),
  id: z.string().uuid(),
  isPlayable: z.boolean(),
  missions: z.array(adminMissionItemSchema),
  name: z.string(),
  order: z.number().int(),
  pathId: z.string().uuid(),
  playabilityReasons: z.array(z.string()),
  revision: z.number().int(),
  status: contentStatusEnum,
});
export type AdminLevelItemDto = z.infer<typeof adminLevelItemSchema>;

export const adminLearningPathItemSchema = z.object({
  archiveBlockers: z.array(z.string()),
  id: z.string().uuid(),
  levels: z.array(adminLevelItemSchema),
  name: z.string(),
  revision: z.number().int(),
  slug: z.string(),
  status: contentStatusEnum,
});
export type AdminLearningPathItemDto = z.infer<typeof adminLearningPathItemSchema>;

export const adminCurriculumTreeSchema = z.object({
  paths: z.array(adminLearningPathItemSchema),
});
export type AdminCurriculumTreeDto = z.infer<typeof adminCurriculumTreeSchema>;
