import {describe,it,expect} from 'vitest';
import {preserveBeginnerPriorVersion} from './beginner-publication-policy.js';
describe('supersession is distinct from withdrawal',()=>{
 it('preserves exclusive Beginner V1 without reactivating withdrawn versions',()=>{
  expect(preserveBeginnerPriorVersion({programSlugs:['beginner'],priorStatus:'PUBLISHED',topicGroupId:null})).toBe(true);
  expect(()=>preserveBeginnerPriorVersion({programSlugs:['beginner'],priorStatus:'ARCHIVED',topicGroupId:null})).toThrow('BEGINNER_WITHDRAWN_VERSION');
 });
 it('retains Intermediate/IELTS archival semantics and rejects ambiguous ownership',()=>{
  expect(preserveBeginnerPriorVersion({programSlugs:['intermediate'],priorStatus:'PUBLISHED',topicGroupId:null})).toBe(false);
  expect(preserveBeginnerPriorVersion({programSlugs:['ielts'],priorStatus:'PUBLISHED',topicGroupId:null})).toBe(false);
  expect(()=>preserveBeginnerPriorVersion({programSlugs:['beginner','ielts'],priorStatus:'PUBLISHED',topicGroupId:null})).toThrow('BEGINNER_SHARED_LESSON');
 });
});
