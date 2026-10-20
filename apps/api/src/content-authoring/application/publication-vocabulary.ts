import { createHash } from 'node:crypto';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import type { ContentImport, Prisma } from '@prisma/client';
import { analyzeLessonSource } from '@worklingo/content-format';
import { vocabularyPublicationSelectionSchema, type VocabularyPublicationReview } from '@worklingo/contracts';

type Database = Pick<Prisma.TransactionClient, 'languageBlock' | 'lesson' | 'intermediateTopicGroup'>;
type Source = Pick<ContentImport, 'id' | 'rawSource' | 'sourceHash' | 'draftRevision' | 'topicGroupId' | 'topicGroupRevision'>;
export function normalizeVocabularyExpression(value: string) { return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase(); }

export async function buildVocabularyPublicationReview(db: Database, source: Source): Promise<VocabularyPublicationReview> {
  const draft = analyzeLessonSource(source.rawSource).normalizedDraft;
  if (!draft) throw new UnprocessableEntityException({ code: 'CONTENT_VALIDATION_FAILED', message: 'Validate the lesson before reviewing vocabulary.' });
  const inherited = source.topicGroupRevision === 0 ? await db.lesson.findUnique({ where: { slug: draft.slug }, select: { topicGroupId: true } }) : null;
  const groupId = source.topicGroupRevision > 0 ? source.topicGroupId : inherited?.topicGroupId ?? null;
  const [topic, candidates] = await Promise.all([
    groupId ? db.intermediateTopicGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true, nameEn: true, revision: true } }) : null,
    db.languageBlock.findMany({
      where: { normalizedExpression: { in: [...new Set(draft.wordBanks.flatMap(bank => bank.languageBlocks.map(block => normalizeVocabularyExpression(block.canonicalForm))))] } },
      orderBy: { id: 'asc' },
      include: { wordBank: { select: { name: true } },
        vocabularyUsages: { where: { lessonVersion: { status: 'PUBLISHED' } }, take: 5, orderBy: { lessonVersion: { publishedAt: 'desc' } },
          include: { lessonVersion: { select: { id: true, title: true, lessonId: true } }, topicGroup: { select: { name: true, nameEn: true } } } },
        _count: { select: { vocabularyUsages: { where: { lessonVersion: { status: 'PUBLISHED' } } } } },
      },
    }),
  ]);
  const entries = draft.wordBanks.flatMap(bank => bank.languageBlocks.map(block => ({
    sourceSlug: block.slug, sourceBankSlug: bank.slug, expression: block.canonicalForm, meaning: block.meaning, pronunciation: block.pronunciation,
    candidates: candidates.filter(candidate => candidate.normalizedExpression === normalizeVocabularyExpression(block.canonicalForm)).map(candidate => ({
      id: candidate.id, expression: candidate.canonicalForm, meaning: candidate.meaning, pronunciation: candidate.pronunciation,
      originBankName: candidate.wordBank.name, contextCount: candidate._count.vocabularyUsages,
      contexts: candidate.vocabularyUsages.map(use => ({
        lessonId: use.lessonVersion.lessonId, lessonVersionId: use.lessonVersionId, lessonTitle: use.lessonVersion.title,
        topicGroupId: use.topicGroupId, topicName: use.topicGroup?.name ?? use.topicName, topicNameEn: use.topicGroup?.nameEn ?? use.topicNameEn,
      })),
    })),
  })));
  const reviewHash = createHash('sha256').update(JSON.stringify({
    id: source.id, revision: source.draftRevision, sourceHash: source.sourceHash, topicGroupRevision: source.topicGroupRevision, topicGroupId: groupId,
    topicRevision: topic?.revision, topicName: topic?.name, topicNameEn: topic?.nameEn,
    candidates: candidates.map(candidate => ({ id: candidate.id, expression: candidate.canonicalForm, meaning: candidate.meaning, updatedAt: candidate.updatedAt })),
  })).digest('hex');
  return { importId: source.id, draftRevision: source.draftRevision, sourceHash: source.sourceHash, reviewHash, topic: topic ? { id: topic.id, name: topic.name, nameEn: topic.nameEn } : null, entries };
}

export function validateVocabularyPublicationSelection(review: VocabularyPublicationReview, input: unknown) {
  if (input === undefined) throw new UnprocessableEntityException({ code: 'VOCABULARY_REVIEW_REQUIRED', message: 'Review vocabulary and choose existing or new meanings before publishing.' });
  const parsed = vocabularyPublicationSelectionSchema.safeParse(input);
  if (!parsed.success) throw new UnprocessableEntityException({ code: 'VOCABULARY_SELECTION_INVALID', message: 'Each vocabulary entry needs one valid decision.' });
  if (parsed.data.reviewHash !== review.reviewHash) throw new ConflictException({ code: 'VOCABULARY_REVIEW_STALE', message: 'The source, topic, or vocabulary catalog changed. Review the vocabulary again.' });
  const choices = new Map(parsed.data.choices.map(choice => [choice.sourceSlug, choice]));
  if (choices.size !== review.entries.length || review.entries.some(entry => {
    const choice = choices.get(entry.sourceSlug);
    return !choice || (choice.action === 'reuse' && !entry.candidates.some(candidate => candidate.id === choice.languageBlockId));
  })) throw new UnprocessableEntityException({ code: 'VOCABULARY_SELECTION_INVALID', message: 'Choose an eligible meaning or create a new meaning for every entry.' });
  return choices;
}
