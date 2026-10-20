import { describe, expect, it } from 'vitest';
import { createIntermediateLessonDraft } from './lesson-model';
import { isIntermediateTopicSource, readIntermediateTopicLesson, serializeIntermediateTopicLesson } from './topic-lesson-model';

describe('One passage per Intermediate topic', () => {
  it('round trips one topic and binds reading and audio to the same passage', () => {
    const draft = { ...createIntermediateLessonDraft('reading'), title: 'At the restaurant', readingText: 'The customer orders soup.\nThe waiter confirms the order.', dialogue: 'Unrelated previous dialogue' };
    const source = serializeIntermediateTopicLesson(draft);
    expect(isIntermediateTopicSource(source)).toBe(true);
    expect(source).not.toContain('Unrelated previous dialogue');
    expect(source.match(/The customer orders soup\./g)).toHaveLength(3);
    expect(readIntermediateTopicLesson(source)).toEqual({ ...draft, dialogue: draft.readingText });
    expect(draft.dialogue).toBe('Unrelated previous dialogue');
  });
  it('leaves legacy/custom source in its existing editor', () => {
    const source = serializeIntermediateTopicLesson(createIntermediateLessonDraft('reading'));
    expect(isIntermediateTopicSource(source.replace('intermediate-topic-v1', 'intermediate-form-v1'))).toBe(false);
    expect(readIntermediateTopicLesson(source.replace('title: Workplace language', 'title: Custom language'))).toBeNull();
    expect(readIntermediateTopicLesson(source.replace('category: reading', 'category: listening'))).toBeNull();
  });
});
