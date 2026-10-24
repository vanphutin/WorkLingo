import { describe,expect,it } from 'vitest';
import { resolveBeginnerRubric, aggregateBeginnerEvaluation } from './beginner-rubrics.js';
const evaluation={scores:{taskCompletion:1,meaningAndLogic:.8,targetLanguage:.6,clarity:.4},feedback:{summary:'Clear',strengths:['Meaning'],improvements:['Practice'],correctedExample:'My name is An.'}};
describe('Beginner rubric registry',()=>{
  it('pins exact immutable version and aggregates guided responses without shadowing metrics',()=>{
    const rubric=resolveBeginnerRubric('beginner-guided-speaking','1','speaking');
    const result=aggregateBeginnerEvaluation(rubric,evaluation);
    expect(result.score).toBeCloseTo(.75);expect(result.scores.pronunciationOrFluency).toBeNull();
    expect(Object.isFrozen(rubric)).toBe(true);expect(Object.isFrozen(rubric.weights)).toBe(true);
    expect(resolveBeginnerRubric('beginner-short-writing','1','writing').version).toBe('1');
  });
  it.each([['unknown','1','speaking'],['beginner-guided-speaking','2','speaking'],['beginner-guided-speaking','1','writing']])('fails closed for unsupported id/version/skill', (id,version,skill)=>{
    expect(()=>resolveBeginnerRubric(id,version,skill)).toThrow('RUBRIC_VERSION_UNSUPPORTED');
  });
  it('rejects malformed provider scores instead of granting mastery',()=>{
    const rubric=resolveBeginnerRubric('beginner-short-writing','1','writing');
    expect(()=>aggregateBeginnerEvaluation(rubric,{...evaluation,scores:{...evaluation.scores,clarity:2}})).toThrow();
  });
});
