import type { LanguageEvaluation } from './language-evaluation.schema.js';

export interface LanguageEvaluationInput {
  readonly routing?: { readonly userId?: string; readonly requiredProvider?: 'openai' };
  readonly activityType: 'speaking' | 'writing';
  readonly learnerResponse: string;
  readonly levelCode: string;
  readonly prompt: string;
  readonly referenceText?: string;
  readonly requiredPhrases: readonly string[];
  readonly rubricId: string;
  readonly rubricVersion: string;
}

export abstract class LanguageEvaluationPort {
  abstract evaluate(input: LanguageEvaluationInput): Promise<LanguageEvaluation>;
  evaluateWithProvenance?(input: LanguageEvaluationInput): Promise<{
    readonly evaluation: LanguageEvaluation;
    readonly provenance: { readonly providerName: string; readonly providerModel: string; readonly providerConfigVersion: string };
  }>;
}
