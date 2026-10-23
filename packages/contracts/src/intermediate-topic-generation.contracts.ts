import { z } from 'zod';
import { aiProviderIdSchema } from './ai-settings.contracts.ts';
import { sessionDurationSchema } from './learning-session.contracts.ts';
import { intermediateTopicJsonSchema } from './intermediate-topic-json.contracts.ts';
import { topicPlanSchema } from './intermediate-topics.contracts.ts';
export const topicVocabularyDifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type TopicVocabularyDifficulty = z.infer<typeof topicVocabularyDifficultySchema>;
export const generateIntermediateTopicRequestSchema = z.strictObject({
  topicGroupId: z.uuid(), durationMinutes: sessionDurationSchema, provider: aiProviderIdSchema,
  level: z.enum(['B1', 'B2']).default('B1'), difficulty: topicVocabularyDifficultySchema.default('medium'),
});
export type GenerateIntermediateTopicRequest = z.input<typeof generateIntermediateTopicRequestSchema>;
export const generatedIntermediateTopicSchema = z.strictObject({
  topicGroupId: z.uuid(), topic: intermediateTopicJsonSchema, plan: topicPlanSchema,
  provider: aiProviderIdSchema, model: z.string().min(1),
});
export type GeneratedIntermediateTopic = z.infer<typeof generatedIntermediateTopicSchema>;
