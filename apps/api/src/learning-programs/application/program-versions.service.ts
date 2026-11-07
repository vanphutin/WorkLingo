import { programDto } from './admin-programs.service.js';
import { captureProgramSnapshot, validateProgramSnapshot } from './program-release-snapshot.js';
import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma, ProgramVersionStatus, ProgramVersion } from '@prisma/client';
import { programAuthoringOptionsSchema, programVersionInputSchema, curriculumDefinitionInputSchema, programVersionListSchema, programVersionResponseSchema, programPageSchema, programVersionCommandSchema, programVersionTransitionSchema, archiveProgramCommandSchema, rollbackProgramCommandSchema, duplicateProgramCommandSchema } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { lockProgram, parseProgramInput, programAudit, programCommand, requireProgramActor, jsonValue } from './program-command.js';

const lifecycle: Record<string, string[]> = { DRAFT: ['IN_REVIEW'], IN_REVIEW: ['DRAFT', 'APPROVED'], APPROVED: ['IN_REVIEW', 'PUBLISHED'], PUBLISHED: ['RETIRED'], RETIRED: [] };
export function programVersionDto(row: ProgramVersion) {
  const metadata = { id: row.id, programId: row.programId, version: row.version, revision: row.revision, status: row.status, source: row.source, capturedAt: row.capturedAt.toISOString(), createdAt: row.createdAt.toISOString(), publishedAt: row.publishedAt?.toISOString() ?? null, retiredAt: row.retiredAt?.toISOString() ?? null };
  return programVersionResponseSchema.parse(row.source === 'AUTHORED' ? { ...(row.snapshot as object), ...metadata } : { ...metadata, snapshot: row.snapshot, policy: row.policy, curriculumRevisionIds: row.curriculumRevisionIds });
}
@Injectable()
export class ProgramVersionsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}
  async authoringOptions(actorId: string, programId: string, raw: unknown = {}) {
    const page = parseProgramInput(programPageSchema, raw);
    return this.database.$transaction(async tx => {
      await requireProgramActor(tx, actorId, true, false);
      await lockProgram(tx, programId);
      const where = { status: 'PUBLISHED' as const, mission: { status: 'PUBLISHED' as const, purpose: 'LEARNING' as const, level: { status: 'PUBLISHED' as const, path: { programId, status: 'PUBLISHED' as const } } }, lessons: { some: {}, every: { lessonVersion: { status: 'PUBLISHED' as const } } } };
      const [rows, total] = await Promise.all([tx.curriculumRevision.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }], skip: (page.page - 1) * page.limit, take: page.limit, select: { id: true } }), tx.curriculumRevision.count({ where })]);
      const items = rows.length ? (await captureProgramSnapshot(tx, programId, rows.map(row => row.id), false)).curriculumBindings : [];
      return programAuthoringOptionsSchema.parse({ items, total, page: page.page, limit: page.limit, vocabularyLibrary: { searchPath: '/api/v1/admin/vocabulary/entries', detailPath: '/api/v1/admin/vocabulary/entries/:id', provenancePath: '/api/v1/admin/vocabulary/entries/:id/provenance' } });
    }, { timeout: 15_000 });
  }
  async listVersions(actorId: string, programId: string, raw: unknown = {}) {
    const page = parseProgramInput(programPageSchema, raw);
    return this.database.$transaction(async tx => {
      await requireProgramActor(tx, actorId);
      await lockProgram(tx, programId);
      const where = { programId };
      const [items, total] = await Promise.all([tx.programVersion.findMany({ where, orderBy: { version: 'desc' }, skip: (page.page - 1) * page.limit, take: page.limit }), tx.programVersion.count({ where })]);
      return programVersionListSchema.parse({ items: items.map(programVersionDto), total, page: page.page, limit: page.limit });
    });
  }
  async createDraft(actorId: string, programId: string, raw: unknown) {
    const input = parseProgramInput(programVersionCommandSchema, raw);
    return programCommand(this.database, actorId, 'versions.create', input.idempotencyKey, { programId, input }, async tx => {
      const program = await lockProgram(tx, programId, input.expectedRevision);
      const content = await validateProgramSnapshot(tx, programId, input.content);
      const latest = await tx.programVersion.aggregate({ where: { programId }, _max: { version: true } });
      const row = await tx.programVersion.create({ data: { programId, version: (latest._max.version ?? 0) + 1, snapshot: jsonValue(content), policy: jsonValue(content.policy), curriculumRevisionIds: content.curriculumBindings.map(binding => binding.curriculumRevisionId), curricula: { create: content.curriculumBindings.map(binding => ({ curriculumRevisionId: binding.curriculumRevisionId, order: binding.order })) } } });
      await programAudit(tx, actorId, 'program.versions.created', 'ProgramVersion', row.id, { programId, revision: row.revision, expectedProgramRevision: program.revision });
      return programVersionDto(row);
    });
  }
  async saveDraft(actorId: string, programId: string, versionId: string, raw: unknown) {
    const input = parseProgramInput(programVersionCommandSchema, raw);
    return programCommand(this.database, actorId, 'versions.update', input.idempotencyKey, { programId, versionId, input }, async tx => {
      await lockProgram(tx, programId);
      await tx.$queryRaw`SELECT "id" FROM "ProgramVersion" WHERE "id"=${versionId}::uuid FOR UPDATE`;
      const current = await tx.programVersion.findUnique({ where: { id: versionId } });
      if (!current || current.programId !== programId) throw new NotFoundException('Program version not found');
      if (current.status !== 'DRAFT') throw new ConflictException('PROGRAM_VERSION_IMMUTABLE');
      if (current.revision !== input.expectedRevision) throw new ConflictException('PROGRAM_VERSION_REVISION_STALE');
      const content = await validateProgramSnapshot(tx, programId, input.content);
      const row = await tx.programVersion.update({ where: { id: versionId }, data: { snapshot: jsonValue(content), policy: jsonValue(content.policy), curriculumRevisionIds: content.curriculumBindings.map(binding => binding.curriculumRevisionId), revision: { increment: 1 }, curricula: { deleteMany: {}, create: content.curriculumBindings.map(binding => ({ curriculumRevisionId: binding.curriculumRevisionId, order: binding.order })) } } });
      await programAudit(tx, actorId, 'program.versions.updated', 'ProgramVersion', row.id, { previousRevision: current.revision, revision: row.revision });
      return programVersionDto(row);
    });
  }
  async transition(actorId: string, programId: string, versionId: string, raw: unknown) {
    const input = parseProgramInput(programVersionTransitionSchema, raw);
    return programCommand(this.database, actorId, `versions.transition.${input.targetStatus.toLowerCase()}`, input.idempotencyKey, { programId, versionId, input }, async tx => {
      const program = await lockProgram(tx, programId);
      await tx.$queryRaw`SELECT "id" FROM "ProgramVersion" WHERE "id"=${versionId}::uuid FOR UPDATE`;
      const current = await tx.programVersion.findUnique({ where: { id: versionId } });
      if (!current || current.programId !== programId) throw new NotFoundException('Program version not found');
      if (current.revision !== input.expectedRevision) throw new ConflictException('PROGRAM_VERSION_REVISION_STALE');
      if (!lifecycle[current.status]?.includes(input.targetStatus)) throw new ConflictException('PROGRAM_VERSION_INVALID_TRANSITION');
      const publishedContent = input.targetStatus === 'PUBLISHED' ? await validateProgramSnapshot(tx, programId, current.snapshot) : null;
      const row = await tx.programVersion.update({ where: { id: versionId }, data: { status: input.targetStatus as ProgramVersionStatus, ...(input.targetStatus === 'RETIRED' ? { retiredAt: new Date() } : { revision: { increment: 1 } }), ...(input.targetStatus === 'PUBLISHED' ? { publishedAt: new Date(), snapshot: jsonValue(publishedContent!) } : {}) } });
      if (input.targetStatus === 'PUBLISHED') {
        const selected = await tx.programVersion.findFirstOrThrow({ where: { programId, status: 'PUBLISHED', source: 'AUTHORED' }, orderBy: { version: 'desc' } });
        await tx.learningProgram.update({ where: { id: programId }, data: { availabilityStatus: program.slug === 'beginner' ? 'BETA' : 'AVAILABLE', curriculumRevisionIds: selected.curriculumRevisionIds, revision: { increment: 1 } } });
      }
      await programAudit(tx, actorId, `program.versions.${input.targetStatus.toLowerCase()}`, 'ProgramVersion', row.id, { previousStatus: current.status, status: row.status, previousRevision: current.revision });
      return programVersionDto(row);
    });
  }
  async preview(actorId: string, programId: string, versionId: string) {
    return this.database.$transaction(async tx => {
      await requireProgramActor(tx, actorId);
      const row = await tx.programVersion.findUnique({ where: { id: versionId } });
      if (!row || row.programId !== programId) throw new NotFoundException('Program version not found');
      return programVersionDto(row);
    });
  }
  async archive(actorId: string, programId: string, raw: unknown) {
    const input = parseProgramInput(archiveProgramCommandSchema, raw);
    return programCommand(this.database, actorId, 'archive', input.idempotencyKey, { programId, input }, async tx => {
      const program = await lockProgram(tx, programId, input.expectedRevision);
      const row = await tx.learningProgram.update({ where: { id: program.id }, data: { availabilityStatus: 'DISABLED', revision: { increment: 1 } } });
      await programAudit(tx, actorId, 'program.archived', 'LearningProgram', row.id, { previousRevision: program.revision });
      return programDto(row);
    });
  }
  async rollback(actorId: string, programId: string, raw: unknown) {
    const input = parseProgramInput(rollbackProgramCommandSchema, raw);
    return programCommand(this.database, actorId, 'rollback', input.idempotencyKey, { programId, input }, async tx => {
      const program = await lockProgram(tx, programId, input.expectedRevision);
      const source = await tx.programVersion.findUnique({ where: { id: input.sourceVersionId } });
      if (!source || source.programId !== programId || source.source === 'LEGACY_PIN_BACKFILL' || !['PUBLISHED', 'RETIRED'].includes(source.status)) throw new UnprocessableEntityException('PROGRAM_VERSION_INVALID_SOURCE');
      const latest = await tx.programVersion.aggregate({ where: { programId }, _max: { version: true } });
      const row = await tx.programVersion.create({ data: { programId, version: (latest._max.version ?? 0) + 1, snapshot: jsonValue(programVersionInputSchema.parse({ ...(source.snapshot as object), catalogMetadata: { iconKey: program.iconKey, displayOrder: program.displayOrder } })), policy: source.policy as Prisma.InputJsonValue, curriculumRevisionIds: source.curriculumRevisionIds, curricula: { create: source.curriculumRevisionIds.map((id, index) => ({ curriculumRevisionId: id, order: index + 1 })) } } });
      await programAudit(tx, actorId, 'program.rollback.created', 'ProgramVersion', row.id, { sourceVersionId: source.id, sourceStatus: source.status, programRevision: program.revision });
      return programVersionDto(row);
    });
  }
  async duplicate(actorId: string, sourceProgramId: string, raw: unknown) {
    const input = parseProgramInput(duplicateProgramCommandSchema, raw);
    return programCommand(this.database, actorId, 'duplicate', input.idempotencyKey, { sourceProgramId, input }, async tx => {
      const source = await lockProgram(tx, sourceProgramId, input.expectedRevision);
      const sourceVersion = await tx.programVersion.findFirst({ where: { programId: sourceProgramId, source: 'AUTHORED' }, orderBy: { version: 'desc' } });
      if (!sourceVersion) throw new UnprocessableEntityException('PROGRAM_VERSION_INVALID_SOURCE');
      const snapshot = programVersionInputSchema.parse(sourceVersion.snapshot);
      // Duplication creates new authoring identities. Lessons remain exact immutable versions.
      const paths = new Map<string, string>(), levels = new Map<string, string>(), missions = new Map<string, string>();
      const revisionIds = new Map(snapshot.curriculumBindings.map(binding => [binding.curriculumRevisionId, randomUUID()]));
      const created = await tx.learningProgram.create({ data: { slug: input.slug, name: input.name, description: source.description, learningGoal: source.learningGoal, proficiencyLabel: source.proficiencyLabel, iconKey: source.iconKey, displayOrder: input.displayOrder, availabilityStatus: 'IN_DEVELOPMENT', progressionPolicy: source.progressionPolicy } });
      for (const binding of snapshot.curriculumBindings) {
        const revision = await tx.curriculumRevision.findUniqueOrThrow({ where: { id: binding.curriculumRevisionId }, include: { mission: { include: { level: { include: { path: true } } }, }, lessons: { orderBy: { order: 'asc' }, include: { lessonVersion: true } } } });
        if (revision.mission.level.path.programId !== sourceProgramId) throw new UnprocessableEntityException('PROGRAM_CURRICULUM_INVALID');
        const originalMission = revision.mission, originalLevel = originalMission.level, originalPath = originalLevel.path;
        if (!paths.has(originalPath.id)) paths.set(originalPath.id, (await tx.learningPath.create({ data: { programId: created.id, name: originalPath.name, slug: `copy-${randomUUID()}`, status: originalPath.status } })).id);
        if (!levels.has(originalLevel.id)) levels.set(originalLevel.id, (await tx.level.create({ data: { pathId: paths.get(originalPath.id)!, name: originalLevel.name, code: `COPY_${randomUUID()}`, cefrReference: originalLevel.cefrReference, order: originalLevel.order, status: originalLevel.status } })).id);
        const mission = await tx.mission.create({ data: { levelId: levels.get(originalLevel.id)!, slug: `copy-${randomUUID()}`, title: originalMission.title, objective: originalMission.objective, order: originalMission.order, purpose: originalMission.purpose, status: originalMission.status } });
        missions.set(originalMission.id, mission.id);
        const definition = curriculumDefinitionInputSchema.parse(revision.snapshot);
        definition.prerequisiteRevisionIds = definition.prerequisiteRevisionIds.map(id => revisionIds.get(id)!);
        await tx.missionLesson.createMany({ data: revision.lessons.map((lesson, index) => ({ missionId: mission.id, lessonId: lesson.lessonVersion.lessonId, order: index + 1 })) });
        await tx.curriculumDefinition.create({ data: { missionId: mission.id, content: jsonValue(definition), status: 'DRAFT' } });
        await tx.curriculumRevision.create({ data: { id: revisionIds.get(revision.id)!, missionId: mission.id, revision: 1, snapshot: jsonValue(definition), status: revision.status, lessons: { create: revision.lessons.map((lesson, index) => ({ lessonVersionId: lesson.lessonVersionId, order: index + 1 })) }, prerequisites: { create: definition.prerequisiteRevisionIds.map(id => ({ prerequisiteRevisionId: id })) } } });
        binding.pathId = paths.get(originalPath.id)!; binding.levelId = levels.get(originalLevel.id)!; binding.missionId = mission.id; binding.curriculumRevisionId = revisionIds.get(revision.id)!; binding.prerequisiteRevisionIds = definition.prerequisiteRevisionIds;
      }
      snapshot.title = input.name;
      snapshot.catalogMetadata = programVersionInputSchema.parse({ ...snapshot, catalogMetadata: { iconKey: created.iconKey, displayOrder: created.displayOrder } }).catalogMetadata!;
      const draft = await tx.programVersion.create({ data: { programId: created.id, version: 1, snapshot: jsonValue(snapshot), policy: jsonValue(snapshot.policy), curriculumRevisionIds: snapshot.curriculumBindings.map(binding => binding.curriculumRevisionId), curricula: { create: snapshot.curriculumBindings.map(binding => ({ curriculumRevisionId: binding.curriculumRevisionId, order: binding.order })) } } });
      await programAudit(tx, actorId, 'program.duplicated', 'LearningProgram', created.id, { sourceProgramId, sourceVersionId: sourceVersion.id, sourceRevision: source.revision, targetVersionId: draft.id, hierarchy: { paths: Object.fromEntries(paths), levels: Object.fromEntries(levels), missions: Object.fromEntries(missions), curriculumRevisions: Object.fromEntries(revisionIds) } });
      return programDto(created);
    });
  }
}
