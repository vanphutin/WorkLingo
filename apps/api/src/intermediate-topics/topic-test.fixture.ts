import { randomUUID } from 'node:crypto';
import { canonicalLessonSource, foundationMissionFixture } from '@worklingo/test-fixtures';
import { defaultTopicPlan } from '@worklingo/contracts';
import { lessonSnapshotSchema, type PublishedMission } from '../curriculum/domain/curriculum.types.js';

const passage = canonicalLessonSource.match(/\[CONTENT complaint-email\][\s\S]*?<<<\n([\s\S]*?)\n>>>/)![1]!;
export const topicSource = canonicalLessonSource
  .replace('[LESSON]', '[LESSON]\nprogram: intermediate\ncategory: reading\nauthoring_template: intermediate-topic-v1')
  .replaceAll('complaint-email', 'workplace-reading')
  .replaceAll('complaint-call', 'workplace-dialogue')
  .replace(/(\[AUDIO_SCRIPT workplace-dialogue\][\s\S]*?<<<\n)[\s\S]*?(\n>>>)/, `$1${passage}$2`)
  .replace('[AUDIO_SCRIPT workplace-dialogue]', `[CONTENT workplace-dialogue]\ntype: dialogue\ntext:\n<<<\n${passage}\n>>>\n[/CONTENT]\n\n[AUDIO_SCRIPT workplace-dialogue]`)
  .replace('audio_ref: workplace-dialogue', 'audio_ref: workplace-dialogue\ncontent_refs: workplace-dialogue')
  .replace('The customer asks to speak with a manager regarding a delayed order.', 'The customer asks to speak with a manager regarding a delayed order.\n\nEVIDENCE:\nworkplace-dialogue:1')
  .replace('[AUDIO_SCRIPT workplace-dialogue]', '[AUDIO_SCRIPT workplace-audio]').replace('audio_ref: workplace-dialogue', 'audio_ref: workplace-audio');

export function topicMission(): PublishedMission {
  const fixture = foundationMissionFixture;
  const snapshot = lessonSnapshotSchema.parse({ ...fixture.lesson,
    contentBlocks: fixture.lesson.contentBlocks.map(b => ({ ...b, id: randomUUID() })),
    wordBanks: fixture.lesson.wordBanks.map(b => ({ ...b, id: randomUUID(), languageBlocks: b.languageBlocks.map(l => ({ ...l, id: randomUUID() })) })),
    activities: fixture.lesson.activities.map((a, order) => ({ ...a, order, id: randomUUID() })),
    intermediateTopic: { ...defaultTopicPlan(90), sourceContentRef: 'workplace-reading', approvedById: randomUUID(), approvedAt: new Date().toISOString() },
  });
  return { id: randomUUID(), slug: 'topic', title: 'Topic', objective: 'Read', purpose: 'learning', levelCode: 'FOUNDATION_1', lessonVersion: { ...snapshot, id: randomUUID(), version: 1 } };
}
