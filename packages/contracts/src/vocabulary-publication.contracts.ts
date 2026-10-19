import { z } from 'zod';
export const vocabularyPublicationChoiceSchema = z.discriminatedUnion('action', [
  z.object({ sourceSlug: z.string().min(1), action: z.literal('reuse'), languageBlockId: z.uuid() }).strict(),
  z.object({ sourceSlug: z.string().min(1), action: z.literal('new') }).strict(),
]);
export const vocabularyPublicationSelectionSchema = z.object({
  reviewHash: z.string().min(1), choices: z.array(vocabularyPublicationChoiceSchema).max(500),
}).strict().refine(value => new Set(value.choices.map(choice => choice.sourceSlug)).size === value.choices.length, 'Each vocabulary entry needs one decision');
export type VocabularyPublicationSelection = z.infer<typeof vocabularyPublicationSelectionSchema>;
export const vocabularyPublicationReviewSchema = z.object({
  importId: z.uuid(), draftRevision: z.number().int().positive(), sourceHash: z.string(), reviewHash: z.string(),
  topic: z.object({ id: z.uuid(), name: z.string(), nameEn: z.string().nullable() }).nullable(),
  entries: z.array(z.object({
    sourceSlug: z.string(), sourceBankSlug: z.string(), expression: z.string(), meaning: z.string(), pronunciation: z.string(),
    candidates: z.array(z.object({
      id: z.uuid(), expression: z.string(), meaning: z.string(), pronunciation: z.string(), originBankName: z.string(),
      contextCount: z.number().int().nonnegative(), contexts: z.array(z.object({
        lessonId: z.uuid(), lessonVersionId: z.uuid(), lessonTitle: z.string(), topicGroupId: z.uuid().nullable(),
        topicName: z.string().nullable(), topicNameEn: z.string().nullable(),
      })),
    })),
  })),
});
export type VocabularyPublicationReview = z.infer<typeof vocabularyPublicationReviewSchema>;
