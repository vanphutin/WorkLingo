import { z } from 'zod';
import { orientationLearnerPresentationSchema } from './ielts-orientation.contracts.ts';
import { ieltsStudyDurationSchema } from './ielts-study.contracts.ts';

const availabilitySchema = z.object({ available: z.boolean(), reason: z.literal('CONTENT_UNAVAILABLE').nullable(), resumeHref: z.string().startsWith('/').nullable() }).strict().refine(value => value.available ? value.reason === null : value.reason === 'CONTENT_UNAVAILABLE', 'Availability must explain missing content');
export const ieltsFlowOverviewSchema = z.object({ flowVersion: z.enum(['legacy', 'v3']), introduction: availabilitySchema, study: availabilitySchema, mock: availabilitySchema }).strict();
export type IeltsFlowOverviewDto = z.infer<typeof ieltsFlowOverviewSchema>;
export const ieltsIntroductionVisitSchema = z.object({ orientationVersionId: z.uuid(), lastSlideIndex: z.number().int().nonnegative(), visitedSlideIds: z.array(z.string()), viewedAllAt: z.iso.datetime().nullable(), revision: z.number().int().positive() }).strict();
export type IeltsIntroductionVisitDto = z.infer<typeof ieltsIntroductionVisitSchema>;
export const ieltsIntroductionSchema = z.object({ presentation: orientationLearnerPresentationSchema, visit: ieltsIntroductionVisitSchema.nullable(), currentPublishedVersionId: z.uuid().nullable() }).strict();
export type IeltsIntroductionDto = z.infer<typeof ieltsIntroductionSchema>;
export const visitIeltsIntroductionSchema = z.object({ orientationVersionId: z.uuid(), slideIndex: z.number().int().nonnegative(), expectedRevision: z.number().int().nonnegative() }).strict();
export const ieltsContentQualificationResultSchema = z.object({ canPublish: z.boolean(), supportedDurations: z.array(ieltsStudyDurationSchema), qualifiedModes: z.array(z.enum(['PRACTICE', 'EXAM_SIMULATION'])), issues: z.array(z.object({ code: z.string(), path: z.string(), message: z.string() }).strict()) }).strict();
export type IeltsContentQualificationResult = z.infer<typeof ieltsContentQualificationResultSchema>;
export const ieltsHistoryItemSchema = z.object({ kind: z.enum(['introduction', 'topic-study', 'legacy-bridge', 'legacy-integrated', 'legacy-band', 'mock']), id: z.uuid(), title: z.string(), href: z.string().startsWith('/'), updatedAt: z.iso.datetime(), state: z.enum(['viewed', 'in-progress', 'completed', 'pending-review']) }).strict();
export type IeltsHistoryItem = z.infer<typeof ieltsHistoryItemSchema>;
export const ieltsHistoryPageSchema = z.object({ items: z.array(ieltsHistoryItemSchema), nextCursor: z.string().nullable() }).strict();
export type IeltsHistoryPageDto = z.infer<typeof ieltsHistoryPageSchema>;
