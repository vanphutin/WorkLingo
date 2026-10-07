import { z } from 'zod';

export const evaluationStatusSchema = z.enum([
  'submitted',
  'queued',
  'processing',
  'evaluated',
  'evaluation_failed',
]);
export type EvaluationStatus = z.infer<typeof evaluationStatusSchema>;

export const evaluationDimensionScoresSchema = z.object({
  taskCompletion: z.number().min(0).max(1),
  meaningAndLogic: z.number().min(0).max(1),
  targetLanguage: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  pronunciationOrFluency: z.number().min(0).max(1).nullable(),
}).readonly();
export type EvaluationDimensionScores = z.infer<typeof evaluationDimensionScoresSchema>;

export const evaluationFeedbackSchema = z.object({
  summary: z.string().min(1).max(600),
  strengths: z.array(z.string().min(1).max(300)).max(3),
  improvements: z.array(z.string().min(1).max(300)).max(3),
  correctedExample: z.string().min(1).max(1_000).nullable(),
}).readonly();
export type EvaluationFeedback = z.infer<typeof evaluationFeedbackSchema>;

export const evaluationDtoSchema = z.object({
  attemptId: z.uuid(),
  status: evaluationStatusSchema,
  transcript: z.string().max(20_000).nullable(),
  scores: evaluationDimensionScoresSchema.nullable(),
  score: z.number().min(0).max(1).nullable(),
  feedback: evaluationFeedbackSchema.nullable(),
  retryable: z.boolean(),
  recording: z.object({
    id: z.uuid(),
    retentionUntil: z.iso.datetime().nullable(),
    deletedAt: z.iso.datetime().nullable(),
  }).readonly().nullable(),
  completedAt: z.iso.datetime().nullable(),
}).readonly();
export type EvaluationDto = z.infer<typeof evaluationDtoSchema>;

export const recordingSubmissionResultSchema = z.object({
  attemptId: z.uuid(),
  recordingId: z.uuid(),
  jobId: z.uuid(),
  status: z.literal('processing'),
}).readonly();
export type RecordingSubmissionResult = z.infer<typeof recordingSubmissionResultSchema>;

export const writingDraftSchema = z.object({
  sessionId: z.uuid(),
  activityId: z.uuid(),
  text: z.string().max(20_000),
  revision: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
}).readonly();
export type WritingDraft = z.infer<typeof writingDraftSchema>;

