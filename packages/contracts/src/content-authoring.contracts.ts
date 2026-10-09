import { z } from 'zod';
import type { NormalizedLessonDraft } from '@worklingo/content-format';

export const ContentAuthoringErrorCode = {
  CONTENT_PARSE_FAILED: 'CONTENT_PARSE_FAILED',
  CONTENT_VALIDATION_FAILED: 'CONTENT_VALIDATION_FAILED',
  DRAFT_REVISION_CONFLICT: 'DRAFT_REVISION_CONFLICT',
  SOURCE_HASH_MISMATCH: 'SOURCE_HASH_MISMATCH',
  AUDIO_NOT_READY: 'AUDIO_NOT_READY',
  AUDIO_SCRIPT_STALE: 'AUDIO_SCRIPT_STALE',
  VERSION_ALREADY_PUBLISHED: 'VERSION_ALREADY_PUBLISHED',
  LESSON_VERSION_IN_USE: 'LESSON_VERSION_IN_USE',
  IDEMPOTENCY_KEY_REUSED: 'IDEMPOTENCY_KEY_REUSED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export type ContentAuthoringErrorCode =
  (typeof ContentAuthoringErrorCode)[keyof typeof ContentAuthoringErrorCode];

export const contentStatusSchema = z.enum([
  'DRAFT',
  'VALIDATED',
  'PUBLISHED',
  'ARCHIVED',
]);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export const sourcePositionSchema = z.object({
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});
export type SourcePositionDto = z.infer<typeof sourcePositionSchema>;

export const sourceRangeSchema = z.object({
  start: sourcePositionSchema,
  end: sourcePositionSchema,
});
export type SourceRangeDto = z.infer<typeof sourceRangeSchema>;

export const contentIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(['error', 'warning']),
  message: z.string().min(1),
  path: z.string().optional(),
  range: sourceRangeSchema,
  suggestion: z.string().optional(),
});
export type ContentIssueDto = z.infer<typeof contentIssueSchema>;

export const contentImportSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid().nullable(),
  lessonVersionId: z.string().uuid().nullable(),
  rawSource: z.string(),
  sourceHash: z.string(),
  status: contentStatusSchema,
  draftRevision: z.number().int().positive(),
  parserVersion: z.string(),
  validationHash: z.string().nullable(),
  createdById: z.string().uuid(),
  updatedById: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContentImportDto = z.infer<typeof contentImportSchema>;

export const createContentImportSchema = z.object({
  rawSource: z.string(),
});
export type CreateContentImportInput = z.infer<typeof createContentImportSchema>;

export const updateContentSourceSchema = z.object({
  rawSource: z.string(),
  expectedDraftRevision: z.number().int().positive(),
});
export type UpdateContentSourceInput = z.infer<typeof updateContentSourceSchema>;

export const validateContentImportSchema = z.object({
  expectedDraftRevision: z.number().int().positive(),
});
export type ValidateContentImportInput = z.infer<typeof validateContentImportSchema>;

export const validateContentImportResultSchema = z.object({
  importId: z.string().uuid(),
  draftRevision: z.number().int().positive(),
  sourceHash: z.string(),
  status: contentStatusSchema,
  canPublish: z.boolean(),
  issues: z.array(contentIssueSchema),
  issuesTruncated: z.boolean(),
});
export type ValidateContentImportResult = z.infer<typeof validateContentImportResultSchema>;

export interface ContentPreviewDto {
  readonly importId: string;
  readonly draftRevision: number;
  readonly sourceHash: string;
  readonly status: ContentStatus;
  readonly normalizedDraft: NormalizedLessonDraft | null;
  readonly issues: readonly ContentIssueDto[];
  readonly canPublish: boolean;
}

export const publishContentImportSchema = z.object({
  expectedDraftRevision: z.number().int().positive(),
  expectedSourceHash: z.string().min(1),
  idempotencyKey: z.string().min(1),
});
export type PublishContentImportInput = z.infer<typeof publishContentImportSchema>;

export const publishContentImportResultSchema = z.object({
  importId: z.string().uuid(),
  lessonId: z.string().uuid(),
  lessonVersionId: z.string().uuid(),
  version: z.number().int().positive(),
  status: z.literal('PUBLISHED'),
  publishedAt: z.string(),
});
export type PublishContentImportResult = z.infer<typeof publishContentImportResultSchema>;

export const audioArtifactStatusSchema = z.enum([
  'MISSING',
  'GENERATING',
  'READY',
  'FAILED',
  'STALE',
]);
export type AudioArtifactStatus = z.infer<typeof audioArtifactStatusSchema>;

export const audioArtifactDtoSchema = z.object({
  id: z.string().uuid(),
  contentImportId: z.string().uuid(),
  audioScriptSlug: z.string(),
  scriptHash: z.string(),
  adapterName: z.string(),
  voiceConfig: z.record(z.string(), z.unknown()),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  checksum: z.string(),
  storageKey: z.string(),
  status: audioArtifactStatusSchema,
  failureSummary: z.string().nullable(),
  simulationLabel: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AudioArtifactDto = z.infer<typeof audioArtifactDtoSchema>;

export const generateAudioSchema = z.object({
  audioScriptSlug: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1),
  voiceConfig: z.record(z.string(), z.unknown()).optional(),
});
export type GenerateAudioInput = z.infer<typeof generateAudioSchema>;

export const generateAudioResultSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  audioScriptSlug: z.string().optional(),
});
export type GenerateAudioResult = z.infer<typeof generateAudioResultSchema>;

export const jobStatusSchema = z.enum([
  'PENDING', 'RUNNING', 'RETRY_WAIT', 'COMPLETED', 'FAILED',
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobDtoSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  status: jobStatusSchema,
  payload: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  errorCode: z.string().nullable(),
  retryable: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JobDto = z.infer<typeof jobDtoSchema>;
