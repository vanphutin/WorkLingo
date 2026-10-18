import { randomUUID } from 'node:crypto';
import { foundationMissionFixture } from '@worklingo/test-fixtures';
import { activitySchema, lessonSnapshotSchema, type PublishedMission } from '../../curriculum/domain/curriculum.types.js';

export function topicFixture() {
  const original = foundationMissionFixture.lesson;
  const phrases = Array.from({ length: 12 }, (_, i) => `useful phrase ${i}`);
  const lesson = lessonSnapshotSchema.parse({ ...original,
    contentBlocks: original.contentBlocks.map(block => ({ ...block, id: randomUUID(), slug: `ielts-${block.slug}`, text: `${block.text}\n${phrases.join('. ')}.` })),
    wordBanks: [{ id: randomUUID(), slug: 'ielts-education-bank', name: 'Education', languageBlocks: phrases.map((canonicalForm, i) => ({ id: randomUUID(), slug: `ielts-chunk-${i}`, canonicalForm, meaning: `Nghĩa ${i}`, pronunciation: '/test/', collocations: [`a ${canonicalForm}`], grammarPattern: 'noun phrase', examples: [`Use ${canonicalForm} in a discussion.`], commonErrors: ['Use the complete phrase.'], cefrLevel: 'B1', transferContexts: ['advice', 'planning'] })) }],
    activities: original.activities.map((a, order) => ({ ...a, id: randomUUID(), order, contentReferences: a.contentReferences.map(ref => `ielts-${ref}`), languageBlockReferences: phrases.map((_, i) => `ielts-chunk-${i}`), payload: a.activityType === 'reading' || a.activityType === 'listening' ? { ...a.payload, questions: a.payload.questions.map(q => ({ ...q, evidence: original.contentBlocks.find(block => a.contentReferences.some(ref => ref === block.slug))!.text.slice(0, 20) })) } : a.payload })),
  });
  const responses = lesson.activities.filter(activity => activity.learningBlock === 'respond');
  lesson.activities.push(...activitySchema.array().parse(responses.map((activity, i) => ({ ...activity, id: randomUUID(), slug: `${activity.slug}-transfer`, order: 100 + i, payload: { ...activity.payload, prompt: activity.payload.prompt + ' Transfer this response to a new planning meeting.' } }))));
  const mission: PublishedMission = { id: randomUUID(), slug: 'ielts-education', title: 'Education', objective: 'Use contextual vocabulary.', purpose: 'learning', levelCode: 'IELTS_FOUNDATION', lessonVersion: { ...lesson, id: randomUUID(), version: 1 } };
  const pack = { slug: 'ielts-education-foundation', difficulty: 'foundation' as const, curriculumRevisionId: randomUUID(), focusChunkSlugs: phrases.map((_, i) => `ielts-chunk-${i}`), contexts: [{ slug: lesson.contentBlocks[0]!.slug, title: 'Advice' }, { slug: lesson.contentBlocks[1]!.slug, title: 'Planning' }] };
  return { pack, lesson: { mission, programSlug: 'ielts' } };
}

