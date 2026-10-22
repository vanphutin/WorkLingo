import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, VocabularyBatch } from '@prisma/client';
import {
  vocabularyBatchInputSchema, vocabularyStageSchema, vocabularyReviewSchema, vocabularyPublishSchema, vocabularyRollbackSchema, vocabularyInventorySchema,
  vocabularyQuerySchema,
  reviewableVocabularyExceptionKey, vocabularyExceptionResolutionSchema, vocabularyExceptionRowResolver,
  type VocabularyBatchInput, type VocabularyStageInput, type VocabularyReviewInput, type VocabularyPublishInput,
} from '@worklingo/contracts';
import { PrismaService } from '../common/database/prisma.service.js';
import { checkSourceRights, contentHash, normalizeLexicalForm, validateInventory, validateSourceRow, vocabularyError } from './domain/import-policy.js';
import { requireVocabularySenses } from './vocabulary-library.service.js';

@Injectable()
export class VocabularyImportsService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  private async locked(tx: Prisma.TransactionClient, id: string) {
    const identity = await tx.vocabularyBatch.findUnique({ where: { id }, select: { documentId: true } });
    if (!identity) throw new NotFoundException('Vocabulary import batch not found');
    // Parser versions share immutable occurrences and their one canonical resolution.
    await tx.$queryRaw`SELECT id FROM "VocabularyDocument" WHERE id=${identity.documentId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "VocabularyBatch" WHERE id=${id}::uuid FOR UPDATE`;
    const batch = await tx.vocabularyBatch.findUnique({ where: { id }, include: { document: { include: { source: true } } } });
    if (!batch) throw new NotFoundException('Vocabulary import batch not found');
    await tx.$queryRaw`SELECT id FROM "VocabularySource" WHERE id=${batch.document.sourceId}::uuid FOR SHARE`;
    const source = await tx.vocabularySource.findUniqueOrThrow({ where: { id: batch.document.sourceId } });
    return { batch, source, inventory: vocabularyInventorySchema.parse(batch.inventory) };
  }
  private mutable(batch: VocabularyBatch, revision: number) {
    if (batch.revision !== revision) throw new ConflictException({ code: 'VOCABULARY_STALE', message: 'Refresh the batch before making another decision.' });
    if (['PUBLISHED', 'ROLLED_BACK', 'FAILED'].includes(batch.status)) vocabularyError('VOCABULARY_BATCH_FROZEN', 'This import batch cannot be changed.');
  }
  async start(raw: VocabularyBatchInput) {
    const input = vocabularyBatchInputSchema.parse(raw);
    const document = await this.db.vocabularyDocument.findUnique({ where: { id: input.documentId }, include: { source: true } });
    if (!document) throw new NotFoundException('Source document not found');
    const keys = validateInventory(input.inventory, document.pageCount);
    const inventoryHash = contentHash(input.inventory);
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vocabulary-batch:${document.id}:${input.parserVersion}`}))`;
      const existing = await tx.vocabularyBatch.findUnique({ where: { documentId_parserVersion: { documentId: document.id, parserVersion: input.parserVersion } } });
      if (existing) {
        if (existing.inventoryHash !== inventoryHash) throw new ConflictException({ code: 'SOURCE_INVENTORY_CONFLICT', message: 'The same parser/document identity produced a different inventory.' });
        if (existing.status === 'BLOCKED_BY_RIGHTS') {
          checkSourceRights(document.source);
          return tx.vocabularyBatch.update({ where: { id: existing.id }, data: { status: 'REGISTERED', revision: { increment: 1 } } });
        }
        return existing;
      }
      let status = 'REGISTERED';
      try { checkSourceRights(document.source); } catch { status = 'BLOCKED_BY_RIGHTS'; }
      return tx.vocabularyBatch.create({ data: { documentId: document.id, parserVersion: input.parserVersion, inventory: input.inventory as Prisma.InputJsonValue, inventoryHash, detectedRows: keys.length, status } });
    });
  }
  async stage(id: string, raw: VocabularyStageInput) {
    const input = vocabularyStageSchema.parse(raw);
    return this.db.$transaction(async tx => {
      const { batch, source, inventory } = await this.locked(tx, id);
      checkSourceRights(source);
      const prepared = input.rows.map(row => {
        validateSourceRow(row, inventory, batch.document.pageCount, batch.document.cefrLevel);
        checkSourceRights(source, ['FORM', ...(row.permittedDefinition !== null ? ['DEFINITION'] : []), ...(row.pronunciation !== null ? ['PRONUNCIATION'] : [])]);
        return { ...row, documentId: batch.documentId, sourceContentHash: contentHash(row) };
      });
      if (new Set(prepared.map(row => row.sourceEntryKey)).size !== prepared.length) vocabularyError('VOCABULARY_ROW_INVALID', 'A staging chunk contains duplicate row identities.');
      const existing = await tx.vocabularySourceEntry.findMany({ where: { documentId: batch.documentId, sourceEntryKey: { in: prepared.map(row => row.sourceEntryKey) } } });
      if (existing.some(entry => prepared.find(row => row.sourceEntryKey === entry.sourceEntryKey)?.sourceContentHash !== entry.sourceContentHash)) throw new ConflictException({ code: 'SOURCE_ENTRY_CONFLICT', message: 'An immutable source occurrence has changed. Register a new document or resolve the parser discrepancy.' });
      const alreadyLinked = await tx.vocabularyBatchRow.count({ where: { batchId: id, sourceEntryId: { in: existing.map(entry => entry.id) } } });
      if (existing.length === prepared.length && alreadyLinked === prepared.length) return batch;
      this.mutable(batch, input.revision);
      await tx.vocabularySourceEntry.createMany({ data: prepared.filter(row => !existing.some(entry => entry.sourceEntryKey === row.sourceEntryKey)).map(row => ({ ...row, locations: row.locations as Prisma.InputJsonValue })), skipDuplicates: true });
      const persisted = await tx.vocabularySourceEntry.findMany({ where: { documentId: batch.documentId, sourceEntryKey: { in: prepared.map(row => row.sourceEntryKey) } } });
      if (persisted.length !== prepared.length || persisted.some(entry => prepared.find(row => row.sourceEntryKey === entry.sourceEntryKey)?.sourceContentHash !== entry.sourceContentHash)) throw new ConflictException({ code: 'SOURCE_ENTRY_CONFLICT', message: 'Concurrent staging produced conflicting provenance.' });
      await tx.vocabularyBatchRow.createMany({ data: persisted.map(entry => ({ batchId: id, sourceEntryId: entry.id })), skipDuplicates: true });
      const checkpoint = await tx.vocabularyBatchRow.count({ where: { batchId: id } });
      return tx.vocabularyBatch.update({ where: { id }, data: { checkpoint, status: 'REVIEW_REQUIRED', revision: { increment: 1 } } });
    }, { timeout: 20000 });
  }
  async review(id: string, actorId: string, raw: VocabularyReviewInput) {
    const input = vocabularyReviewSchema.parse(raw);
    return this.db.$transaction(async tx => {
      const { batch, source, inventory } = await this.locked(tx, id); checkSourceRights(source); this.mutable(batch, input.revision);
      const row = await tx.vocabularyBatchRow.findUnique({ where: { batchId_sourceEntryId: { batchId: id, sourceEntryId: input.sourceEntryId } }, include: { sourceEntry: true } });
      if (!row) throw new NotFoundException('Source row does not belong to this batch');
      if (row.validationState !== 'REVIEW_REQUIRED') throw new ConflictException({ code: 'VOCABULARY_ALREADY_REVIEWED', message: 'This source occurrence already has a review decision.' });
      const originalEntry = row.sourceEntry;
      const resolvedExceptions = input.correction || input.decision === 'REJECT' ? inventory.pages.flatMap(page => page.exceptions.filter(exception => reviewableVocabularyExceptionKey(exception, [originalEntry]) === originalEntry.sourceEntryKey).map(exception => ({ ...exception, sourceContentHash: originalEntry.sourceContentHash, reason: input.correction?.reason ?? input.rejectionReason! }))) : [];
      if (input.correction && input.correction.sourceContentHash !== originalEntry.sourceContentHash) throw new ConflictException({ code: 'VOCABULARY_STALE', message: 'The correction does not match the immutable source occurrence.' });
      if (input.correction && input.decision === 'REJECT') vocabularyError('VOCABULARY_MATCH_INVALID', 'A correction belongs to an accepted vocabulary occurrence.');
      const sourceEntry = input.correction ? { ...originalEntry, parsedWord: input.correction.parsedWord, normalizedPos: input.correction.normalizedPos, warnings: [], extractionConfidence: 1 } : originalEntry;
      if (input.decision === 'REJECT') {
        if (await tx.vocabularyEntryResolution.findUnique({ where: { sourceEntryId: sourceEntry.id } })) throw new ConflictException({ code: 'VOCABULARY_RESOLUTION_CONFLICT', message: 'A reviewed vocabulary occurrence cannot become a non-vocabulary rejection.' });
        await tx.vocabularyBatchRow.update({ where: { batchId_sourceEntryId: { batchId: id, sourceEntryId: input.sourceEntryId } }, data: { validationState: 'REJECTED', rejectionReason: input.rejectionReason!, reviewedBy: actorId, reviewedAt: new Date(), resolvedExceptions: resolvedExceptions as Prisma.InputJsonValue } });
      } else {
        if (sourceEntry.warnings.length || sourceEntry.normalizedPos === 'UNKNOWN' || sourceEntry.extractionConfidence < 1) vocabularyError('VOCABULARY_SOURCE_UNRESOLVED', 'Resolve extraction warnings in a new verified parser version before approving this row.');
        checkSourceRights(source, ['FORM', ...(sourceEntry.permittedDefinition !== null ? ['DEFINITION'] : []), ...(sourceEntry.pronunciation !== null ? ['PRONUNCIATION'] : [])]);
        let entry = input.decision === 'NEW_ENTRY' ? await tx.lexicalEntry.create({ data: { canonicalForm: sourceEntry.parsedWord, normalizedForm: normalizeLexicalForm(sourceEntry.parsedWord), language: source.languageCode, entryType: input.entryType, partOfSpeech: sourceEntry.normalizedPos, editorialStatus: 'REVIEWED' } }) : null;
        let sense = input.decision === 'REUSE_SENSE' ? await tx.lexicalSense.findUnique({ where: { id: input.senseId! }, include: { entry: true } }) : null;
        if (input.decision === 'REUSE_SENSE') { if (sense) await requireVocabularySenses(tx, [sense.id]); entry = sense?.entry ?? null; }
        if (input.decision === 'NEW_SENSE') entry = await tx.lexicalEntry.findUnique({ where: { id: input.lexicalEntryId! } });
        if (!entry || entry.normalizedForm !== normalizeLexicalForm(sourceEntry.parsedWord) || entry.partOfSpeech !== sourceEntry.normalizedPos || entry.language !== source.languageCode || sense && sense.editorialStatus !== 'REVIEWED') vocabularyError('VOCABULARY_MATCH_INVALID', 'Choose a compatible reviewed lexical identity; spelling alone does not establish a sense match.');
        const previous = await tx.vocabularyEntryResolution.findUnique({ where: { sourceEntryId: sourceEntry.id } });
        if (previous && (input.decision !== 'REUSE_SENSE' || previous.senseId !== sense?.id)) throw new ConflictException({ code: 'VOCABULARY_RESOLUTION_CONFLICT', message: 'A prior parser version already resolved this occurrence; reuse that reviewed sense.' });
        if (!sense) sense = await tx.lexicalSense.create({ data: { lexicalEntryId: entry.id, senseKey: randomUUID(), definition: sourceEntry.permittedDefinition, sourceId: source.id, rightsBasis: source.permissionReference!, editorialStatus: 'REVIEWED' }, include: { entry: true } });
        // Dialect is explicit source evidence; unspecified sources remain und.
        if (sourceEntry.pronunciation && !await tx.lexicalPronunciation.findFirst({ where: { lexicalEntryId: entry.id, sourceId: source.id, dialect: source.pronunciationDialect, ipa: sourceEntry.pronunciation } })) await tx.lexicalPronunciation.create({ data: { lexicalEntryId: entry.id, sourceId: source.id, dialect: source.pronunciationDialect, ipa: sourceEntry.pronunciation, rightsBasis: source.permissionReference!, reviewStatus: 'REVIEWED' } });
        await tx.vocabularyEntryResolution.upsert({ where: { sourceEntryId: sourceEntry.id }, create: { sourceEntryId: sourceEntry.id, lexicalEntryId: entry.id, senseId: sense.id, decision: input.decision, reviewedBy: actorId }, update: {} });
        await tx.lexicalCefrAssociation.upsert({ where: { sourceEntryId_cefrLevel: { sourceEntryId: sourceEntry.id, cefrLevel: sourceEntry.cefrLevel } }, create: { sourceEntryId: sourceEntry.id, lexicalEntryId: entry.id, senseId: sense.id, cefrLevel: sourceEntry.cefrLevel }, update: {} });
        if (input.topicGroupIds.length) await tx.lexicalEntryTopic.createMany({ data: input.topicGroupIds.map(topicGroupId => ({ lexicalEntryId: entry!.id, topicGroupId })), skipDuplicates: true });
        await tx.vocabularyTopicMapping.upsert({ where: { documentId_topicInstanceKey: { documentId: batch.documentId, topicInstanceKey: sourceEntry.topicInstanceKey } }, create: { documentId: batch.documentId, topicInstanceKey: sourceEntry.topicInstanceKey, originalTopic: sourceEntry.originalTopic, topicGroupId: input.topicGroupIds[0] ?? null }, update: {} });
        await tx.vocabularyBatchRow.update({ where: { batchId_sourceEntryId: { batchId: id, sourceEntryId: sourceEntry.id } }, data: { validationState: 'VALIDATED', reviewedBy: actorId, reviewedAt: new Date(), resolvedExceptions: resolvedExceptions as Prisma.InputJsonValue, ...(input.correction ? { reviewCorrection: input.correction } : {}) } });
      }
      const unresolved = await tx.vocabularyBatchRow.count({ where: { batchId: id, validationState: 'REVIEW_REQUIRED' } });
      return tx.vocabularyBatch.update({ where: { id }, data: { status: unresolved || batch.checkpoint !== batch.detectedRows ? 'REVIEW_REQUIRED' : 'REVIEWED', revision: { increment: 1 }, reviewedBy: actorId, reviewedAt: new Date() } });
    });
  }
  async publish(id: string, actorId: string, raw: VocabularyPublishInput) {
    const input = vocabularyPublishSchema.parse(raw);
    return this.db.$transaction(async tx => {
      const { batch, source, inventory } = await this.locked(tx, id); checkSourceRights(source);
      const existing = await tx.vocabularyCollectionVersion.findUnique({ where: { batchId: id }, include: { members: { orderBy: { position: 'asc' } } } });
      if (existing && batch.status === 'PUBLISHED') { await requireVocabularySenses(tx, existing.members.map(member => member.senseId)); return existing; }
      this.mutable(batch, input.revision);
      const rows = await tx.vocabularyBatchRow.findMany({ where: { batchId: id }, include: { sourceEntry: { include: { resolution: true } } }, orderBy: [{ sourceEntry: { topicSequence: 'asc' } }, { sourceEntry: { rowOrdinal: 'asc' } }] });
      const expected = validateInventory(inventory, batch.document.pageCount);
      const expectedKeys = new Set(expected);
      const rowsByKey = new Map(rows.map(row => [row.sourceEntry.sourceEntryKey, row]));
      const exceptionRowKey = vocabularyExceptionRowResolver(rows.map(row => row.sourceEntry));
      const unresolvedExceptions = inventory.pages.some(page => page.exceptions.some(exception => {
        const key = exceptionRowKey(exception);
        const row = key ? rowsByKey.get(key) : undefined;
        const resolutions = vocabularyExceptionResolutionSchema.array().safeParse(row?.resolvedExceptions);
        return !row || row.validationState === 'REVIEW_REQUIRED' || !row.reviewedBy || !row.reviewedAt || !resolutions.success || !resolutions.data.some(resolution => resolution.sourceContentHash === row.sourceEntry.sourceContentHash && resolution.code === exception.code && JSON.stringify(resolution.location) === JSON.stringify(exception.location));
      }));
      if (unresolvedExceptions || rows.length !== expected.length || rows.some(row => !expectedKeys.has(row.sourceEntry.sourceEntryKey) || row.validationState === 'REVIEW_REQUIRED' || row.validationState === 'VALIDATED' && !row.sourceEntry.resolution)) vocabularyError('VOCABULARY_INCOMPLETE', 'Every independently detected source row must be reconciled and all extraction exceptions resolved.');
      const accepted = rows.filter(row => row.validationState === 'VALIDATED');
      if (!accepted.length) vocabularyError('VOCABULARY_INCOMPLETE', 'An empty vocabulary snapshot cannot be published.');
      await requireVocabularySenses(tx, accepted.map(row => row.sourceEntry.resolution!.senseId));
      for (const row of accepted) checkSourceRights(source, ['FORM', ...(row.sourceEntry.permittedDefinition !== null ? ['DEFINITION'] : []), ...(row.sourceEntry.pronunciation !== null ? ['PRONUNCIATION'] : [])]);
      const collection = input.collectionId ? await tx.vocabularyCollection.findUnique({ where: { id: input.collectionId } }) : await tx.vocabularyCollection.create({ data: { name: input.collectionName, type: 'CEFR', ownerReference: source.id } });
      if (!collection) throw new NotFoundException('Vocabulary collection not found');
      await tx.$queryRaw`SELECT id FROM "VocabularyCollection" WHERE id=${collection.id}::uuid FOR UPDATE`;
      const latest = await tx.vocabularyCollectionVersion.aggregate({ where: { collectionId: collection.id }, _max: { version: true } });
      const version = await tx.vocabularyCollectionVersion.create({ data: { collectionId: collection.id, version: (latest._max.version ?? 0) + 1, batchId: id } });
      const unique = new Map(accepted.map(row => [row.sourceEntry.resolution!.senseId, row.sourceEntry.resolution!]));
      await tx.vocabularyCollectionMember.createMany({ data: [...unique.values()].map((resolution, position) => ({ collectionVersionId: version.id, lexicalEntryId: resolution.lexicalEntryId, senseId: resolution.senseId, position })) });
      await tx.vocabularyCollectionVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      await tx.vocabularyBatch.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date(), reviewedBy: actorId, revision: { increment: 1 } } });
      return tx.vocabularyCollectionVersion.findUniqueOrThrow({ where: { id: version.id }, include: { members: { orderBy: { position: 'asc' } } } });
    }, { timeout: 20000 });
  }
  async rollback(id: string, raw: { revision: number; reason: string }) {
    const input = vocabularyRollbackSchema.parse(raw);
    return this.db.$transaction(async tx => {
      const { batch } = await this.locked(tx, id);
      if (batch.status === 'ROLLED_BACK') return batch;
      if (batch.revision !== input.revision || batch.status !== 'PUBLISHED') throw new ConflictException({ code: 'VOCABULARY_STALE', message: 'Only the current published batch can be retired.' });
      await tx.vocabularyCollectionVersion.updateMany({ where: { batchId: id }, data: { status: 'ARCHIVED' } });
      return tx.vocabularyBatch.update({ where: { id }, data: { status: 'ROLLED_BACK', rollbackReason: input.reason, revision: { increment: 1 } } });
    });
  }
  async list(page = 1, limit = 25) {
    ({ page, limit } = vocabularyQuerySchema.pick({ page: true, limit: true }).parse({ page, limit }));
    const [items, total] = await this.db.$transaction([this.db.vocabularyBatch.findMany({ skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], include: { document: { select: { cefrLevel: true, originalFilename: true, source: { select: { id: true, title: true, rightsStatus: true } } } } } }), this.db.vocabularyBatch.count()]);
    return { items, total, page, limit };
  }
  async detail(id: string, page = 1, limit = 25) {
    ({ page, limit } = vocabularyQuerySchema.pick({ page: true, limit: true }).parse({ page, limit }));
    return this.db.$transaction(async tx => {
      const { batch, source } = await this.locked(tx, id); checkSourceRights(source);
      const rows = await tx.vocabularyBatchRow.findMany({ where: { batchId: id }, skip: (page - 1) * limit, take: limit, orderBy: [{ sourceEntry: { topicSequence: 'asc' } }, { sourceEntry: { rowOrdinal: 'asc' } }, { sourceEntryId: 'asc' }], include: { sourceEntry: { include: { resolution: true } } } });
      for (const { sourceEntry: row } of rows) checkSourceRights(source, ['FORM', ...(row.permittedDefinition !== null ? ['DEFINITION'] : []), ...(row.pronunciation !== null ? ['PRONUNCIATION'] : [])]);
      await requireVocabularySenses(tx, rows.flatMap(row => row.sourceEntry.resolution ? [row.sourceEntry.resolution.senseId] : []));
      const total = await tx.vocabularyBatchRow.count({ where: { batchId: id } });
      const grouped = await tx.vocabularyBatchRow.groupBy({ by: ['validationState'], where: { batchId: id }, orderBy: { validationState: 'asc' }, _count: { _all: true } });
      return { batch, rows, total, page, limit, reconciliation: { detected: batch.detectedRows, stored: total, validated: grouped.find(group => group.validationState === 'VALIDATED')?._count._all ?? 0, unresolved: batch.detectedRows - grouped.filter(group => group.validationState !== 'REVIEW_REQUIRED').reduce((sum, group) => sum + group._count._all, 0), rejected: grouped.find(group => group.validationState === 'REJECTED')?._count._all ?? 0 } };
    });
  }
}
