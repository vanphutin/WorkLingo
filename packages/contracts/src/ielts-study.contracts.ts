import { z } from 'zod';
import { parseIeltsTopicManifest } from '@worklingo/content-format';
import { learningSkillSchema } from './learning-session.contracts.ts';

export const ieltsStudyDurationSchema = z.union([z.literal(90), z.literal(120), z.literal(150)]);
export type IeltsStudyDuration = z.infer<typeof ieltsStudyDurationSchema>;
export const ieltsStudyDifficultySchema = z.enum(['foundation', 'developing', 'competent', 'advanced']);
export const startIeltsTopicSessionSchema = z.object({
  clientSessionId: z.uuid(), topicVersionId: z.uuid(), packSlug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), durationMinutes: ieltsStudyDurationSchema,
}).strict();
export type StartIeltsTopicSessionInput = z.infer<typeof startIeltsTopicSessionSchema>;
export const ieltsTopicCatalogSchema = z.object({
  topics: z.array(z.object({
    id: z.uuid(), topicVersionId: z.uuid(), title: z.string(), description: z.string(),
    packs: z.array(z.object({ slug: z.string(), difficulty: ieltsStudyDifficultySchema, supportedDurations: z.array(ieltsStudyDurationSchema), chunkCount: z.number().int().nonnegative(), sampleChunks: z.array(z.object({ expression: z.string(), meaning: z.string(), pronunciation: z.string(), example: z.string() }).strict()).default([]), contexts: z.array(z.object({ slug: z.string(), title: z.string() }).strict()) }).strict()),
    activeSessionId: z.uuid().nullable(),
  }).strict()), recommendations: z.array(z.object({ topicVersionId: z.uuid(), reason: z.string() }).strict()),
}).strict();
export type IeltsTopicCatalogDto = z.infer<typeof ieltsTopicCatalogSchema>;
export const ieltsStudyProgressSchema = z.object({
  completedSessionCount: z.number().int().nonnegative(), practicedChunkCount: z.number().int().nonnegative(), masteredChunkCount: z.number().int().nonnegative(), pendingEvaluationCount: z.number().int().nonnegative(), dueReviewCount: z.number().int().nonnegative(),
  skills: z.array(z.object({ skill: learningSkillSchema, evaluatedCount: z.number().int().nonnegative(), pendingCount: z.number().int().nonnegative(), score: z.number().nullable() }).strict()),
}).strict();
export type IeltsStudyProgressDto = z.infer<typeof ieltsStudyProgressSchema>;

export const ieltsTopicContentSchema = z.unknown().transform((value, context) => {
  try { return parseIeltsTopicManifest(value); }
  catch (error) { context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Invalid topic manifest' }); return z.NEVER; }
});
export const adminIeltsTopicSchema = z.object({ id: z.uuid(), slug: z.string(), status: z.enum(['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED']), draftRevision: z.number().int().positive(), draft: ieltsTopicContentSchema, currentPublishedVersionId: z.uuid().nullable(), versions: z.array(z.object({ id: z.uuid(), version: z.number().int().positive(), status: z.string(), publishedAt: z.iso.datetime() }).strict()), updatedAt: z.iso.datetime() }).strict();
export type AdminIeltsTopicDto = z.infer<typeof adminIeltsTopicSchema>;
export const publishIeltsTopicResultSchema = z.object({ topicId: z.uuid(), topicVersionId: z.uuid(), version: z.number().int().positive(), publishedAt: z.iso.datetime() }).strict();
export type PublishIeltsTopicResult = z.infer<typeof publishIeltsTopicResultSchema>;
