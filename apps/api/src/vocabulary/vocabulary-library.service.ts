import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type VocabularySource } from '@prisma/client';
import { vocabularyCefrSchema, vocabularyQuerySchema, vocabularyCollectionInputSchema, vocabularyCollectionMembersSchema, vocabularyProgramInputSchema, vocabularyBindingInputSchema, vocabularyLegacyInputSchema, type VocabularyQuery, type VocabularyProgramInput } from '@worklingo/contracts';
import type { z } from 'zod';
import { PrismaService } from '../common/database/prisma.service.js';
import { checkSourceRights, normalizeLexicalForm, vocabularyError } from './domain/import-policy.js';

const pagination = vocabularyQuerySchema.pick({ page: true, limit: true });
const sourceWhere = (fields: string[]): Prisma.VocabularySourceWhereInput => ({ rightsStatus: 'APPROVED', permissionReference: { not: null }, allowedUses: { hasEvery: ['EXTRACT', 'STORE'] }, allowedFields: { hasEvery: fields } });
const occurrenceWhere: Prisma.VocabularySourceEntryWhereInput = { AND: [
  { document: { source: sourceWhere(['FORM']) } },
  { OR: [{ permittedDefinition: null }, { document: { source: sourceWhere(['DEFINITION']) } }] },
  { OR: [{ pronunciation: null }, { document: { source: sourceWhere(['PRONUNCIATION']) } }] },
] };
const senseWhere: Prisma.LexicalSenseWhereInput = { AND: [
  { source: sourceWhere(['FORM']) }, { OR: [{ definition: null }, { source: sourceWhere(['DEFINITION']) }] },
  { OR: [{ translation: null }, { source: { ...sourceWhere(['FORM']), allowedUses: { hasEvery: ['EXTRACT', 'STORE', 'TRANSLATE'] } } }] },
  { resolutions: { every: { sourceEntry: occurrenceWhere } } },
] };
const entryWhere: Prisma.LexicalEntryWhereInput = {
  senses: { some: senseWhere, every: senseWhere }, resolutions: { every: { sourceEntry: occurrenceWhere } },
  pronunciations: { every: { source: sourceWhere(['FORM', 'PRONUNCIATION']) } },
};
const entryInclude = {
  senses: true, pronunciations: true, topics: { include: { topic: true } },
} satisfies Prisma.LexicalEntryInclude;
const versionInclude = { members: { orderBy: { position: 'asc' }, include: { sense: true, entry: true, assignments: true } }, bindings: true } satisfies Prisma.VocabularyCollectionVersionInclude;
const versionSummaryInclude = { _count: { select: { members: true, bindings: true } } } satisfies Prisma.VocabularyCollectionVersionInclude;
const readableMember: Prisma.VocabularyCollectionMemberWhereInput = { sense: { AND: [senseWhere, { editorialStatus: 'REVIEWED', rightsBasis: { not: '' } }] }, entry: { AND: [entryWhere, { editorialStatus: 'REVIEWED' }] } };

/** A database predicate checks the whole snapshot without hydrating its members. */
async function requireReadableVersions(tx: Prisma.TransactionClient, ids: string[]) {
  if (!ids.length) return;
  if (await tx.vocabularyCollectionMember.findFirst({ where: { collectionVersionId: { in: ids }, NOT: readableMember }, select: { id: true } })) vocabularyError('BLOCKED_BY_RIGHTS', 'One or more snapshot fields lack current authorization.');
}

