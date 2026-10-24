import { languageEvaluationSchema } from '../../ai-gateway/domain/language-evaluation.schema.js';
import type { AggregatedEvaluation } from './foundation-rubrics.js';

export interface BeginnerRubric {
  readonly id:'beginner-guided-speaking'|'beginner-short-writing';
  readonly version:'1';
  readonly activityType:'speaking'|'writing';
  readonly weights:Readonly<{taskCompletion:number;meaningAndLogic:number;targetLanguage:number;clarity:number}>;
}
const weights=Object.freeze({taskCompletion:.35,meaningAndLogic:.25,targetLanguage:.20,clarity:.20});
const registry: readonly BeginnerRubric[]=Object.freeze([
  Object.freeze({id:'beginner-guided-speaking' as const,version:'1' as const,activityType:'speaking' as const,weights}),
  Object.freeze({id:'beginner-short-writing' as const,version:'1' as const,activityType:'writing' as const,weights}),
]);
export function resolveBeginnerRubric(id:string,version:string,skill:string):BeginnerRubric {
  const rubric=registry.find(r=>r.id===id && r.version===version && r.activityType===skill);
  if(!rubric) throw new Error('RUBRIC_VERSION_UNSUPPORTED');
  return rubric;
}
export function aggregateBeginnerEvaluation(rubric:BeginnerRubric,input:unknown):AggregatedEvaluation {
  const parsed=languageEvaluationSchema.parse(input);
  const score=parsed.scores.taskCompletion*rubric.weights.taskCompletion+parsed.scores.meaningAndLogic*rubric.weights.meaningAndLogic+parsed.scores.targetLanguage*rubric.weights.targetLanguage+parsed.scores.clarity*rubric.weights.clarity;
  return {score,scores:{...parsed.scores,pronunciationOrFluency:null},feedback:parsed.feedback};
}
