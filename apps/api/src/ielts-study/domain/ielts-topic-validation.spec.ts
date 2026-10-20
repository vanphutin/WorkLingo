import { describe, expect, it } from 'vitest';
import { qualifyIeltsTopicPack } from './ielts-topic-validation.js';
import { topicFixture } from './ielts-topic-validation.fixture.js';

describe('Topic publication qualification', () => {
  it('rejects an Intermediate lesson even when structurally complete', () => {
    const { pack, lesson } = topicFixture();
    expect(qualifyIeltsTopicPack(pack, { ...lesson, programSlug: 'intermediate' }).issues.map(issue => issue.code)).toContain('IELTS_TOPIC_WRONG_PROGRAM');
  });
  it('rejects chunks that are absent from actual reading and dialogue contexts', () => {
    const { pack, lesson } = topicFixture();
    lesson.mission.lessonVersion.wordBanks[0]!.languageBlocks[0]!.canonicalForm = 'unreferenced vocabulary';
    expect(qualifyIeltsTopicPack(pack, lesson).canPublish).toBe(false);
  });
  it('rejects objective evidence not present in its referenced source', () => {
    const { pack, lesson } = topicFixture();
    const activity = lesson.mission.lessonVersion.activities.find(a => a.activityType === 'reading')!;
    if (activity.activityType === 'reading') activity.payload.questions[0]!.evidence = 'Unsupported invented evidence';
    expect(qualifyIeltsTopicPack(pack, lesson).issues.map(issue => issue.code)).toContain('IELTS_TOPIC_ANSWER_EVIDENCE');
  });
  it('does not advertise durations when unique activities cannot fill their canonical blocks', () => {
    const { pack, lesson } = topicFixture();
    lesson.mission.lessonVersion.activities = lesson.mission.lessonVersion.activities.slice(0, 2);
    expect(qualifyIeltsTopicPack(pack, lesson).supportedDurations).toEqual([]);
  });
});
