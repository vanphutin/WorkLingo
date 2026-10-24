import {assertBeginnerCurriculumReview} from '../../beginner/domain/beginner-publication-policy.js';
import {hashBeginnerRecord} from '../../beginner/domain/beginner-environment-preflight.js';
import {assertBeginnerContext,beginnerContextDescriptor,lockBeginnerContext,denyUnscopedBeginnerMutation,type BeginnerAuthoringContext} from '../../beginner/domain/beginner-authoring-policy.js';
import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CurriculumRevision, Prisma } from '@prisma/client';
import { curriculumDefinitionInputSchema, foundationCommandSchema, saveFoundationDraftSchema,
  type CurriculumDraftDto, type CurriculumRevisionDto, type FoundationCommand, type SaveFoundationDraftInput } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { invalid, validateFoundationDefinition } from './foundation-validation.js';

function revisionDto(row: CurriculumRevision): CurriculumRevisionDto {
  const definition = curriculumDefinitionInputSchema.parse(row.snapshot);
  return { ...definition, id: row.id, missionId: row.missionId, revision: row.revision, status: row.status === 'ARCHIVED' ? 'ARCHIVED' : 'PUBLISHED' };
}
const json = (value: unknown) => value as Prisma.InputJsonValue;

@Injectable()
export class FoundationCurriculumService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async getDraft(missionId: string, tx: Prisma.TransactionClient = this.database): Promise<CurriculumDraftDto> {
    if (!await tx.mission.findUnique({ where: { id: missionId }, select: { id: true } })) throw new NotFoundException('Mission not found');
    const [draft, revisions] = await Promise.all([
      tx.curriculumDefinition.findUnique({ where: { missionId } }),
      tx.curriculumRevision.findMany({ where: { missionId }, orderBy: { revision: 'desc' } }),
    ]);
    return { missionId, revision: draft?.revision ?? null, status: draft?.status ?? null,
      definition: draft ? curriculumDefinitionInputSchema.parse(draft.content) : null, publishedRevisions: revisions.map(revisionDto) };
  }

  async saveDraft(missionId: string, actorId: string, raw: SaveFoundationDraftInput,context?:BeginnerAuthoringContext): Promise<CurriculumDraftDto> {
    const parsed = saveFoundationDraftSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('Invalid foundation draft input');
    const input = parsed.data;
    return this.mutate(missionId, actorId, 'save', input, async (tx) => {
      const draft = await tx.curriculumDefinition.findUnique({ where: { missionId } });
      if ((draft?.revision ?? null) !== input.expectedRevision) this.stale();
      if (draft) await tx.curriculumDefinition.update({ where: { id: draft.id }, data: { content: json(input.definition), status: 'DRAFT', revision: { increment: 1 } } });
      else await tx.curriculumDefinition.create({ data: { missionId, content: json(input.definition) } });
      return this.getDraft(missionId, tx);
    },context);
  }

  async validateDraft(missionId: string, actorId: string, raw: FoundationCommand,context?:BeginnerAuthoringContext): Promise<CurriculumDraftDto> {
    const input = this.command(raw);
    return this.mutate(missionId, actorId, 'validate', input, async (tx, programId) => {
      const draft = await this.draftAt(tx, missionId, input.expectedRevision);
      if (draft.status !== 'DRAFT' && draft.status !== 'VALIDATED') throw new ConflictException('Edit the draft before validating a new publication');
      await validateFoundationDefinition(tx, missionId, programId, curriculumDefinitionInputSchema.parse(draft.content));
      await tx.curriculumDefinition.update({ where: { id: draft.id }, data: { status: 'VALIDATED' } });
      return this.getDraft(missionId, tx);
    },context);
  }

  async publishDraft(missionId: string, actorId: string, raw: FoundationCommand,context?:BeginnerAuthoringContext): Promise<CurriculumRevisionDto> {
    const input = this.command(raw);
    return this.mutate(missionId, actorId, 'publish', input, async (tx, programId) => {
      const draft = await this.draftAt(tx, missionId, input.expectedRevision);
      if (draft.status !== 'VALIDATED') throw new ConflictException({ code: 'CURRICULUM_VALIDATION_REQUIRED', message: 'Validate the current draft before publishing' });
      if(context){
        const review=await tx.auditLog.findFirst({where:{resourceId:missionId,action:'beginner.curriculum.review'},orderBy:{createdAt:'desc'}});
        const edit=await tx.auditLog.findFirst({where:{resourceId:missionId,action:'curriculum.foundation.save'},orderBy:{createdAt:'desc'}});
        if(!review||!edit)throw new ConflictException('BEGINNER_CURRICULUM_REVIEW_REQUIRED');
        const descriptor=beginnerContextDescriptor(context);
        assertBeginnerCurriculumReview(review.metadata,{environmentId:descriptor.environmentId,target:descriptor.target,revision:draft.revision,definitionHash:hashBeginnerRecord(draft.content),editorId:edit.actorId},review.actorId);
      }
      const definition = curriculumDefinitionInputSchema.parse(draft.content);
      const versions = await validateFoundationDefinition(tx, missionId, programId, definition);
      const revision = await tx.curriculumRevision.create({ data: {
        missionId, revision: draft.revision, snapshot: json(definition),
        lessons: { create: versions.map((lessonVersionId, index) => ({ lessonVersionId, order: index + 1 })) },
        prerequisites: { create: definition.prerequisiteRevisionIds.map((prerequisiteRevisionId) => ({ prerequisiteRevisionId })) },
      } });
      await tx.curriculumDefinition.update({ where: { id: draft.id }, data: { status: 'PUBLISHED' } });
      return revisionDto(revision);
    },context);
  }

  async archiveRevision(id: string, actorId: string, raw: FoundationCommand,context?:BeginnerAuthoringContext): Promise<CurriculumRevisionDto> {
    const input = this.command(raw);
    const target = await this.database.curriculumRevision.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Curriculum revision not found');
    return this.mutate(target.missionId, actorId, `archive:${id}`, input, async (tx) => {
      const revision = await tx.curriculumRevision.findUniqueOrThrow({ where: { id } });
      if (revision.revision !== input.expectedRevision || revision.status !== 'PUBLISHED') this.stale();
      if (await tx.curriculumPrerequisite.count({ where: { prerequisiteRevisionId: id, curriculumRevision: { status: 'PUBLISHED' } } })) {
        invalid([{ code: 'CURRICULUM_ARCHIVE_BLOCKED', path: 'id', message: 'A published curriculum depends on this revision' }]);
      }
      return revisionDto(await tx.curriculumRevision.update({ where: { id }, data: { status: 'ARCHIVED', archivedAt: new Date() } }));
    },context);
  }

  private command(raw: FoundationCommand): FoundationCommand {
    const parsed = foundationCommandSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('Invalid foundation command');
    return parsed.data;
  }
  private stale(): never { throw new ConflictException({ code: 'CURRICULUM_REVISION_CONFLICT', message: 'Curriculum changed; refresh and retry' }); }
  private async draftAt(tx: Prisma.TransactionClient, missionId: string, expectedRevision: number) {
    const draft = await tx.curriculumDefinition.findUnique({ where: { missionId } });
    if (!draft || draft.revision !== expectedRevision) this.stale();
    return draft;
  }

  private async mutate<T>(missionId: string, actorId: string, action: string,
    input: { idempotencyKey: string }, execute: (tx: Prisma.TransactionClient, programId: string) => Promise<T>,context?:BeginnerAuthoringContext): Promise<T> {
    const operation = context?`beginner:foundation:${action}`:`foundation:${action}`;
    const requestHash = createHash('sha256').update(JSON.stringify({ missionId, input,...(context?{scope:beginnerContextDescriptor(context)}:{}) })).digest('hex');
    return this.database.$transaction(async (tx) => {
      const scopeAction=action==='publish'?'publish':action==='validate'?'validate':'author';
      if(context)await assertBeginnerContext(context,actorId,scopeAction,tx,{missionId});
      else await denyUnscopedBeginnerMutation(tx,{missionId});
      const receiptLock = `${actorId}:${operation}:${input.idempotencyKey}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${receiptLock},0))`;
      const receipt = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } } });
      if (receipt) {
        if (receipt.requestHash !== requestHash) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key reused with a different command' });
        return receipt.responseBody as T;
      }
      if(context)await lockBeginnerContext(tx,context,actorId,scopeAction);
      const mission = await tx.mission.findUnique({ where: { id: missionId }, include: { level: { include: { path: true } } } });
      if (!mission) throw new NotFoundException('Mission not found');
      const programId = mission.level.path.programId;
      await tx.$queryRaw`SELECT "id" FROM "LearningProgram" WHERE "id"=${programId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "LearningPath" WHERE "id"=${mission.level.pathId}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "Level" WHERE "id"=${mission.levelId}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "Mission" WHERE "id"=${missionId}::uuid FOR UPDATE`;
      const current = await tx.mission.findUniqueOrThrow({ where: { id: missionId }, include: { level: { include: { path: true } } } });
      if (current.status === 'ARCHIVED' || current.level.status === 'ARCHIVED' || current.level.path.status === 'ARCHIVED') {
        throw new ConflictException('Archived curriculum cannot be edited or published');
      }
      const response = await execute(tx, programId);
      await tx.auditLog.create({ data: { actorId, action: `curriculum.foundation.${action.split(':')[0]}`, resourceType: 'CurriculumDefinition', resourceId: missionId,
        metadata: { missionId, programId },
      } });
      await tx.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 200, responseBody: json(response) } });
      return response;
    }, { timeout: 15_000 });
  }
}
