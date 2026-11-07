import { describe, expect, it } from 'vitest';
import { activitySchema } from './curriculum.types.js';
const base = { id:'00000000-0000-4000-8000-000000000001',slug:'read',order:0,learningBlock:'readDecode',skills:['reading'],contentReferences:['email'],languageBlockReferences:['word'],activityType:'reading' };
const question = {slug:'q',prompt:'Why?',explanation:'Private explanation',evidence:'email:1'};
describe('authored comprehension answer contracts',()=>{
 it('accepts semantic comprehension without inventing a multiple-choice answer key',()=>{
  const result=activitySchema.safeParse({...base,payload:{prompt:'Read',questions:[{...question,responseType:'open_ended',semanticCriteria:'Explain the reason using passage facts.'}]}});
  expect(result.success).toBe(true);
  if(result.success && result.data.activityType==='reading') expect(result.data.payload.questions[0]?.semanticCriteria).toContain('passage facts');
 });
 it('rejects short answers with neither authored alternatives nor semantic criteria',()=>{
  expect(activitySchema.safeParse({...base,payload:{prompt:'Read',questions:[{...question,options:['a','b'],answerIndex:0,responseType:'short_answer'}]}}).success).toBe(false);
 });
 it('rejects malformed true/false options and objective blanks without authored alternatives',()=>{
  for(const q of [{...question,responseType:'true_false',options:['a','b','c'],answerIndex:0},{...question,responseType:'fill_blank'}]) expect(activitySchema.safeParse({...base,payload:{prompt:'Read',questions:[q]}}).success).toBe(false);
 });
});
