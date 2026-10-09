import { evaluationFeedbackSchema } from '@worklingo/contracts';
import { z } from 'zod';

export const languageEvaluationSchema = z.object({
  scores: z.object({
    taskCompletion: z.number().min(0).max(1),
    meaningAndLogic: z.number().min(0).max(1),
    targetLanguage: z.number().min(0).max(1),
    clarity: z.number().min(0).max(1),
  }).strict().readonly(),
  feedback: evaluationFeedbackSchema,
}).strict().readonly();

export type LanguageEvaluation = z.infer<typeof languageEvaluationSchema>;
