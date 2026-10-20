import { UnprocessableEntityException } from '@nestjs/common';
import { analyzeLessonSource, parseLessonSource } from '@worklingo/content-format';
import { approvedTopicSnapshotSchema, topicBlockTypes } from '@worklingo/contracts';
import type { ContentImport, Prisma } from '@prisma/client';

export function isTopicSource(rawSource: string): boolean {
  return parseLessonSource(rawSource).document.lesson?.authoringTemplate === 'intermediate-topic-v1';
}

export function requireTopicSource(rawSource: string) {
  const { document } = parseLessonSource(rawSource);
  const analysis = analyzeLessonSource(rawSource);
  const draft = analysis.normalizedDraft;
  const passage = document.contents.find(b => b.slug === 'workplace-reading');
  const dialogue = document.contents.find(b => b.slug === 'workplace-dialogue');
  const listening = document.activities.filter(a => a.activityType === 'listening');
  const skills = new Set(draft?.activities.flatMap(a => a.skills));
  const passageRefs = new Set(['workplace-reading', 'workplace-dialogue']);
  if (document.lesson?.authoringTemplate !== 'intermediate-topic-v1' || document.lesson.program !== 'intermediate' ||
      document.lesson.category !== 'reading' || !analysis.canPublish || !draft || !passage?.text.trim() ||
      dialogue?.text !== passage.text || !listening.length ||
      listening.some(a => !a.audioRef || document.audioScripts.find(s => s.slug === a.audioRef)?.script !== passage.text) ||
      document.audioScripts.some(s => s.script !== passage.text) ||
      document.activities.filter(a => a.activityType === 'reading').some(a => !a.contentRefs.includes('workplace-reading')) ||
      draft.activities.some(a => a.contentReferences.some(ref => !passageRefs.has(ref))) ||
      document.activities.filter(a => a.activityType === 'reading' || a.activityType === 'listening')
        .some(a => !a.evidence.length || a.evidence.some(ref => !/^(workplace-reading|workplace-dialogue):[1-9]\d*$/u.test(ref))) ||
      !(['reading', 'listening', 'speaking', 'writing'] as const).every(s => skills.has(s)) ||
      !topicBlockTypes.every(t => draft.activities.some(a => a.learningBlock === t))) {
    throw new UnprocessableEntityException({ code: 'TOPIC_SOURCE_INVALID', message: 'A complete Intermediate topic must use one passage and cover all four stages and skills.' });
  }
  return draft;
}

// Caller holds ContentImport FOR UPDATE, the same lock used by review mutations.
export async function approvedTopicForPublication(tx: Prisma.TransactionClient, source: Pick<ContentImport, 'id' | 'rawSource' | 'sourceHash' | 'draftRevision'>) {
  if (!isTopicSource(source.rawSource)) return undefined;
  requireTopicSource(source.rawSource);
  const review = await tx.intermediateTopicReview.findUnique({ where: { contentImportId: source.id } });
  if (!review || review.sourceHash !== source.sourceHash || review.draftRevision !== source.draftRevision ||
      !review.approvedPlan || !review.approvedById || !review.approvedAt) {
    throw new UnprocessableEntityException({ code: 'TOPIC_APPROVAL_REQUIRED', message: 'Human approval for this exact topic draft is required.' });
  }
  return approvedTopicSnapshotSchema.parse({ ...Object(review.approvedPlan), sourceContentRef: 'workplace-reading',
    approvedById: review.approvedById, approvedAt: review.approvedAt.toISOString() });
}
