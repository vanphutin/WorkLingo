import { createHash } from 'node:crypto';
import {
  adminCurriculumTreeSchema, adminIeltsBandCurriculumSchema, adminIeltsBridgeModuleSchema,
  adminIeltsIntegratedProfileSchema, adminIeltsMockSchema, adminOrientationSchema,
  contentImportSchema, ieltsBridgeStageTypes, INITIAL_IELTS_ACADEMIC_MOCK,
  INITIAL_IELTS_BAND_CURRICULUM, INITIAL_IELTS_INTEGRATED_PROFILES,
} from '@worklingo/contracts';
import { PARSER_VERSION } from '@worklingo/content-format';
import { canonicalLessonSource } from '../../../../packages/test-fixtures/src/content-authoring.fixture';

export const importId = '11111111-1111-4111-8111-111111111111';
export const authoringTimestamp = '2026-10-20T00:00:00.000Z';
export const authoringSourceHash = (source: string) => createHash('sha256').update(source).digest('hex');

const envelope = {
  status: 'DRAFT', draftRevision: 1, currentPublishedVersion: null,
  versions: [], updatedAt: authoringTimestamp,
};
const program = { availabilityStatus: 'AVAILABLE', id: '10000000-0000-4000-8000-000000000002', name: 'Intermediate', slug: 'intermediate' };
const slide = { title: 'Welcome', body: 'Body', transcript: 'Transcript', imageAssetId: null, audioAssetId: null, question: null };

/** Owner workspace-unit objects and published contract seeds; no Vitest modules imported. */
export const authoringFixtures = {
  content: contentImportSchema.parse({
    id: importId, lessonId: null, lessonVersionId: null, rawSource: canonicalLessonSource,
    sourceHash: authoringSourceHash(canonicalLessonSource), status: 'DRAFT', draftRevision: 1,
    parserVersion: PARSER_VERSION, validationHash: null,
    createdById: '22222222-2222-4222-8222-222222222222', updatedById: '22222222-2222-4222-8222-222222222222',
    createdAt: authoringTimestamp, updatedAt: authoringTimestamp,
  }),
  curriculum: adminCurriculumTreeSchema.parse({
    programs: [program, { availabilityStatus: 'IN_DEVELOPMENT', id: '10000000-0000-4000-8000-000000000004', name: 'IELTS', slug: 'ielts' }],
    paths: [{
      archiveBlockers: ['Active learners enrolled'], id: importId, name: 'General English',
      program, revision: 3, slug: 'general-english', status: 'PUBLISHED',
      levels: [{
        archiveBlockers: [], cefrReference: 'A1', code: 'BEG_1', id: '22222222-2222-4222-8222-222222222222',
        isPlayable: true, name: 'Beginner 1', order: 1, pathId: importId, playabilityReasons: [], revision: 1, status: 'PUBLISHED',
        missions: [{
          archiveBlockers: [], id: '33333333-3333-4333-8333-333333333333', isPlayable: true,
          levelId: '22222222-2222-4222-8222-222222222222', objective: 'Learn basic greeting', order: 1,
          playabilityReasons: [], purpose: 'LEARNING', revision: 2, slug: 'greetings', status: 'PUBLISHED', title: 'Greetings Mission',
          lessons: [{ currentPublishedVersionId: '44444444-4444-4444-8444-444444444444', currentPublishedVersionNumber: 1,
            hasAudio: true, id: '55555555-5555-4555-8555-555555555555', order: 1, slug: 'hello-world', title: 'Hello World' }],
        }, {
          archiveBlockers: [], id: '33333333-3333-4333-8333-333333333334', isPlayable: false, lessons: [],
          levelId: '22222222-2222-4222-8222-222222222222', objective: 'Incomplete mission', order: 2,
          playabilityReasons: ['Mission has no published lessons with audio'], purpose: 'LEARNING', revision: 1,
          slug: 'incomplete-mission', status: 'DRAFT', title: 'Incomplete Mission',
        }],
      }],
    }],
  }),
  orientation: adminOrientationSchema.parse({
    ...envelope, id: '22222222-2222-4222-8222-222222222222', slug: 'ielts-orientation',
    draft: { title: 'IELTS Orientation', description: 'Introduction', slides: [
      { ...slide, id: importId, slug: 'welcome' },
      { ...slide, id: '33333333-3333-4333-8333-333333333333', slug: 'format' },
      { ...slide, id: '44444444-4444-4444-8444-444444444444', slug: 'ready' },
    ] },
  }),
  bridge: adminIeltsBridgeModuleSchema.parse({
    ...envelope, id: importId, slug: 'reading-true-false-not-given',
    draft: {
      title: 'Reading TFNG', description: 'Separate contradiction from missing information.', skill: 'reading',
      questionType: 'reading_true_false_not_given', required: true,
      stages: ieltsBridgeStageTypes.map((type, index) => ({
        slug: type.replaceAll('_', '-'), type, title: `Stage ${index + 1}`, instruction: 'Use complete evidence.',
        strategySteps: ['Read the whole claim.'], timeLimitSeconds: type === 'timed_practice' ? 120 : null,
        task: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
          ? { kind: 'single_choice', prompt: 'Choose one.', options: ['TRUE', 'FALSE', 'NOT GIVEN'], answerIndex: 2 }
          : { kind: 'instruction' },
        feedback: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
          ? { correct: 'Correct.', incorrect: 'Check the evidence.' } : null,
      })),
    },
  }),
  integrated: INITIAL_IELTS_INTEGRATED_PROFILES.map((draft, index) => adminIeltsIntegratedProfileSchema.parse({
    ...envelope, id: `66666666-6666-4666-8666-${String(index + 1).padStart(12, '0')}`,
    durationMinutes: draft.durationMinutes, draft,
  })),
  band: adminIeltsBandCurriculumSchema.parse({ ...envelope, id: '77777777-7777-4777-8777-777777777777', draft: INITIAL_IELTS_BAND_CURRICULUM }),
  mock: adminIeltsMockSchema.parse({ ...envelope, id: importId, slug: 'mock-one', draft: INITIAL_IELTS_ACADEMIC_MOCK }),
};
