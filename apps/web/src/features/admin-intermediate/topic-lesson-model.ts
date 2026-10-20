import { parseLessonSource } from '@worklingo/content-format';
import { readIntermediateLesson, serializeIntermediateLesson, type IntermediateLessonDraft } from './lesson-model';

export function isIntermediateTopicSource(source: string): boolean {
  const { document } = parseLessonSource(source);
  return !document.foundation && document.lesson?.program === 'intermediate'
    && document.lesson.category === 'reading' && document.lesson.authoringTemplate === 'intermediate-topic-v1';
}
export function serializeIntermediateTopicLesson(draft: IntermediateLessonDraft): string {
  return serializeIntermediateLesson('reading', { ...draft, dialogue: draft.readingText })
    .replace('authoring_template: intermediate-form-v1', 'authoring_template: intermediate-topic-v1');
}
export function readIntermediateTopicLesson(source: string): IntermediateLessonDraft | null {
  if (!isIntermediateTopicSource(source)) return null;
  const draft = readIntermediateLesson(source.replace('authoring_template: intermediate-topic-v1', 'authoring_template: intermediate-form-v1'), 'reading');
  return draft && draft.dialogue === draft.readingText ? draft : null;
}
