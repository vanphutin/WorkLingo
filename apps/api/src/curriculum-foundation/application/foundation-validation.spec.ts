import {describe,it,expect} from 'vitest';
import {analyzeLessonSource} from '@worklingo/content-format';
import {syntheticBeginnerSource} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
import {buildBeginnerDraftSnapshot} from './foundation-validation.js';
describe('Beginner technical lesson readiness',()=>{
 it('validates an exact eight-activity synthetic source without declaring content readiness',()=>{
  const draft=analyzeLessonSource(syntheticBeginnerSource()).normalizedDraft!;
  expect(buildBeginnerDraftSnapshot(draft).activities).toHaveLength(8);
 });
 it('rejects incomplete four-skill inventory instead of padding activities',()=>{
  const draft=analyzeLessonSource(syntheticBeginnerSource()).normalizedDraft!;
  expect(()=>buildBeginnerDraftSnapshot({...draft,activities:draft.activities.slice(1)})).toThrow('INVALID_BEGINNER_INVENTORY');
 });
});
