import type { LessonDocumentNode } from './ast.ts';
import type { ContentIssue } from './issues.ts';

export const intermediateCategories = ['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'] as const;
export type IntermediateCategory = typeof intermediateCategories[number];
export function isIntermediateCategory(value: string): value is IntermediateCategory {
  return (intermediateCategories as readonly string[]).includes(value);
}

/** Authoring classification only; curriculum membership is assigned separately. */
export function validateIntermediateAuthoring(document: LessonDocumentNode): ContentIssue[] {
  const lesson = document.lesson;
  if (!lesson || (lesson.program === undefined && lesson.category === undefined && lesson.authoringTemplate === undefined)) return [];
  if (lesson.program === 'intermediate' && isIntermediateCategory(lesson.category ?? '') && !document.foundation
    && (lesson.authoringTemplate === undefined || lesson.authoringTemplate === 'intermediate-form-v1'
      || (lesson.authoringTemplate === 'intermediate-topic-v1' && lesson.category === 'reading'))) return [];
  return [{ code: 'VAL_AUTHORING_CLASSIFICATION', severity: 'error', message: 'Authoring metadata requires program intermediate and a supported category, without Foundation metadata.', path: 'lesson.category', range: lesson.range }];
}
