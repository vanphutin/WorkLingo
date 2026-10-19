import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { defaultTopicPlan, type VocabularyPublicationSelection } from '@worklingo/contracts';
import { parseLessonSource } from '@worklingo/content-format';
import { topicSource } from '../../src/intermediate-topics/topic-test.fixture.js';
import { buildVocabularyPublicationReview } from '../../src/content-authoring/application/publication-vocabulary.js';
import { ContentPublisherService } from '../../src/content-authoring/application/content-publisher.service.js';
import type { PrismaService } from '../../src/common/database/prisma.service.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { MasteryService } from '../../src/mastery/application/mastery.service.js';

describe('Explicit vocabulary meanings and topic usage', () => {
  const schema = `vocabulary_publication_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL!;
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let db: PrismaClient; let actorId: string;
  beforeAll(async () => {
    const url = new URL(baseUrl); url.searchParams.set('schema', schema);
    const migration = spawnSync(process.execPath, [createRequire(path.resolve('package.json')).resolve('prisma/build/index.js'), 'migrate', 'deploy'],
      { env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8', timeout: 45000 });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
    db = new PrismaClient({ datasourceUrl: url.toString() });
    actorId = (await db.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Vocabulary admin', passwordHash: 'test-only', role: 'CONTENT_ADMIN' } })).id;
  }, 60000);
  afterAll(async () => { await db?.$disconnect(); await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.$disconnect(); });

  async function draft(name: string, transform: (source: string) => string = source => source) {
    const suffix = randomUUID();
    const group = await db.intermediateTopicGroup.create({ data: { name, nameEn: name, normalizedName: suffix } });
    const rawSource = transform(topicSource.replace('slug: handling-customer-complaints', `slug: vocabulary-${suffix}`)
      .replace('[WORD_BANK customer-service]', `[WORD_BANK bank-${suffix}]`));
    const hash = createHash('sha256').update(rawSource).digest('hex');
    const record = await db.contentImport.create({ data: { rawSource, sourceHash: hash, validationHash: hash, status: 'VALIDATED', createdById: actorId, updatedById: actorId, topicGroupId: group.id, topicGroupRevision: 1 } });
    await db.intermediateTopicReview.create({ data: { contentImportId: record.id, sourceHash: hash, draftRevision: 1, approvedPlan: defaultTopicPlan(90), approvedById: actorId, approvedAt: new Date() } });
    const script = parseLessonSource(rawSource).document.audioScripts[0]!;
    const audio = await db.audioArtifact.create({ data: { contentImportId: record.id, audioScriptSlug: script.slug, scriptHash: createHash('sha256').update(script.script).digest('hex'), adapterName: 'fake-tts', voiceConfig: {}, mimeType: 'audio/wav', byteSize: 1, checksum: 'test', storageKey: 'test', status: 'READY' } });
    const input = { expectedDraftRevision: 1, expectedSourceHash: hash, idempotencyKey: randomUUID(), selectedAudioArtifacts: { [script.slug]: audio.id } };
    return { record, group, input, review: () => buildVocabularyPublicationReview(db, record), publish: (selection?: VocabularyPublicationSelection) => new ContentPublisherService(db as PrismaService).publish(record.id, actorId, { ...input, ...(selection ? { vocabularyReview: selection } : {}) }) };
  }
  function fresh(review: Awaited<ReturnType<typeof buildVocabularyPublicationReview>>): VocabularyPublicationSelection {
    return { reviewHash: review.reviewHash, choices: review.entries.map(entry => ({ sourceSlug: entry.sourceSlug, action: 'new' as const })) };
  }
  it('requires explicit review before topic publication', async () => {
    const d = await draft('No automatic merging');
    await expect(d.publish()).rejects.toMatchObject({ status: 422, response: { code: 'VOCABULARY_REVIEW_REQUIRED' } });
    expect((await db.contentImport.findUniqueOrThrow({ where: { id: d.record.id } })).status).toBe('VALIDATED');
  });
  it('reuses one meaning across two topics while keeping both lesson contexts, or explicitly creates a new meaning', async () => {
    const first = await draft('Restaurant'); const firstReview = await first.review();
    const published = await first.publish(fresh(firstReview));
    const firstSnapshot = lessonSnapshotSchema.parse((await db.lessonVersion.findUniqueOrThrow({ where: { id: published.lessonVersionId } })).parsedContent);
    const canonical = firstSnapshot.wordBanks[0]!.languageBlocks[0]!;
    const second = await draft('Customer support'); const secondReview = await second.review();
    const entry = secondReview.entries.find(row => row.expression === canonical.canonicalForm)!;
    expect(entry.candidates.find(candidate => candidate.id === canonical.id)?.contexts[0]?.topicName).toBe('Restaurant');
    const reuse: VocabularyPublicationSelection = { reviewHash: secondReview.reviewHash, choices: secondReview.entries.map(row => ({ sourceSlug: row.sourceSlug, action: 'reuse', languageBlockId: row.candidates[0]!.id })) };
    const result = await second.publish(reuse);
    const snapshot = lessonSnapshotSchema.parse((await db.lessonVersion.findUniqueOrThrow({ where: { id: result.lessonVersionId } })).parsedContent);
    expect(snapshot.wordBanks[0]!.languageBlocks[0]!.id).toBe(canonical.id);
    const uses = await db.lessonVocabularyUsage.findMany({ where: { languageBlockId: canonical.id } });
    expect(uses.map(use => use.topicGroupId).sort()).toEqual([first.group.id, second.group.id].sort());
    const program = await db.learningProgram.create({ data: { slug: `intermediate-${randomUUID()}`, name: 'Intermediate', description: 'Test', learningGoal: 'Test', proficiencyLabel: 'B1', iconKey: 'book', availabilityStatus: 'AVAILABLE', displayOrder: 999 } });
    const path = await db.learningPath.create({ data: { programId: program.id, slug: randomUUID(), name: 'Path' } });
    const level = await db.level.create({ data: { pathId: path.id, code: randomUUID(), name: 'Level', cefrReference: 'B1', order: 0 } });
    await db.mission.create({ data: { levelId: level.id, slug: randomUUID(), title: 'Shared vocabulary', objective: 'Test', order: 0, lessons: { create: { lessonId: result.lessonId, order: 0 } } } });
    await db.masteryRecord.create({ data: { learnerId: actorId, languageBlockId: canonical.id, skill: 'reading', score: .5, confidence: .2, lastEvidenceAt: new Date(), nextReviewAt: new Date('2020-01-01'), lastLessonVersionId: result.lessonVersionId } });
    expect(await db.languageBlock.count({ where: { id: canonical.id, wordBank: { lessonVersions: { some: { lessonVersion: { lesson: { missions: { some: { mission: { level: { path: { programId: program.id } } } } } } } } } } } })).toBe(0);
    const mastery = new MasteryService(db as PrismaService);
    expect((await mastery.getMasteryRecords(actorId, undefined, { programId: program.id })).map(record => record.languageBlockId)).toContain(canonical.id);
    expect((await mastery.getMemoryHealth(actorId, { programId: program.id })).overall.evaluatedBlocksCount).toBe(1);
    expect((await mastery.getReviewQueue(actorId, { programId: program.id })).map(record => record.languageBlockId)).toContain(canonical.id);
    expect(await second.publish(reuse)).toEqual(result);
    const third = await draft('Different meaning'); const thirdReview = await third.review();
    const separate = await third.publish(fresh(thirdReview));
    const newSnapshot = lessonSnapshotSchema.parse((await db.lessonVersion.findUniqueOrThrow({ where: { id: separate.lessonVersionId } })).parsedContent);
    expect(newSnapshot.wordBanks[0]!.languageBlocks[0]!.id).not.toBe(canonical.id);
    expect(snapshot.activities.map(activity => activity.payload)).toEqual(firstSnapshot.activities.map(activity => activity.payload));
    expect(snapshot.activities.every(activity => activity.languageBlockReferences.every(ref => snapshot.wordBanks.flatMap(bank => bank.languageBlocks).some(block => block.slug === ref)))).toBe(true);
  });
  it('rejects missing, forged or stale decisions and a changed topic', async () => {
    const d = await draft('Stale review'); const review = await d.review(); const selection = fresh(review);
    await expect(d.publish({ ...selection, choices: [] })).rejects.toMatchObject({ status: 422 });
    await expect(d.publish({ ...selection, choices: selection.choices.map(choice => ({ sourceSlug: choice.sourceSlug, action: 'reuse', languageBlockId: randomUUID() })) })).rejects.toMatchObject({ status: 422 });
    await db.contentImport.update({ where: { id: d.record.id }, data: { topicGroupRevision: 2 } });
    await expect(d.publish(selection)).rejects.toMatchObject({ status: 409, response: { code: 'VOCABULARY_REVIEW_STALE' } });
  });
  it('supports two source entries explicitly reusing the same meaning without duplicate version keys', async () => {
    const d = await draft('Two contexts in one lesson', source => source.replace('expression: resolve the issue', 'expression: apologize'));
    const review = await d.review(); const meaning = review.entries[0]!.candidates[0]!.id;
    const result = await d.publish({ reviewHash: review.reviewHash, choices: review.entries.map(entry => ({ sourceSlug: entry.sourceSlug, action: 'reuse', languageBlockId: meaning })) });
    const snapshot = lessonSnapshotSchema.parse((await db.lessonVersion.findUniqueOrThrow({ where: { id: result.lessonVersionId } })).parsedContent);
    expect(snapshot.wordBanks[0]!.languageBlocks).toHaveLength(1);
    expect(await db.lessonVocabularyUsage.count({ where: { lessonVersionId: result.lessonVersionId, languageBlockId: meaning } })).toBe(2);
  });
  it('finds expressions despite case and whitespace differences and invalidates a changed catalog', async () => {
    const d = await draft('Catalog changed'); const review = await d.review();
    const bank = await db.wordBank.create({ data: { slug: `dictionary-${randomUUID()}`, name: 'Existing meanings' } });
    const term = review.entries[0]!;
    const expression = `  ${term.expression.toUpperCase().replaceAll(' ', '   ')}  `;
    const block = await db.languageBlock.create({ data: { wordBankId: bank.id, slug: `existing-${randomUUID()}`, canonicalForm: expression, meaning: 'Existing sense', pronunciation: '', collocations: [], grammarPattern: '', examples: ['Example'], commonErrors: [], cefrLevel: 'B1', transferContexts: ['Work'] } });
    await expect(d.publish(fresh(review))).rejects.toMatchObject({ status: 409, response: { code: 'VOCABULARY_REVIEW_STALE' } });
    expect((await d.review()).entries[0]!.candidates.some(candidate => candidate.id === block.id)).toBe(true);
  });
  it('requires confirmation after the topic label is renamed', async () => {
    const d = await draft('Before rename'); const review = await d.review();
    await db.intermediateTopicGroup.update({ where: { id: d.group.id }, data: { name: 'After rename', revision: { increment: 1 } } });
    await expect(d.publish(fresh(review))).rejects.toMatchObject({ status: 409, response: { code: 'VOCABULARY_REVIEW_STALE' } });
  });
});