async function requireReadableVersion(tx: Prisma.TransactionClient, id: string) {
  if (!await tx.vocabularyCollectionVersion.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Vocabulary collection version not found');
  await requireReadableVersions(tx, [id]);
}

async function withCefrSummaries<T extends { id: string }>(tx: Prisma.TransactionClient, entries: T[]) {
  const groups = entries.length ? await tx.lexicalCefrAssociation.groupBy({
    by: ['lexicalEntryId', 'cefrLevel'],
    where: { lexicalEntryId: { in: entries.map(entry => entry.id) }, cefrLevel: { in: vocabularyCefrSchema.options } },
    orderBy: [{ lexicalEntryId: 'asc' }, { cefrLevel: 'asc' }],
  }) : [];
  const byEntry = new Map<string, { cefrLevel: string }[]>();
  for (const group of groups) {
    const levels = byEntry.get(group.lexicalEntryId) ?? [];
    levels.push({ cefrLevel: group.cefrLevel });
    byEntry.set(group.lexicalEntryId, levels);
  }
  return entries.map(entry => ({ ...entry, cefrAssociations: byEntry.get(entry.id) ?? [] }));
}

/** Recheck every contributing source, keeping rights locked through commit. */
export async function requireVocabularySenses(tx: Prisma.TransactionClient, ids: string[]) {
  const uniqueIds = [...new Set(ids)].sort();
  if (!uniqueIds.length) return [];
  // Arrays use one bind parameter even for a complete imported snapshot. Acquire
  // senses, then entries, then sources in ID order, with no per-ID round trips.
  await tx.$queryRaw`SELECT id FROM "LexicalSense" WHERE id = ANY(${uniqueIds}::uuid[]) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT e.id FROM "LexicalEntry" e WHERE e.id IN (SELECT "lexicalEntryId" FROM "LexicalSense" WHERE id = ANY(${uniqueIds}::uuid[])) ORDER BY e.id FOR SHARE`;
  const sources = await tx.$queryRaw<VocabularySource[]>`
    WITH entries AS (SELECT "lexicalEntryId" AS id FROM "LexicalSense" WHERE id = ANY(${uniqueIds}::uuid[])),
    contributors AS (
      SELECT s."sourceId" AS id FROM "LexicalSense" s WHERE s."lexicalEntryId" IN (SELECT id FROM entries)
      UNION SELECT p."sourceId" FROM "LexicalPronunciation" p WHERE p."lexicalEntryId" IN (SELECT id FROM entries)
      UNION SELECT d."sourceId" FROM "VocabularyEntryResolution" r
        JOIN "VocabularySourceEntry" o ON o.id = r."sourceEntryId"
        JOIN "VocabularyDocument" d ON d.id = o."documentId"
        WHERE r."lexicalEntryId" IN (SELECT id FROM entries)
    ) SELECT s.* FROM "VocabularySource" s WHERE s.id IN (SELECT id FROM contributors) ORDER BY s.id FOR SHARE`;
  const senses: Prisma.LexicalSenseGetPayload<{ include: { entry: true } }>[] = [];
  // Bound ORM bind parameters without dropping any part of a large import.
  // Locks above cover the entire set before validation starts, across chunks.
  for (let offset = 0; offset < uniqueIds.length; offset += 1000) {
    const chunk = uniqueIds.slice(offset, offset + 1000);
    const batch = await tx.lexicalSense.findMany({ where: { id: { in: chunk } }, include: { entry: true } });
    if (batch.length !== chunk.length) throw new NotFoundException('Vocabulary sense not found');
    senses.push(...batch);
    // Check definitions, translations, pronunciations and raw occurrences in
    // SQL; do not copy the provenance inventory into application memory.
    if (await tx.lexicalSense.findFirst({ where: { id: { in: chunk }, NOT: { AND: [senseWhere, { entry: entryWhere }] } }, select: { id: true } })) vocabularyError('BLOCKED_BY_RIGHTS', 'One or more source fields lack current authorization.');
  }
  for (const source of sources) checkSourceRights(source, ['FORM']);
  for (const sense of senses) {
    if (sense.editorialStatus !== 'REVIEWED' || sense.entry.editorialStatus !== 'REVIEWED') vocabularyError('VOCABULARY_SENSE_UNREVIEWED', 'Only reviewed lexical senses can be used.');
    if (!sense.sourceId || !sense.rightsBasis.trim()) vocabularyError('BLOCKED_BY_RIGHTS', 'The sense lacks a current source authorization.');
  }
  return senses;
}

@Injectable()
export class VocabularyLibraryService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async search(raw: VocabularyQuery) {
    const query = vocabularyQuerySchema.parse(raw); const { page, limit } = query;
    const where: Prisma.LexicalEntryWhereInput = { AND: [entryWhere, {
      ...(query.search ? { normalizedForm: { contains: normalizeLexicalForm(query.search) } } : {}),
      ...(query.pos ? { partOfSpeech: query.pos } : {}), ...(query.reviewStatus ? { editorialStatus: query.reviewStatus } : {}),
      ...(query.cefr ? { cefrAssociations: { some: { cefrLevel: query.cefr } } } : {}),
      ...(query.topicId ? { topics: { some: { topicGroupId: query.topicId } } } : {}),
      ...(query.sourceId ? { resolutions: { some: { sourceEntry: { document: { sourceId: query.sourceId } } } } } : {}),
      ...(query.programId ? { members: { some: { version: { status: 'PUBLISHED' }, assignments: { some: { programId: query.programId } } } } } : {}),
    }] };
    return this.db.$transaction(async tx => {
      const total = await tx.lexicalEntry.count({ where });
      const items = await tx.lexicalEntry.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ normalizedForm: 'asc' }, { id: 'asc' }], include: entryInclude });
      return { items: await withCefrSummaries(tx, items), total, page, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async detail(id: string) {
    return this.db.$transaction(async tx => {
      const entry = await tx.lexicalEntry.findUnique({ where: { id }, include: entryInclude });
      if (!entry) throw new NotFoundException('Vocabulary entry not found');
      if (!await tx.lexicalEntry.count({ where: { id, AND: [entryWhere] } })) vocabularyError('BLOCKED_BY_RIGHTS', 'One or more source fields lack current authorization.');
      return (await withCefrSummaries(tx, [entry]))[0]!;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async provenance(id: string, page = 1, limit = 25) {
    ({ page, limit } = pagination.parse({ page, limit }));
    return this.db.$transaction(async tx => {
      if (!await tx.lexicalEntry.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Vocabulary entry not found');
      if (!await tx.lexicalEntry.count({ where: { id, AND: [entryWhere] } })) vocabularyError('BLOCKED_BY_RIGHTS', 'One or more source fields lack current authorization.');
      const where = { lexicalEntryId: id };
      const items = await tx.vocabularyEntryResolution.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { sourceEntryId: 'asc' }, include: { sourceEntry: { include: { document: { include: { source: true } } } } } });
      return { items, total: await tx.vocabularyEntryResolution.count({ where }), page, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async collections(page = 1, limit = 25) {
    ({ page, limit } = pagination.parse({ page, limit }));
    const [items, total] = await this.db.$transaction([this.db.vocabularyCollection.findMany({ skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], include: { _count: { select: { versions: true } } } }), this.db.vocabularyCollection.count()]);
    return { items, total, page, limit };
  }
  createCollection(raw: z.infer<typeof vocabularyCollectionInputSchema>) {
    return this.db.vocabularyCollection.create({ data: vocabularyCollectionInputSchema.parse(raw) });
  }
  async createVersion(collectionId: string, raw: z.infer<typeof vocabularyCollectionMembersSchema>) {
    const { senseIds } = vocabularyCollectionMembersSchema.parse(raw);
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "VocabularyCollection" WHERE id=${collectionId}::uuid FOR UPDATE`;
      if (!await tx.vocabularyCollection.findUnique({ where: { id: collectionId } })) throw new NotFoundException('Vocabulary collection not found');
      const senses = await requireVocabularySenses(tx, senseIds);
      const latest = await tx.vocabularyCollectionVersion.aggregate({ where: { collectionId }, _max: { version: true } });
      return tx.vocabularyCollectionVersion.create({ data: { collectionId, version: (latest._max.version ?? 0) + 1, members: { create: senseIds.map((senseId, position) => ({ senseId, lexicalEntryId: senses.find(sense => sense.id === senseId)!.lexicalEntryId, position })) } }, include: versionInclude });
    }, { timeout: 20000 });
  }
  async versions(collectionId: string, page = 1, limit = 25) {
    ({ page, limit } = pagination.parse({ page, limit }));
    return this.db.$transaction(async tx => {
      if (!await tx.vocabularyCollection.findUnique({ where: { id: collectionId } })) throw new NotFoundException('Vocabulary collection not found');
      const items = await tx.vocabularyCollectionVersion.findMany({ where: { collectionId }, skip: (page - 1) * limit, take: limit, orderBy: { version: 'desc' }, include: versionSummaryInclude });
      await requireReadableVersions(tx, items.map(item => item.id));
      return { items, total: await tx.vocabularyCollectionVersion.count({ where: { collectionId } }), page, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 });
  }
  async members(id: string, page = 1, limit = 25) {
    ({ page, limit } = pagination.parse({ page, limit }));
    return this.db.$transaction(async tx => {
      await requireReadableVersion(tx, id);
      const where = { collectionVersionId: id };
      const items = await tx.vocabularyCollectionMember.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ position: 'asc' }, { id: 'asc' }], include: { sense: true, entry: { select: { canonicalForm: true } } } });
      return { items, total: await tx.vocabularyCollectionMember.count({ where }), page, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async assignments(id: string, page = 1, limit = 25) {
    ({ page, limit } = pagination.parse({ page, limit }));
    return this.db.$transaction(async tx => {
      await requireReadableVersion(tx, id);
      const where = { member: { collectionVersionId: id } };
      const items = await tx.vocabularyProgramAssignment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ member: { position: 'asc' } }, { id: 'asc' }] });
      return { items, total: await tx.vocabularyProgramAssignment.count({ where }), page, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async bindings(id: string, page = 1, limit = 25) {
    ({ page, limit } = pagination.parse({ page, limit }));
    return this.db.$transaction(async tx => {
      await requireReadableVersion(tx, id);
      const where = { collectionVersionId: id };
      const items = await tx.vocabularyCurriculumBinding.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'asc' } });
      return { items, total: await tx.vocabularyCurriculumBinding.count({ where }), page, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async publishVersion(id: string) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "VocabularyCollectionVersion" WHERE id=${id}::uuid FOR UPDATE`;
      const version = await tx.vocabularyCollectionVersion.findUnique({ where: { id }, include: versionSummaryInclude });
      if (!version) throw new NotFoundException('Vocabulary collection version not found');
      if (version.status === 'ARCHIVED') vocabularyError('VOCABULARY_VERSION_ARCHIVED', 'An archived snapshot cannot be republished.');
      if (!version._count.members) vocabularyError('VOCABULARY_INCOMPLETE', 'A published snapshot needs reviewed members.');
      const members = await tx.vocabularyCollectionMember.findMany({ where: { collectionVersionId: id }, select: { senseId: true } });
      await requireVocabularySenses(tx, members.map(member => member.senseId));
      if (version.status === 'PUBLISHED') return version;
      if (version.batchId) vocabularyError('VOCABULARY_INCOMPLETE', 'Batch snapshots must publish through the reconciled import workflow.');
      return tx.vocabularyCollectionVersion.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() }, include: versionSummaryInclude });
    }, { timeout: 20000 });
  }
  async assign(actorId: string, raw: VocabularyProgramInput) {
    const input = vocabularyProgramInputSchema.parse(raw);
    return this.db.$transaction(async tx => {
      const member = await tx.vocabularyCollectionMember.findUnique({ where: { id: input.memberId }, include: { version: true } });
      if (!member) throw new NotFoundException('Collection member not found');
      if (member.version.status === 'ARCHIVED') vocabularyError('VOCABULARY_VERSION_ARCHIVED', 'Archived membership cannot be assigned.');
      await requireVocabularySenses(tx, [member.senseId]);
      if (!await tx.learningProgram.findUnique({ where: { id: input.programId } })) throw new NotFoundException('Learning program not found');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vocabulary-assignment:${input.memberId}:${input.programId}`}))`;
      const previous = await tx.vocabularyProgramAssignment.findUnique({ where: { memberId_programId: { memberId: input.memberId, programId: input.programId } } });
      if (previous) {
        if (previous.targetLevel !== (input.targetLevel ?? null) || previous.priority !== input.priority || previous.learningGoal !== input.learningGoal || previous.inclusionReason !== input.inclusionReason || JSON.stringify(previous.skills) !== JSON.stringify(input.skills)) throw new ConflictException('Program assignment is already curated; create a new collection version');
        return previous;
      }
      return tx.vocabularyProgramAssignment.create({ data: { ...input, targetLevel: input.targetLevel ?? null, approvedBy: actorId, curationStatus: 'REVIEWED' } });
    });
  }
  async bind(id: string, raw: z.infer<typeof vocabularyBindingInputSchema>) {
    const input = vocabularyBindingInputSchema.parse(raw);
    const target = { programId: input.programId ?? null, pathId: input.pathId ?? null, levelId: input.levelId ?? null, missionId: input.missionId ?? null, lessonVersionId: input.lessonVersionId ?? null, wordBankVersionId: input.wordBankVersionId ?? null };
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "VocabularyCollectionVersion" WHERE id=${id}::uuid FOR SHARE`;
      const version = await tx.vocabularyCollectionVersion.findUnique({ where: { id }, include: { members: true } });
      if (!version) throw new NotFoundException('Vocabulary collection version not found');
      if (version.status !== 'PUBLISHED') vocabularyError('VOCABULARY_VERSION_NOT_PUBLISHED', 'Bind only a published vocabulary version.');
      await requireVocabularySenses(tx, version.members.map(member => member.senseId));
      const exists = input.programId ? await tx.learningProgram.count({ where: { id: input.programId } }) : input.pathId ? await tx.learningPath.count({ where: { id: input.pathId } }) : input.levelId ? await tx.level.count({ where: { id: input.levelId } }) : input.missionId ? await tx.mission.count({ where: { id: input.missionId } }) : input.lessonVersionId ? await tx.lessonVersion.count({ where: { id: input.lessonVersionId, status: 'PUBLISHED' } }) : await tx.wordBankVersion.count({ where: { id: input.wordBankVersionId! } });
      if (!exists) throw new NotFoundException('Curriculum target not found or version not published');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vocabulary-binding:${id}:${JSON.stringify(input)}`}))`;
      return await tx.vocabularyCurriculumBinding.findFirst({ where: { collectionVersionId: id, ...target } }) ?? tx.vocabularyCurriculumBinding.create({ data: { collectionVersionId: id, ...target } });
    });
  }
  async legacyLink(actorId: string, raw: z.infer<typeof vocabularyLegacyInputSchema>) {
    const input = vocabularyLegacyInputSchema.parse(raw);
    return this.db.$transaction(async tx => {
      const [sense] = await requireVocabularySenses(tx, [input.senseId]);
      await tx.$queryRaw`SELECT id FROM "LanguageBlock" WHERE id=${input.languageBlockId}::uuid FOR SHARE`;
      const block = await tx.languageBlock.findUnique({ where: { id: input.languageBlockId } });
      if (!block) throw new NotFoundException('Legacy language block not found');
      if (normalizeLexicalForm(block.canonicalForm) !== sense!.entry.normalizedForm) vocabularyError('VOCABULARY_MATCH_INVALID', 'Review a legacy block with the same expression.');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vocabulary-legacy:${input.languageBlockId}`}))`;
      const existing = await tx.vocabularyLegacyLink.findUnique({ where: { languageBlockId: input.languageBlockId } });
      if (existing && existing.senseId !== input.senseId) throw new ConflictException('Legacy identity already has a reviewed correspondence');
      return existing ?? tx.vocabularyLegacyLink.create({ data: { ...input, reviewedBy: actorId } });
    });
  }
  async options(raw: { page?: number | undefined; limit?: number | undefined; search?: string | undefined } = {}) {
    const { page, limit, search } = vocabularyQuerySchema.pick({ page: true, limit: true, search: true }).parse(raw);
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};
    const [programs, topics] = await this.db.$transaction([
      this.db.learningProgram.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], select: { id: true, name: true } }),
      this.db.intermediateTopicGroup.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true } }),
    ]);
    return { programs, topics, page, limit };
  }
}
