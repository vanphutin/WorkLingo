import { z } from 'zod';
import { languageEvaluationSchema, type LanguageEvaluation } from '../domain/language-evaluation.schema.js';
import { ProviderError } from '../domain/provider-errors.js';
import { languageEvaluationJsonSchema } from './openai-language-evaluation.adapter.js';
/** Opt-in local contract; production providers retain their capability contracts. */
export function constrainedChatRequest<T extends object>(request: T) {
  return { ...request, response_format: { type: 'json_schema' as const, json_schema: { name: 'worklingo_language_evaluation', strict: true, schema: languageEvaluationJsonSchema } } };
}
const responseSchema = z.object({ choices: z.array(z.object({ finish_reason: z.string(), message: z.object({ content: z.string().nullable(), refusal: z.string().nullable().optional() }) })).length(1) });
const refusalSignals = z.object({ choices: z.array(z.object({ finish_reason: z.string().optional(), message: z.object({ refusal: z.string().nullable().optional() }).optional() })) });
// The shared feedback schema strips unknown keys for legacy compatibility. This opt-in
// contract must instead match its published additionalProperties:false JSON schema.
const strictEvaluation = languageEvaluationSchema.unwrap().extend({ feedback: languageEvaluationSchema.unwrap().shape.feedback.unwrap().strict() }).strict();
export function strictChatEvaluation(raw: unknown): LanguageEvaluation {
  const signals = refusalSignals.safeParse(raw);
  if (signals.success && signals.data.choices.some(c => c.finish_reason === 'content_filter' || c.message?.refusal)) throw new ProviderError('Local refusal.', { code: 'PROVIDER_REFUSED', retryable: false });
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new ProviderError('Invalid local Chat response.', { code: 'PROVIDER_RESPONSE_INVALID', retryable: false });
  const choice = parsed.data.choices[0]!;
  if (choice.finish_reason === 'content_filter' || choice.message.refusal) throw new ProviderError('Local refusal.', { code: 'PROVIDER_REFUSED', retryable: false });
  if (choice.finish_reason !== 'stop' || !choice.message.content) throw new ProviderError('Incomplete local output.', { code: 'PROVIDER_RESPONSE_INVALID', retryable: false });
  try { return strictEvaluation.parse(JSON.parse(choice.message.content)); }
  catch { throw new ProviderError('Strict JSON schema violation.', { code: 'PROVIDER_RESPONSE_INVALID', retryable: false }); }
}
