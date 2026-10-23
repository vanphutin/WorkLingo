import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TopicVocabularyDifficulty } from '@worklingo/contracts';
import { PrismaService } from '../common/database/prisma.service.js';

export type TopicVocabularyCandidate = { sourceEntryId: string; lexicalEntryId: string; senseId: string; expression: string; cefrLevel: string; definition: string | null; attribution: string };
@Injectable()
export class TopicVocabularyService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}
  async select(topicGroupId: string, difficulty: TopicVocabularyDifficulty): Promise<TopicVocabularyCandidate[]> {
    const levels = difficulty === 'easy' ? ['A1'] : difficulty === 'medium' ? ['A2', 'A1'] : ['B1', 'A2', 'A1'];
    const source = { rightsStatus: 'APPROVED', permissionReference: { not: null }, allowedUses: { hasEvery: ['EXTRACT', 'STORE', 'MODIFY', 'TRANSLATE'] }, allowedFields: { hasEvery: ['FORM', 'DEFINITION'] } } satisfies Prisma.VocabularySourceWhereInput;
    const pool: TopicVocabularyCandidate[] = [];
    const seen = new Set<string>();
    const perLevel = Math.floor(40 / levels.length);
    for (const level of levels) {
      const base = {
        sourceEntry: { cefrLevel: level, warnings: { isEmpty: true }, extractionConfidence: 1, batches: { some: { validationState: 'VALIDATED' } }, document: { source } },
        entry: { editorialStatus: 'REVIEWED' }, sense: { editorialStatus: 'REVIEWED', source },
      } satisfies Prisma.VocabularyEntryResolutionWhereInput;
      const include = { entry: { select: { canonicalForm: true } }, sense: { select: { definition: true } }, sourceEntry: { select: { cefrLevel: true, document: { select: { source: { select: { attributionRequirements: true } } } } } } } satisfies Prisma.VocabularyEntryResolutionInclude;
      const related = await this.database.vocabularyEntryResolution.findMany({ where: { ...base, entry: { ...base.entry, topics: { some: { topicGroupId } } } }, orderBy: { sourceEntryId: 'asc' }, take: perLevel, include });
      const rows = related.length >= perLevel ? related : [...related, ...await this.database.vocabularyEntryResolution.findMany({ where: { ...base, sourceEntryId: { notIn: related.map(row => row.sourceEntryId) } }, orderBy: { sourceEntryId: 'asc' }, take: perLevel - related.length, include })];
      for (const row of rows) {
        const form = row.entry.canonicalForm.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
        if (seen.has(form)) continue;
        seen.add(form);
        pool.push({ sourceEntryId: row.sourceEntryId, lexicalEntryId: row.lexicalEntryId, senseId: row.senseId, expression: row.entry.canonicalForm, cefrLevel: row.sourceEntry.cefrLevel, definition: row.sense.definition, attribution: row.sourceEntry.document.source.attributionRequirements });
      }
    }
    if (!pool.some(item => item.cefrLevel === levels[0])) throw new UnprocessableEntityException({ code: 'TOPIC_VOCABULARY_UNAVAILABLE', message: 'No approved reviewed vocabulary exists for the selected difficulty. Import or review vocabulary first.' });
    return pool;
  }
}
