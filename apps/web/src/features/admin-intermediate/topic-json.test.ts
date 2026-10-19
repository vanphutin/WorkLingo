import { describe, expect, it } from 'vitest';
import { readIntermediateTopicLesson, serializeIntermediateTopicLesson } from './topic-lesson-model';
import { createTopicJsonTemplate, topicDraftToJson, topicJsonToDraft } from './topic-json';

describe('Intermediate topic JSON', () => {
  it('roundtrips a topic through JSON and the source format with one passage for audio', () => {
    const json = createTopicJsonTemplate();
    const draft = topicJsonToDraft(JSON.parse(JSON.stringify(json)));
    expect(draft.dialogue).toBe(draft.readingText);
    expect(topicDraftToJson(readIntermediateTopicLesson(serializeIntermediateTopicLesson(draft))!)).toEqual(json);
  });
  it.each([
    { format: 'unknown' }, { approval: { approvedById: 'admin' } }, { durationMinutes: 150 },
    { dialogue: 'Another passage' }, { title: 12 }, { readingText: 'Text\n[LESSON]' },
  ])('rejects unsupported or unsafe fields: %j', patch => {
    expect(() => topicJsonToDraft({ ...createTopicJsonTemplate(), ...patch })).toThrow();
  });
  it('rejects invalid question indexes, evidence and duplicate slugs', () => {
    const json = createTopicJsonTemplate();
    for (const patch of [{ answerIndex: 10 }, { evidenceLine: 999 }, { slug: json.languageBlocks[0]!.slug }]) {
      expect(() => topicJsonToDraft({ ...json, readingQuestions: [{ ...json.readingQuestions[0], ...patch }] })).toThrow();
    }
  });
});
