import {describe,it,expect} from 'vitest';
import {analyzeLessonSource} from '@worklingo/content-format';
import {syntheticBeginnerSource} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
import {buildBeginnerDraftSnapshot} from '../../curriculum-foundation/application/foundation-validation.js';
import {projectLearnerActivity} from './learner-activity-projection.js';
describe('one canonical learner-safe projection',()=>{
 it('keeps task prompts/instructions while removing answers and private evidence',()=>{
  const s=buildBeginnerDraftSnapshot(analyzeLessonSource(syntheticBeginnerSource()).normalizedDraft!);
  const reading=s.activities.find(a=>a.activityType==='reading')!;
  if(reading.activityType!=='reading')throw new Error('fixture');
  reading.payload.questions[0]!.explanation='HIDDEN_EXPLANATION';reading.payload.questions[0]!.evidence='HIDDEN_EVIDENCE';
  const dto=projectLearnerActivity(s,reading.id);
  expect(dto.payload?.prompt).toBe(reading.payload.prompt);expect(dto.instructions).toHaveLength(1);
  expect(JSON.stringify(dto)).not.toMatch(/HIDDEN_EXPLANATION|HIDDEN_EVIDENCE|answerIndex|rubricId/);
  const speaking=s.activities.find(a=>a.activityType==='speaking')!;
  if(speaking.activityType!=='speaking')throw new Error('fixture');
  speaking.payload.sampleAnswer='HIDDEN_MODEL';speaking.payload.requiredPhrases=['HIDDEN_PHRASE'];
  const response=projectLearnerActivity(s,speaking.id);
  expect(response.payload.mode).toBe('guided_response');expect(response.payload.practiceMode).toBe('unscored');expect(JSON.stringify(response)).not.toMatch(/HIDDEN_MODEL|HIDDEN_PHRASE|sampleAnswer|requiredPhrases/);
 });
 it('preserves intentional legacy shadowing without sharing Beginner answers',()=>{
  const s=buildBeginnerDraftSnapshot(analyzeLessonSource(syntheticBeginnerSource()).normalizedDraft!);
  delete s.formatVersion;delete s.instructions;
  const a=s.activities.find(a=>a.activityType==='speaking')!;if(a.activityType!=='speaking')throw new Error('fixture');a.payload.mode='shadowing';
  expect(projectLearnerActivity(s,a.id).payload?.sampleAnswer).toBe(a.payload.sampleAnswer);expect(projectLearnerActivity(s,a.id).payload.practiceMode).toBeUndefined();
 });
});

it('removes referenced listening transcripts from Beginner DTO content, not only the DOM',()=>{
 const s=buildBeginnerDraftSnapshot(analyzeLessonSource(syntheticBeginnerSource()).normalizedDraft!);
 const a=s.activities.find(a=>a.activityType==='listening')!;
 a.contentReferences=[s.contentBlocks[0]!.slug];s.contentBlocks[0]!.text='SECRET_LISTENING_TRANSCRIPT';
 expect(JSON.stringify(projectLearnerActivity(s,a.id))).not.toContain('SECRET_LISTENING_TRANSCRIPT');
});

it('projects semantic response controls without private accepted answers or criteria',()=>{
 const s=buildBeginnerDraftSnapshot(analyzeLessonSource(syntheticBeginnerSource()).normalizedDraft!);
 const a=s.activities.find(a=>a.activityType==='reading')!;
 if(a.activityType!=='reading')throw new Error('fixture');
 Object.assign(a.payload.questions[0]!,{responseType:'short_answer',acceptedAnswers:['PRIVATE_ANSWER'],semanticCriteria:'PRIVATE_CRITERIA'});
 const dto=projectLearnerActivity(s,a.id);
 expect((dto.payload.questions as Array<Record<string,unknown>>)[0]?.responseType).toBe('short_answer');
 expect(JSON.stringify(dto)).not.toMatch(/PRIVATE_ANSWER|PRIVATE_CRITERIA|acceptedAnswers|semanticCriteria/);
});

it('keeps new semantic listening source context server-side even in legacy lessons',()=>{
 const s=buildBeginnerDraftSnapshot(analyzeLessonSource(syntheticBeginnerSource()).normalizedDraft!);
 delete s.formatVersion; delete s.instructions;
 const a=s.activities.find(a=>a.activityType==='listening')!;if(a.activityType!=='listening')throw new Error('fixture');
 Object.assign(a.payload.questions[0]!,{responseType:'open_ended',semanticCriteria:'PRIVATE_CRITERIA'});
 a.payload.audioText='PRIVATE_TRANSCRIPT';a.contentReferences=[s.contentBlocks[0]!.slug];s.contentBlocks[0]!.text='PRIVATE_PASSAGE';
 expect(JSON.stringify(projectLearnerActivity(s,a.id))).not.toMatch(/PRIVATE_TRANSCRIPT|PRIVATE_PASSAGE|PRIVATE_CRITERIA/);
});
