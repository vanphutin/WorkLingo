import { z } from 'zod';

const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableUuidSchema = z.uuid().nullable();

export const orientationStatusSchema = z.enum(['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED']);
export const orientationMediaKindSchema = z.enum(['AUDIO', 'IMAGE']);

export const orientationQuestionBaseSchema = z.object({
  slug: slugSchema,
  prompt: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
  answerIndex: z.number().int().nonnegative(),
  explanation: z.string().trim().min(1).max(1_000),
}).strict();

export const orientationQuestionSchema = orientationQuestionBaseSchema.superRefine((question, context) => {
  if (question.answerIndex >= question.options.length) {
    context.addIssue({
      code: 'custom',
      message: 'answerIndex must reference an existing option',
      path: ['answerIndex'],
    });
  }
});

export const orientationSlideSchema = z.object({
  id: z.uuid(),
  slug: slugSchema,
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4_000),
  transcript: z.string().trim().min(1).max(8_000),
  imageAssetId: nullableUuidSchema,
  audioAssetId: nullableUuidSchema,
  question: orientationQuestionSchema.nullable(),
}).strict();

export const orientationContentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1_000),
  slides: z.array(orientationSlideSchema).min(3).max(20),
}).strict().superRefine((content, context) => {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const [index, slide] of content.slides.entries()) {
    if (ids.has(slide.id)) {
      context.addIssue({ code: 'custom', message: 'Slide IDs must be unique', path: ['slides', index, 'id'] });
    }
    if (slugs.has(slide.slug)) {
      context.addIssue({ code: 'custom', message: 'Slide slugs must be unique', path: ['slides', index, 'slug'] });
    }
    ids.add(slide.id);
    slugs.add(slide.slug);
  }
});
export type OrientationContent = z.infer<typeof orientationContentSchema>;

export const orientationValidationIssueSchema = z.object({
  code: z.string().min(1),
  path: z.string().min(1),
  message: z.string().min(1),
}).strict();

export const orientationVersionSummarySchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  publishedAt: z.iso.datetime(),
  status: z.enum(['PUBLISHED', 'ARCHIVED']),
}).strict();

export const adminOrientationSchema = z.object({
  id: z.uuid(),
  slug: slugSchema,
  status: orientationStatusSchema,
  draftRevision: z.number().int().positive(),
  draft: orientationContentSchema,
  currentPublishedVersion: orientationVersionSummarySchema.nullable(),
  versions: z.array(orientationVersionSummarySchema),
  updatedAt: z.iso.datetime(),
}).strict();
export type AdminOrientationDto = z.infer<typeof adminOrientationSchema>;

export const updateOrientationDraftSchema = z.object({
  expectedRevision: z.number().int().positive(),
  content: orientationContentSchema,
}).strict();
export type UpdateOrientationDraftInput = z.infer<typeof updateOrientationDraftSchema>;

export const validateOrientationDraftSchema = z.object({
  expectedRevision: z.number().int().positive(),
}).strict();
export type ValidateOrientationDraftInput = z.infer<typeof validateOrientationDraftSchema>;

export const orientationValidationResultSchema = z.object({
  draftRevision: z.number().int().positive(),
  status: orientationStatusSchema,
  canPublish: z.boolean(),
  issues: z.array(orientationValidationIssueSchema),
}).strict();
export type OrientationValidationResult = z.infer<typeof orientationValidationResultSchema>;

export const publishOrientationSchema = z.object({
  expectedRevision: z.number().int().positive(),
  idempotencyKey: z.uuid(),
}).strict();
export type PublishOrientationInput = z.infer<typeof publishOrientationSchema>;

export const publishOrientationResultSchema = z.object({
  orientationId: z.uuid(),
  orientationVersionId: z.uuid(),
  version: z.number().int().positive(),
  publishedAt: z.iso.datetime(),
}).strict();
export type PublishOrientationResult = z.infer<typeof publishOrientationResultSchema>;

export const orientationMediaAssetSchema = z.object({
  id: z.uuid(),
  kind: orientationMediaKindSchema,
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  contentUrl: z.string().min(1),
}).strict();
export type OrientationMediaAssetDto = z.infer<typeof orientationMediaAssetSchema>;

export const orientationLearnerQuestionSchema = orientationQuestionBaseSchema.omit({
  answerIndex: true,
  explanation: true,
});
export const orientationLearnerSlideSchema = orientationSlideSchema.omit({ question: true }).extend({
  imageUrl: z.string().min(1).nullable().default(null),
  audioUrl: z.string().min(1).nullable().default(null),
  question: orientationLearnerQuestionSchema.nullable(),
}).strict();

export const orientationLearnerPresentationSchema = z.object({
  id: z.uuid(),
  orientationId: z.uuid(),
  title: z.string().min(1),
  version: z.number().int().positive(),
  slides: z.array(orientationLearnerSlideSchema).min(1),
}).strict();
export type OrientationLearnerPresentation = z.infer<typeof orientationLearnerPresentationSchema>;

export const orientationAnswerRecordSchema = z.object({
  questionSlug: slugSchema,
  selectedIndex: z.number().int().nonnegative(),
  correct: z.boolean(),
  answeredAt: z.iso.datetime(),
}).strict();

export const orientationProgressSchema = z.object({
  orientationVersionId: z.uuid(),
  currentSlideIndex: z.number().int().nonnegative(),
  revision: z.number().int().positive(),
  answers: z.array(orientationAnswerRecordSchema),
  completedAt: z.iso.datetime().nullable(),
}).strict();
export type OrientationProgressDto = z.infer<typeof orientationProgressSchema>;

export const orientationLearnerStateSchema = z.enum(['locked', 'available', 'in_progress', 'completed']);
export const orientationLearnerStatusSchema = z.object({
  state: orientationLearnerStateSchema,
  reasons: z.array(z.string()),
  presentation: orientationLearnerPresentationSchema.nullable(),
  progress: orientationProgressSchema.nullable(),
}).strict();
export type OrientationLearnerStatusDto = z.infer<typeof orientationLearnerStatusSchema>;

export const orientationProgressUpdateSchema = z.object({
  orientationVersionId: z.uuid(),
  expectedRevision: z.number().int().positive(),
  targetSlideIndex: z.number().int().nonnegative(),
  answer: z.object({
    questionSlug: slugSchema,
    selectedIndex: z.number().int().nonnegative(),
  }).strict().optional(),
}).strict();
export type OrientationProgressUpdateInput = z.infer<typeof orientationProgressUpdateSchema>;

export const orientationProgressResultSchema = z.object({
  progress: orientationProgressSchema,
  answerFeedback: z.object({
    questionSlug: slugSchema,
    correct: z.boolean(),
    explanation: z.string().min(1),
  }).strict().nullable(),
}).strict();
export type OrientationProgressResult = z.infer<typeof orientationProgressResultSchema>;
