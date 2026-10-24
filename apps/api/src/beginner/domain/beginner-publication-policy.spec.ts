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

import {createBeginnerReview} from './beginner-publication-policy.js';
it('rejects self-review and absent source-editor provenance',()=>{
 const base={environmentId:'synthetic-unit',actorId:'reviewer',editorId:'reviewer',target:{programId:'10000000-0000-4000-8000-000000000001'},draftRevision:1,sourceHash:'a'.repeat(64),validationHash:'a'.repeat(64),normalizedSnapshotHash:'b'.repeat(64),audioSelectionHash:'c'.repeat(64)};
 expect(()=>createBeginnerReview(base)).toThrow('BEGINNER_INDEPENDENT_REVIEW_REQUIRED');
 expect(()=>createBeginnerReview({...base,editorId:''})).toThrow('BEGINNER_SOURCE_PROVENANCE_REQUIRED');
});

import {assertBeginnerPublishedReview} from './beginner-publication-policy.js';
it('invalidates reviewed source, target or audio selection instead of publishing stale evidence',()=>{
 const data={environmentId:'synthetic-unit',actorId:'reviewer',editorId:'editor',target:{programId:'10000000-0000-4000-8000-000000000001'},draftRevision:1,sourceHash:'a'.repeat(64),validationHash:'a'.repeat(64),normalizedSnapshotHash:'b'.repeat(64),audioSelectionHash:'c'.repeat(64)};
 const review=createBeginnerReview(data);
 expect(()=>assertBeginnerPublishedReview(review,{...data,sourceHash:'d'.repeat(64),reviewHash:review.reviewHash})).toThrow('BEGINNER_REVIEW_STALE');
});

import {assertBeginnerCurriculumReview} from './beginner-publication-policy.js';
it('denies Unit publication without exact independent review of the current definition',()=>{
 expect(()=>assertBeginnerCurriculumReview(null,{environmentId:'unit',target:{programId:'10000000-0000-4000-8000-000000000001'},revision:2,definitionHash:'a'.repeat(64),editorId:'editor'},'reviewer')).toThrow('BEGINNER_CURRICULUM_REVIEW_REQUIRED');
});
