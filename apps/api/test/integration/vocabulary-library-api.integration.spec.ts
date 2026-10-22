import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { VocabularySourceRow } from '@worklingo/contracts';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { VocabularySourcesService } from '../../src/vocabulary/vocabulary-sources.service.js';
import { VocabularyImportsService } from '../../src/vocabulary/vocabulary-imports.service.js';
import { VocabularyLibraryService } from '../../src/vocabulary/vocabulary-library.service.js';

describe('Rights-gated master vocabulary workflow', () => {
  const url = process.env.TEST_DATABASE_URL!;
  if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Use an isolated *_test database');
  const db = new PrismaClient({ datasourceUrl: url });
  let sources: VocabularySourcesService; let imports: VocabularyImportsService; let library: VocabularyLibraryService;
  const actor = randomUUID();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ providers: [VocabularySourcesService, VocabularyImportsService, VocabularyLibraryService, { provide: PrismaService, useValue: db }] }).compile();
    sources = module.get(VocabularySourcesService); imports = module.get(VocabularyImportsService); library = module.get(VocabularyLibraryService);
  });
  afterAll(() => db.$disconnect());
  const row = (ordinal: number, pos: 'NOUN' | 'VERB' = 'NOUN'): VocabularySourceRow => ({ sourceEntryKey: `topic-1:${ordinal}`, topicInstanceKey: 'topic-1', originalTopic: 'Synthetic records', topicSequence: 1, rowOrdinal: ordinal, pageIndex: 0, printedPageNumber: null, locations: [{ pageIndex: 0, bbox: [10, ordinal * 20, 500, ordinal * 20 + 15] }], rawWord: 'record', parsedWord: 'record', rawPos: pos.toLowerCase(), normalizedPos: pos, cefrLevel: 'A1', pronunciation: '/ˈrek.ərd/', permittedDefinition: pos === 'NOUN' ? 'An independently authored stored account of an event.' : 'To preserve information for later use.', extractionConfidence: 1, warnings: [] });
  async function fixture(approved = true, count = 2, pronunciationDialect: 'en-US' | 'en-GB' | 'und' = 'und') {
    const source = await sources.register({ providerName: 'Synthetic', title: 'Independently authored test', sourceUrl: `https://example.test/${randomUUID()}`, languageCode: 'en', pronunciationDialect, attributionRequirements: '' });
    if (approved) await sources.rights(source.id, { revision: 1, rightsStatus: 'APPROVED', permissionReference: 'synthetic-fixture-authored-here', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM', 'DEFINITION', 'PRONUNCIATION'] });
    const document = await sources.document({ sourceId: source.id, cefrLevel: 'A1', originalFilename: 'synthetic.pdf', sha256: randomUUID().replaceAll('-', '').repeat(2), pageCount: 1, edition: '' });
    const batch = await imports.start({ documentId: document.id, parserVersion: 'synthetic/1', inventory: { pages: [{ pageIndex: 0, detectedKeys: Array.from({ length: count }, (_, i) => `topic-1:${i + 1}`), exceptions: [] }] } });
    return { source, document, batch };
  }
  async function staged() {
    const f = await fixture(); const batch = await imports.stage(f.batch.id, { revision: f.batch.revision, rows: [row(1), row(2, 'VERB')] });
    const rows = await db.vocabularyBatchRow.findMany({ where: { batchId: batch.id }, include: { sourceEntry: true }, orderBy: { sourceEntry: { rowOrdinal: 'asc' } } });
    return { ...f, batch, rows };
  }
  async function reviewed() {
    const f = await staged(); let current = f.batch;
    for (const item of f.rows) current = await imports.review(current.id, actor, { revision: current.revision, sourceEntryId: item.sourceEntryId, decision: 'NEW_ENTRY', entryType: 'WORD', topicGroupIds: [] });
    return { ...f, batch: current };
  }

  it('keeps unapproved sources blocked before any content is stored', async () => {
    const f = await fixture(false);
    expect(f.batch.status).toBe('BLOCKED_BY_RIGHTS');
    await expect(imports.stage(f.batch.id, { revision: 1, rows: [row(1)] })).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
    expect(await db.vocabularySourceEntry.count({ where: { documentId: f.document.id } })).toBe(0);
  });
  it('stages concurrent retries idempotently and rejects changed provenance', async () => {
    const f = await fixture(true, 1); const input = { revision: 1, rows: [row(1)] };
    const [first, retry] = await Promise.all([imports.stage(f.batch.id, input), imports.stage(f.batch.id, input)]);
    expect(first.checkpoint).toBe(1); expect(retry.checkpoint).toBe(1);
    expect(await db.vocabularySourceEntry.count({ where: { documentId: f.document.id } })).toBe(1);
    await expect(imports.stage(f.batch.id, { revision: retry.revision, rows: [{ ...row(1), rawWord: 'changed' }] })).rejects.toMatchObject({ response: { code: 'SOURCE_ENTRY_CONFLICT' } });
  });
  it('does not publish when an independently enumerated source row is missing', async () => {
    const f = await fixture(); const batch = await imports.stage(f.batch.id, { revision: 1, rows: [row(1)] });
    await expect(imports.publish(batch.id, actor, { revision: batch.revision, collectionName: 'Incomplete' })).rejects.toMatchObject({ response: { code: 'VOCABULARY_INCOMPLETE' } });
    expect(await db.vocabularyCollectionVersion.count({ where: { batchId: batch.id } })).toBe(0);
  });
  it('preserves spelling homographs as separate reviewed POS identities and source occurrences', async () => {
    const f = await reviewed(); const resolutions = await db.vocabularyEntryResolution.findMany({ where: { sourceEntryId: { in: f.rows.map(item => item.sourceEntryId) } }, include: { entry: true } });
    expect(new Set(resolutions.map(item => item.lexicalEntryId)).size).toBe(2);
    expect(resolutions.map(item => item.entry.partOfSpeech).sort()).toEqual(['NOUN', 'VERB']);
    const result = await imports.publish(f.batch.id, actor, { revision: f.batch.revision, collectionName: 'Synthetic reviewed vocabulary' });
    const retry = await imports.publish(f.batch.id, actor, { revision: f.batch.revision, collectionName: 'Synthetic reviewed vocabulary' });
    expect(retry.id).toBe(result.id); expect(result.members).toHaveLength(2);
    await expect(db.vocabularyCollectionMember.deleteMany({ where: { collectionVersionId: result.id } })).rejects.toThrow();
    await expect(db.vocabularyCollectionVersion.update({ where: { id: result.id }, data: { version: 99 } })).rejects.toThrow();
    const rolledBack = await imports.rollback(f.batch.id, { revision: (await db.vocabularyBatch.findUniqueOrThrow({ where: { id: f.batch.id } })).revision, reason: 'Synthetic acceptance rollback' });
    expect(rolledBack.status).toBe('ROLLED_BACK');
    expect((await db.vocabularyCollectionVersion.findUniqueOrThrow({ where: { id: result.id } })).status).toBe('ARCHIVED');
    expect(await db.vocabularySourceEntry.count({ where: { documentId: f.document.id } })).toBe(2);
    expect(await db.vocabularyCollectionMember.count({ where: { collectionVersionId: result.id } })).toBe(2);
  });
  it('rechecks rights after review and before publication', async () => {
    const f = await reviewed(); const source = await db.vocabularySource.findUniqueOrThrow({ where: { id: f.source.id } });
    await sources.rights(source.id, { revision: source.revision, rightsStatus: 'REVOKED', permissionReference: null, allowedUses: [], allowedFields: [] });
    await expect(imports.publish(f.batch.id, actor, { revision: f.batch.revision, collectionName: 'Revoked' })).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
  });
  it('returns bounded filtered search with separate CEFR/POS/source dimensions', async () => {
    const f = await reviewed(); await imports.publish(f.batch.id, actor, { revision: f.batch.revision, collectionName: 'Searchable synthetic data' });
    const result = await library.search({ page: 1, limit: 1, cefr: 'A1', pos: 'VERB', sourceId: f.source.id, search: 'record' });
    expect(result.items).toHaveLength(1); expect(result.total).toBe(1); expect(result.items[0]?.partOfSpeech).toBe('VERB');
  });

  it('serializes different parser batches resolving the same immutable occurrence', async () => {
    const f = await fixture(true, 1);
    const other = await imports.start({ documentId: f.document.id, parserVersion: 'synthetic/2', inventory: { pages: [{ pageIndex: 0, detectedKeys: ['topic-1:1'], exceptions: [] }] } });
    await Promise.all([imports.stage(f.batch.id, { revision: 1, rows: [row(1)] }), imports.stage(other.id, { revision: 1, rows: [row(1)] })]);
    const occurrence = await db.vocabularySourceEntry.findFirstOrThrow({ where: { documentId: f.document.id } });
    const results = await Promise.allSettled([f.batch.id, other.id].map(id => imports.review(id, actor, { revision: 2, sourceEntryId: occurrence.id, decision: 'NEW_ENTRY', entryType: 'WORD', topicGroupIds: [] })));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await db.lexicalSense.count({ where: { sourceId: f.source.id } })).toBe(1);
  });

  it('blocks cross-source reuse when the target sense source was revoked', async () => {
    const first = await reviewed();
    const resolution = await db.vocabularyEntryResolution.findUniqueOrThrow({ where: { sourceEntryId: first.rows[0]!.sourceEntryId } });
    const second = await staged();
    await sources.rights(first.source.id, { revision: 2, rightsStatus: 'REVOKED', permissionReference: null, allowedUses: [], allowedFields: [] });
    await expect(imports.review(second.batch.id, actor, { revision: second.batch.revision, sourceEntryId: second.rows[0]!.sourceEntryId, decision: 'REUSE_SENSE', senseId: resolution.senseId, entryType: 'WORD', topicGroupIds: [] })).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
    expect(await db.vocabularyEntryResolution.count({ where: { sourceEntryId: second.rows[0]!.sourceEntryId } })).toBe(0);
  });

  it('rejects stale source and batch review revisions without additional writes', async () => {
    const f = await staged();
    await expect(sources.rights(f.source.id, { revision: 1, rightsStatus: 'REVOKED', permissionReference: null, allowedUses: [], allowedFields: [] })).rejects.toMatchObject({ response: { code: 'VOCABULARY_STALE' } });
    await expect(imports.review(f.batch.id, actor, { revision: 1, sourceEntryId: f.rows[0]!.sourceEntryId, decision: 'NEW_ENTRY', entryType: 'WORD', topicGroupIds: [] })).rejects.toMatchObject({ response: { code: 'VOCABULARY_STALE' } });
    expect(await db.lexicalSense.count({ where: { sourceId: f.source.id } })).toBe(0);
  });

  it('does not expose revoked source content through search or batch detail', async () => {
    const f = await reviewed();
    await sources.rights(f.source.id, { revision: 2, rightsStatus: 'REVOKED', permissionReference: null, allowedUses: [], allowedFields: [] });
    expect((await library.search({ page: 1, limit: 25, sourceId: f.source.id })).items).toEqual([]);
    await expect(imports.detail(f.batch.id)).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
  });

  it('enforces rights fields on direct SQL content inserts and derived senses', async () => {
    const f = await fixture(false, 1);
    await expect(db.vocabularySourceEntry.create({ data: { ...row(1), documentId: f.document.id, sourceContentHash: 'b'.repeat(64) } })).rejects.toThrow(/BLOCKED_BY_RIGHTS/u);
    const entry = await db.lexicalEntry.create({ data: { canonicalForm: 'record', normalizedForm: 'record', partOfSpeech: 'NOUN' } });
    await expect(db.lexicalSense.create({ data: { lexicalEntryId: entry.id, senseKey: randomUUID(), definition: 'Synthetic definition', sourceId: f.source.id, rightsBasis: 'bypass' } })).rejects.toThrow(/BLOCKED_BY_RIGHTS/u);
  });

  it('creates ordered immutable collection versions with explicit assignments and bindings', async () => {
    const f = await reviewed();
    const resolutions = await db.vocabularyEntryResolution.findMany({ where: { sourceEntryId: { in: f.rows.map(item => item.sourceEntryId) } }, orderBy: { sourceEntryId: 'asc' } });
    const senseIds = resolutions.map(item => item.senseId);
    const collection = await library.createCollection({ name: 'Synthetic hand-curated collection', type: 'PROGRAM', ownerReference: actor });
    const versions = await Promise.all([library.createVersion(collection.id, { senseIds }), library.createVersion(collection.id, { senseIds: [...senseIds].reverse() })]);
    expect(versions.map(version => version.version).sort()).toEqual([1, 2]);
    expect(versions[0]!.members.map(member => member.senseId)).toEqual(senseIds);
    const program = await db.learningProgram.findFirstOrThrow();
    await expect(library.bind(versions[0]!.id, { programId: program.id })).rejects.toMatchObject({ response: { code: 'VOCABULARY_VERSION_NOT_PUBLISHED' } });
    const published = await library.publishVersion(versions[0]!.id);
    expect(published.status).toBe('PUBLISHED');
    expect((await library.publishVersion(published.id)).id).toBe(published.id);
    const assignment = await library.assign(actor, { memberId: published.members[0]!.id, programId: program.id, priority: 1, learningGoal: 'BOTH', skills: ['READING'], inclusionReason: 'Independently curated for this test program.' });
    expect(assignment.approvedBy).toBe(actor);
    expect((await library.bind(published.id, { programId: program.id })).programId).toBe(program.id);
    expect((await library.versions(collection.id, 1, 1)).items).toHaveLength(1);
    await expect(db.lexicalSense.update({ where: { id: published.members[0]!.senseId }, data: { definition: 'Mutates the published meaning' } })).rejects.toThrow(/immutable/u);
    await expect(db.lexicalEntry.update({ where: { id: published.members[0]!.lexicalEntryId }, data: { canonicalForm: 'Mutates the published form' } })).rejects.toThrow(/immutable/u);
    await sources.rights(f.source.id, { revision: 2, rightsStatus: 'REVOKED', permissionReference: null, allowedUses: [], allowedFields: [] });
    await expect(library.versions(collection.id)).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
    await expect(library.publishVersion(versions[1]!.id)).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
    await expect(library.detail(resolutions[0]!.lexicalEntryId)).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
  });

  it('bounds options and rejects invalid service-level pagination', async () => {
    const options = await library.options({ page: 1, limit: 1 });
    expect(options.programs.length).toBeLessThanOrEqual(1);
    expect(options.topics.length).toBeLessThanOrEqual(1);
    await expect(library.search({ page: 1, limit: 101 })).rejects.toThrow();
  });

  it('records reviewer evidence for accepted and rejected rows without fabricating pronunciation dialect', async () => {
    const f = await staged();
    const first = await imports.review(f.batch.id, actor, { revision: f.batch.revision, sourceEntryId: f.rows[0]!.sourceEntryId, decision: 'NEW_ENTRY', entryType: 'WORD', topicGroupIds: [] });
    await imports.review(f.batch.id, actor, { revision: first.revision, sourceEntryId: f.rows[1]!.sourceEntryId, decision: 'REJECT', rejectionReason: 'Verified synthetic non-vocabulary example line.', entryType: 'WORD', topicGroupIds: [] });
    const decisions = await db.vocabularyBatchRow.findMany({ where: { batchId: f.batch.id } });
    expect(decisions.every(item => item.reviewedBy === actor && item.reviewedAt instanceof Date)).toBe(true);
    const pronunciation = await db.lexicalPronunciation.findFirstOrThrow({ where: { sourceId: f.source.id } });
    expect(pronunciation.dialect).toBe('und');
  });

  it('fails closed when field permission is withdrawn after storage', async () => {
    const f = await reviewed();
    await sources.rights(f.source.id, { revision: 2, rightsStatus: 'APPROVED', permissionReference: 'synthetic-form-only', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM'] });
    await expect(imports.detail(f.batch.id)).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
    expect((await library.search({ page: 1, limit: 25, sourceId: f.source.id })).total).toBe(0);
  });

  it('rechecks a reused sense source on publication even when the importing source remains approved', async () => {
    const original = await reviewed();
    const resolution = await db.vocabularyEntryResolution.findUniqueOrThrow({ where: { sourceEntryId: original.rows[0]!.sourceEntryId } });
    const next = await fixture(true, 1);
    await imports.stage(next.batch.id, { revision: 1, rows: [row(1)] });
    const occurrence = await db.vocabularySourceEntry.findFirstOrThrow({ where: { documentId: next.document.id } });
    const reviewedBatch = await imports.review(next.batch.id, actor, { revision: 2, sourceEntryId: occurrence.id, decision: 'REUSE_SENSE', senseId: resolution.senseId, entryType: 'WORD', topicGroupIds: [] });
    await sources.rights(original.source.id, { revision: 2, rightsStatus: 'REVOKED', permissionReference: null, allowedUses: [], allowedFields: [] });
    await expect(imports.publish(next.batch.id, actor, { revision: reviewedBatch.revision, collectionName: 'Cross-source revoked' })).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
    expect(await db.vocabularyCollectionVersion.count({ where: { batchId: next.batch.id } })).toBe(0);
    await expect(imports.detail(next.batch.id)).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
  });

  it('preserves legacy identity, bank snapshots and mastery through linking, publishing and rollback', async () => {
    const f = await reviewed();
    const resolution = await db.vocabularyEntryResolution.findUniqueOrThrow({ where: { sourceEntryId: f.rows[0]!.sourceEntryId } });
    const bank = await db.wordBank.create({ data: { slug: randomUUID(), name: 'Independent legacy fixture' } });
    const teaching = { canonicalForm: 'record', meaning: 'Bản ghi do tác giả kiểm thử tạo', pronunciation: '/record/', collocations: ['keep a record'], grammarPattern: '', examples: ['Keep a record.'], commonErrors: [], cefrLevel: 'A1', transferContexts: [] };
    const block = await db.languageBlock.create({ data: { ...teaching, wordBankId: bank.id, slug: randomUUID() } });
    const bankVersion = await db.wordBankVersion.create({ data: { wordBankId: bank.id, version: 1, name: bank.name, sourceHash: randomUUID(), languageBlocks: { create: { ...teaching, slug: block.slug } } }, include: { languageBlocks: true } });
    const learner = await db.user.create({ data: { email: `${randomUUID()}@example.test`, displayName: 'Independent learner', passwordHash: 'test-only', role: 'LEARNER' } });
    const mastery = await db.masteryRecord.create({ data: { learnerId: learner.id, languageBlockId: block.id, skill: 'reading', score: .7, confidence: .5 } });
    const link = await library.legacyLink(actor, { senseId: resolution.senseId, languageBlockId: block.id });
    expect(link.reviewedBy).toBe(actor);
    const version = await imports.publish(f.batch.id, actor, { revision: f.batch.revision, collectionName: 'Legacy preservation test' });
    await library.bind(version.id, { wordBankVersionId: bankVersion.id });
    await imports.rollback(f.batch.id, { revision: f.batch.revision + 1, reason: 'Preserve learner identity after retirement.' });
    expect(await db.languageBlock.findUniqueOrThrow({ where: { id: block.id } })).toEqual(block);
    expect(await db.masteryRecord.findUniqueOrThrow({ where: { id: mastery.id } })).toEqual(mastery);
    expect(await db.wordBankVersion.findUniqueOrThrow({ where: { id: bankVersion.id }, include: { languageBlocks: true } })).toEqual(bankVersion);
    expect(await db.vocabularyCurriculumBinding.count({ where: { collectionVersionId: version.id } })).toBe(1);
  });

  it('retries disjoint concurrent chunks after a stale revision without losing rows', async () => {
    const f = await fixture();
    const results = await Promise.allSettled([1, 2].map(ordinal => imports.stage(f.batch.id, { revision: 1, rows: [row(ordinal)] })));
    expect(results.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    const missing = results.findIndex(item => item.status === 'rejected') + 1;
    expect(await imports.stage(f.batch.id, { revision: 2, rows: [row(missing)] })).toMatchObject({ checkpoint: 2, revision: 3 });
    expect(await db.vocabularyBatchRow.count({ where: { batchId: f.batch.id } })).toBe(2);
  });

  it('conflicts on changed exact-document provenance instead of silently accepting it', async () => {
    const f = await fixture();
    await expect(sources.document({ sourceId: f.source.id, cefrLevel: 'A1', originalFilename: f.document.originalFilename, sha256: f.document.sha256, pageCount: 1, edition: '', sourceUrl: 'https://example.test/changed-provenance' })).rejects.toMatchObject({ response: { code: 'SOURCE_DOCUMENT_CONFLICT' } });
  });

  it('blocks direct publication after revocation and keeps reviewed source mapping immutable', async () => {
    const f = await reviewed();
    const resolution = await db.vocabularyEntryResolution.findUniqueOrThrow({ where: { sourceEntryId: f.rows[0]!.sourceEntryId } });
    const collection = await library.createCollection({ name: 'Direct SQL rights regression', type: 'TOPIC', ownerReference: actor });
    const version = await library.createVersion(collection.id, { senseIds: [resolution.senseId] });
    await expect(db.vocabularyEntryResolution.update({ where: { sourceEntryId: resolution.sourceEntryId }, data: { decision: 'REUSE_SENSE' } })).rejects.toThrow(/immutable/u);
    await sources.rights(f.source.id, { revision: 2, rightsStatus: 'REVOKED', permissionReference: null, allowedUses: [], allowedFields: [] });
    await expect(db.vocabularyCollectionVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })).rejects.toThrow(/BLOCKED_BY_RIGHTS/u);
    expect((await db.vocabularyCollectionVersion.findUniqueOrThrow({ where: { id: version.id } })).status).toBe('DRAFT');
  });

  it('does not expose an existing translation after translation permission is withdrawn', async () => {
    const f = await reviewed();
    const resolution = await db.vocabularyEntryResolution.findUniqueOrThrow({ where: { sourceEntryId: f.rows[0]!.sourceEntryId } });
    await sources.rights(f.source.id, { revision: 2, rightsStatus: 'APPROVED', permissionReference: 'synthetic-authored-translation', allowedUses: ['EXTRACT', 'STORE', 'TRANSLATE'], allowedFields: ['FORM', 'DEFINITION', 'PRONUNCIATION'] });
    await db.lexicalSense.update({ where: { id: resolution.senseId }, data: { translation: 'Bản ghi tự soạn' } });
    const collection = await library.createCollection({ name: 'Translation rights check', type: 'TOPIC', ownerReference: actor });
    const version = await library.createVersion(collection.id, { senseIds: [resolution.senseId] });
    await sources.rights(f.source.id, { revision: 3, rightsStatus: 'APPROVED', permissionReference: 'synthetic-withdrawn-translation', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM', 'DEFINITION', 'PRONUNCIATION'] });
    expect((await library.search({ page: 1, limit: 25, sourceId: f.source.id, pos: 'NOUN' })).items).toEqual([]);
    await expect(library.detail(resolution.lexicalEntryId)).rejects.toMatchObject({ response: { code: 'BLOCKED_BY_RIGHTS' } });
    await expect(db.vocabularyCollectionVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })).rejects.toThrow(/BLOCKED_BY_RIGHTS/u);
  });

  it('resumes the same metadata-only blocked batch after explicit source approval', async () => {
    const f = await fixture(false, 1);
    await sources.rights(f.source.id, { revision: 1, rightsStatus: 'APPROVED', permissionReference: 'synthetic-resume-authorization', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM', 'DEFINITION', 'PRONUNCIATION'] });
    const resumed = await imports.start({ documentId: f.document.id, parserVersion: f.batch.parserVersion, inventory: { pages: [{ pageIndex: 0, detectedKeys: ['topic-1:1'], exceptions: [] }] } });
    expect(resumed).toMatchObject({ id: f.batch.id, status: 'REGISTERED', revision: 2 });
    expect(await imports.stage(resumed.id, { revision: resumed.revision, rows: [row(1)] })).toMatchObject({ checkpoint: 1 });
  });

  it.each(['en-US', 'en-GB'] as const)('retains explicit %s source dialect when reviewing pronunciation', async pronunciationDialect => {
    const f = await fixture(true, 1, pronunciationDialect);
    await imports.stage(f.batch.id, { revision: 1, rows: [row(1)] });
    const occurrence = await db.vocabularySourceEntry.findFirstOrThrow({ where: { documentId: f.document.id } });
    await imports.review(f.batch.id, actor, { revision: 2, sourceEntryId: occurrence.id, decision: 'NEW_ENTRY', entryType: 'WORD', topicGroupIds: [] });
    expect((await db.lexicalPronunciation.findFirstOrThrow({ where: { sourceId: f.source.id } })).dialect).toBe(pronunciationDialect);
  });

  it('reviews a legitimate uncertain occurrence through an explicit correction while preserving raw provenance', async () => {
    const f = await fixture(true, 1);
    await imports.stage(f.batch.id, { revision: 1, rows: [{ ...row(1), parsedWord: 'r?cord', normalizedPos: 'UNKNOWN', warnings: ['Ambiguous native extraction'], extractionConfidence: .5 }] });
    const original = await db.vocabularySourceEntry.findFirstOrThrow({ where: { documentId: f.document.id } });
    const review = { revision: 2, sourceEntryId: original.id, decision: 'NEW_ENTRY' as const, entryType: 'WORD' as const, topicGroupIds: [] };
    await expect(imports.review(f.batch.id, actor, review)).rejects.toMatchObject({ response: { code: 'VOCABULARY_SOURCE_UNRESOLVED' } });
    const correction = { parsedWord: 'record', normalizedPos: 'NOUN' as const, reason: 'Human verified the synthetic row against its native source geometry.', sourceContentHash: original.sourceContentHash };
    const approved = await imports.review(f.batch.id, actor, { ...review, correction });
    expect(await db.vocabularySourceEntry.findUniqueOrThrow({ where: { id: original.id } })).toEqual(original);
    const decision = await db.vocabularyBatchRow.findUniqueOrThrow({ where: { batchId_sourceEntryId: { batchId: f.batch.id, sourceEntryId: original.id } } });
    expect(decision).toMatchObject({ validationState: 'VALIDATED', reviewedBy: actor, reviewCorrection: correction });
    const resolution = await db.vocabularyEntryResolution.findUniqueOrThrow({ where: { sourceEntryId: original.id }, include: { entry: true } });
    expect(resolution.entry).toMatchObject({ canonicalForm: 'record', partOfSpeech: 'NOUN' });
    const version = await imports.publish(f.batch.id, actor, { revision: approved.revision, collectionName: 'Corrected without losing the source occurrence' });
    expect(version.members).toHaveLength(1);
    expect(await db.vocabularyDocument.count({ where: { sourceId: f.source.id } })).toBe(1);
  });
});
