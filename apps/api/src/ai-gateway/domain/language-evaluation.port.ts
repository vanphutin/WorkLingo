import type { LanguageEvaluation } from './language-evaluation.schema.js';

export interface LanguageEvaluationInput {
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
}
