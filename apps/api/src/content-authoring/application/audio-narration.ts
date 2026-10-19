import { createHash } from 'node:crypto';
import { UnprocessableEntityException } from '@nestjs/common';
import { analyzeLessonSource, narrationEvidenceIssues, narrationReviewInput, parseLessonSource, type LessonDocumentNode } from '@worklingo/content-format';

export function narrationReviewIssues(document: LessonDocumentNode) {
  return document.audioScripts.flatMap(script => {
    const issues = narrationEvidenceIssues(document, script);
    if (script.spokenText !== undefined && script.speechReview !== createHash('sha256').update(narrationReviewInput(document, script)).digest('hex')) {
      issues.push({ code: 'NARRATION_REVIEW_STALE', message: `Review spoken text again for ${script.slug}: source, speech or listening questions changed.`,
        severity: 'error', range: script.range, path: `audio_script.${script.slug}.spoken_text` });
    }
    return issues;
  });
}

export function assertNarrationReviewed(document: LessonDocumentNode): void {
  const issues = narrationReviewIssues(document).filter(i => i.severity === 'error');
  if (issues.length) throw new UnprocessableEntityException({ code: 'NARRATION_REVIEW_REQUIRED', message: 'Review spoken text and listening evidence.', details: issues, statusCode: 422 });
}

export function analyzeReviewedSource(source: string) {
  const analysis = analyzeLessonSource(source);
  const issues = narrationReviewIssues(parseLessonSource(source).document).filter(i => i.code === 'NARRATION_REVIEW_STALE');
  return { ...analysis, canPublish: analysis.canPublish && issues.length === 0, issues: [...analysis.issues, ...issues] };
}
