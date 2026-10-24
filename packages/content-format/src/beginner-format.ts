import type { LessonDocumentNode } from './ast.ts';
import type { ContentIssue } from './issues.ts';

export const BEGINNER_FORMAT = 'WorkLingoLesson/1.2';
const filled = (s: string | undefined) => Boolean(s?.trim()) && !/\bTODO\b|\bTBD\b|\{\{/iu.test(s!);

/** Runtime stays closed independently of pure/offline parsing. No enabling flag in R1.1. */
export function assertBeginnerAuthoringDisabled(source: string): void {
  if (/WorkLingoLesson\s*\/\s*1\.2/iu.test(source)) {
    throw Object.assign(new Error('BEGINNER_AUTHORING_DISABLED'), { code: 'BEGINNER_AUTHORING_DISABLED' });
  }
}

export function validateBeginner(document: LessonDocumentNode): ContentIssue[] {
  if (document.formatVersion !== BEGINNER_FORMAT) return [];
  const issues: ContentIssue[] = [];
  const fail = (message: string, range = document.range) => issues.push({ code:'VAL_INVALID_BEGINNER', message, range, severity:'error' });
  const slugs = new Set<string>();
  const positions = new Set<string>();
  for (const instruction of document.instructions ?? []) {
    const position = instruction.phase+':'+instruction.order;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(instruction.slug) || slugs.has(instruction.slug) || positions.has(position) ||
        !['readDecode','listenReason','respond'].includes(instruction.phase) || !Number.isSafeInteger(instruction.order) || instruction.order<0 || !filled(instruction.text)) fail('Invalid or duplicate instruction', instruction.range);
    slugs.add(instruction.slug); positions.add(position);
  }
  for (const activity of document.activities) {
    if (!['speaking','writing'].includes(activity.activityType)) continue;
    const expected = activity.activityType==='speaking' ? 'beginner-guided-speaking' : 'beginner-short-writing';
    if (!Number.isSafeInteger(activity.minWords) || activity.minWords!<1 || !filled(activity.sampleAnswer) || activity.rubricId!==expected || activity.rubricVersion!=='1') fail('Response requires authored min_words, sample_answer and supported exact rubric id/version', activity.range);
  }
  return issues;
}
