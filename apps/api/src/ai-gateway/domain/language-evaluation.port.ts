import type { LanguageEvaluation } from './language-evaluation.schema.js';

export interface BeginnerEvaluationContextV1 {
  readonly schemaVersion: 'beginner-evaluation-context/1';
  readonly lessonVersionId: string;
  readonly activityId: string;
  readonly activitySlug: string;
  readonly roleCards: readonly { readonly slug: string; readonly text: string }[];
  // Includes acceptable alternatives exactly as authored; never synthesized from model answers.
  readonly taskCriteria: string;
}

export interface LanguageEvaluationInput {
  readonly beginnerContext?: BeginnerEvaluationContextV1;
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

/** Server-only guard;also used at serializer boundary to deny direct adapter bypass. */
export function assertBeginnerEvaluationContext(input: Pick<LanguageEvaluationInput,'activityType'|'rubricId'|'rubricVersion'|'beginnerContext'>): void {
  const context=input.beginnerContext;
  const invalid=():never=>{throw new Error('INVALID_BEGINNER_EVALUATION_CONTEXT');};
  if(!input.rubricId.startsWith('beginner-')) { if(context!==undefined)invalid(); return; }
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
  const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
  if((input.activityType!=='writing' && input.activityType!=='speaking') || input.rubricId!==(input.activityType==='speaking'?'beginner-guided-speaking':'beginner-short-writing') || input.rubricVersion!=='1' || !context || typeof context!=='object' || Array.isArray(context) || context.schemaVersion!=='beginner-evaluation-context/1' || typeof context.lessonVersionId!=='string' || !uuid.test(context.lessonVersionId) || typeof context.activityId!=='string' || !uuid.test(context.activityId) || typeof context.activitySlug!=='string' || !slug.test(context.activitySlug) || typeof context.taskCriteria!=='string' || !context.taskCriteria.trim() || !Array.isArray(context.roleCards) || !context.roleCards.length)invalid();
  if(!context!.roleCards.every(card=>card && typeof card==='object' && typeof card.slug==='string' && slug.test(card.slug) && typeof card.text==='string' && card.text.trim().length>0))invalid();
  if(new Set(context!.roleCards.map(card=>card.slug)).size!==context!.roleCards.length)invalid();
}
