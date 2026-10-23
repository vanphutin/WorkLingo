import { describe, expect, it } from 'vitest';
import { readIntermediateTopicLesson, serializeIntermediateTopicLesson } from './topic-lesson-model';
import { createTopicJsonTemplate, topicDraftToJson, topicJsonToDraft } from './topic-json';

it('preserves an imported narration for review instead of silently dropping it', () => {
  const input = { ...createTopicJsonTemplate(), spokenText: 'Hello team.', speechReview: 'a'.repeat(64) };
  expect(topicDraftToJson(topicJsonToDraft(input))).toEqual(input);
});

describe('Intermediate topic JSON', () => {
  it('preserves AI-selected minutes through JSON, source save/reload and export', () => {
    const json = { ...createTopicJsonTemplate(), durationMinutes: 90 };
    const draft = topicJsonToDraft(json);
    expect(draft.durationMinutes).toBe(90);
    const reloaded = readIntermediateTopicLesson(serializeIntermediateTopicLesson(draft))!;
    expect(reloaded.durationMinutes).toBe(90);
    expect(topicDraftToJson(reloaded).durationMinutes).toBe(90);
  });
  it('roundtrips a topic through JSON and the source format with one passage for audio', () => {
    const json = createTopicJsonTemplate();
    const draft = topicJsonToDraft(JSON.parse(JSON.stringify(json)));
    expect(draft.dialogue).toBe(draft.readingText);
    expect(topicDraftToJson(readIntermediateTopicLesson(serializeIntermediateTopicLesson(draft))!)).toEqual(json);
  });
  it.each([
    { format: 'unknown' }, { approval: { approvedById: 'admin' } }, { durationMinutes: 75 },
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
  it('identifies the exact model field when a multi-paragraph email cannot be serialized', () => {
    try {
      topicJsonToDraft({ ...createTopicJsonTemplate(), writingModel: 'Dear guest,\n\nYour booking is confirmed.\nBest regards.' });
      expect.fail('Expected a field validation error');
    } catch (error) {
      expect(error).toMatchObject({ issues: expect.arrayContaining([expect.objectContaining({ path: ['writingModel'], message: expect.stringContaining('single line') })]) });
    }
  });
});
