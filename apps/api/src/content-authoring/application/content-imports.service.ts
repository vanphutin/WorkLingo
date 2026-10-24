import { buildBeginnerDraftSnapshot } from '../../curriculum-foundation/application/foundation-validation.js';
import { assertBeginnerContext,type BeginnerAuthoringContext,denyUnscopedBeginnerMutation } from '../../beginner/domain/beginner-authoring-policy.js';
import { assertBeginnerAuthoringDisabled } from '@worklingo/content-format';
import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  parseLessonSource,
  type NormalizedLessonDraft,
} from '@worklingo/content-format';
import {
  ContentAuthoringErrorCode,
  createContentImportSchema,
  type ContentImportDto,
  type ContentIssueDto,
  type ContentPreviewDto,
  type ContentStatus,
  type UpdateContentSourceInput,
  type ValidateContentImportResult,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { PilotMetricsService } from '../../analytics/application/pilot-metrics.service.js';
import { mapContentImportToDto } from '../infrastructure/content-analysis.mapper.js';
import { isTopicSource } from '../../intermediate-topics/topic-source.js';
import { analyzeReviewedSource as analyzeLessonSource } from './audio-narration.js';
import { lockTopicGroups } from '../../intermediate-topics/topic-group-lock.js';
import { buildVocabularyPublicationReview } from './publication-vocabulary.js';

function assertRuntimeEnabled(source:string):void {
  try { assertBeginnerAuthoringDisabled(source); } catch {
    throw new UnprocessableEntityException({code:'BEGINNER_AUTHORING_DISABLED',message:'Beginner authoring is disabled in R1.1',statusCode:422});
  }
}

@Injectable()
export class ContentImportsService {
  async getVocabularyReview(id: string) {
    const source = await this.database.contentImport.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Content import not found');
    return buildVocabularyPublicationReview(this.database, source);
  }
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Optional() @Inject(PilotMetricsService) private readonly pilotMetrics?: PilotMetricsService,
  ) {}

  async create(actorId: string, rawSource: string, topicGroupId?: string,context?:BeginnerAuthoringContext,transaction?:Prisma.TransactionClient): Promise<ContentImportDto> {
    const database=transaction??this.database;
    const target=context?await assertBeginnerContext(context,actorId,'author',database):null;
    if(context&&!transaction)throw new UnprocessableEntityException('BEGINNER_TRANSACTION_REQUIRED');
    if(context&&(!target?.lessonId||parseLessonSource(rawSource).document.formatVersion!=='WorkLingoLesson/1.2'))throw new UnprocessableEntityException('BEGINNER_TARGET_FORMAT_REQUIRED');
    if(!context)assertRuntimeEnabled(rawSource);
    if (!createContentImportSchema.safeParse({ rawSource, topicGroupId }).success) throw new BadRequestException('Invalid content import request');
    if (topicGroupId === undefined && isTopicSource(rawSource)) {
      throw new BadRequestException({
        code: 'TOPIC_GROUP_REQUIRED',
        message: 'Choose an existing topic group before creating an Intermediate lesson.',
        statusCode: 400,
      });
    }
    if (topicGroupId !== undefined && !isTopicSource(rawSource)) throw new BadRequestException('Import is not an Intermediate topic');
    const sourceHash = createHash('sha256').update(rawSource).digest('hex');

    const data = {
      rawSource,
      ...(target?.lessonId?{lessonId:target.lessonId}:{}),
      sourceHash,
      status: 'DRAFT' as const,
      draftRevision: 1,
      parserVersion: '1.0.0',
      createdById: actorId,
      updatedById: actorId,
      topicGroupId: topicGroupId ?? null,
      topicGroupRevision: topicGroupId ? 1 : 0,
    };
    const created = topicGroupId === undefined
      ? await database.contentImport.create({ data })
      : await this.database.$transaction(async tx => {
        await lockTopicGroups(tx);
        if (!await tx.intermediateTopicGroup.findUnique({ where: { id: topicGroupId } })) throw new NotFoundException('Topic group not found');
        return tx.contentImport.create({ data });
      });

    return mapContentImportToDto(created);
  }

  async list(_actorId: string): Promise<ContentImportDto[]> {
    const records = await this.database.contentImport.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return records.map(mapContentImportToDto);
  }

  async get(id: string, _actorId: string): Promise<ContentImportDto> {
    const record = await this.database.contentImport.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Content import ${id} not found`,
        statusCode: 404,
      });
    }

    return mapContentImportToDto(record);
  }

  async updateSource(
    id: string,
    actorId: string,
    input: UpdateContentSourceInput,
    context?:BeginnerAuthoringContext,transaction?:Prisma.TransactionClient,
  ): Promise<ContentImportDto> {
    const database=transaction??this.database;
    if(context&&!transaction)throw new UnprocessableEntityException('BEGINNER_TRANSACTION_REQUIRED');
    if(!context)assertRuntimeEnabled(input.rawSource);
    const existing = await database.contentImport.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Content import ${id} not found`,
        statusCode: 404,
      });
    }

    if(context){
      await assertBeginnerContext(context,actorId,'author',database,{importId:id,...(existing.lessonId?{lessonId:existing.lessonId}:{})});
      if(parseLessonSource(input.rawSource).document.formatVersion!=='WorkLingoLesson/1.2')throw new UnprocessableEntityException('BEGINNER_TARGET_FORMAT_REQUIRED');
    }else assertRuntimeEnabled(existing.rawSource);
    if(!context&&existing.lessonId) await denyUnscopedBeginnerMutation(database,{lessonId:existing.lessonId});
    if (existing.status === 'PUBLISHED' || existing.status === 'ARCHIVED') {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.VERSION_ALREADY_PUBLISHED,
        message: 'Published content imports are immutable',
        statusCode: 409,
      });
    }

    if (existing.draftRevision !== input.expectedDraftRevision) {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
        message: `Draft revision conflict. Expected ${input.expectedDraftRevision} but current revision is ${existing.draftRevision}`,
        statusCode: 409,
        currentDraftRevision: existing.draftRevision,
      });
    }

    const enteringTopic = isTopicSource(input.rawSource) && !isTopicSource(existing.rawSource);
    if (enteringTopic && !existing.topicGroupId) {
      throw new BadRequestException({ code: 'TOPIC_GROUP_REQUIRED',
        message: 'Choose an existing topic group before converting a draft to an Intermediate lesson.', statusCode: 400 });
    }

    const nextRevision = existing.draftRevision + 1;
    const newHash = createHash('sha256').update(input.rawSource).digest('hex');

    const updateResult = await database.contentImport.updateMany({
      where: {
        id,
        draftRevision: input.expectedDraftRevision,
        status: { in: ['DRAFT', 'VALIDATED'] },
        ...(enteringTopic ? { topicGroupId: existing.topicGroupId, topicGroupRevision: existing.topicGroupRevision } : {}),
      },
      data: {
        rawSource: input.rawSource,
        sourceHash: newHash,
        draftRevision: nextRevision,
        status: 'DRAFT',
        validationHash: null,
        updatedById: actorId,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
        message: 'Draft revision conflict. Concurrent edit detected.',
        statusCode: 409,
      });
    }

    const updated = await database.contentImport.findUniqueOrThrow({
      where: { id },
    });

    return mapContentImportToDto(updated);
  }

  async validate(
    id: string,
    actorId: string,
    expectedDraftRevision: number,
    context?:BeginnerAuthoringContext,transaction?:Prisma.TransactionClient,
  ): Promise<ValidateContentImportResult> {
    const database=transaction??this.database;
    if(context&&!transaction)throw new UnprocessableEntityException('BEGINNER_TRANSACTION_REQUIRED');
    const existing = await database.contentImport.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Content import ${id} not found`,
        statusCode: 404,
      });
    }

    if(context){
      await assertBeginnerContext(context,actorId,'validate',database,{importId:id,...(existing.lessonId?{lessonId:existing.lessonId}:{})});
      if(parseLessonSource(existing.rawSource).document.formatVersion!=='WorkLingoLesson/1.2')throw new UnprocessableEntityException('BEGINNER_TARGET_FORMAT_REQUIRED');
    }else assertRuntimeEnabled(existing.rawSource);
    if(!context&&existing.lessonId) await denyUnscopedBeginnerMutation(database,{lessonId:existing.lessonId});
    if (existing.status === 'PUBLISHED' || existing.status === 'ARCHIVED') {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.VERSION_ALREADY_PUBLISHED,
        message: 'Published content imports are immutable',
        statusCode: 409,
      });
    }

    if (existing.draftRevision !== expectedDraftRevision) {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
        message: `Draft revision conflict. Expected ${expectedDraftRevision} but current revision is ${existing.draftRevision}`,
        statusCode: 409,
        currentDraftRevision: existing.draftRevision,
      });
    }

    const rawSource = existing.rawSource;
    const sourceHash = existing.sourceHash;
    const baseAnalysis=analyzeLessonSource(rawSource);
    const readinessIssues:ContentIssueDto[]=[];
    if(context&&baseAnalysis.normalizedDraft)try{buildBeginnerDraftSnapshot(baseAnalysis.normalizedDraft);}catch{
      readinessIssues.push({code:'BEGINNER_NOT_READY',message:'Beginner requires the exact 45-minute inventory and complete R/L/S/W evidence',severity:'error',range:parseLessonSource(rawSource).document.range});
    }
    const analysis={...baseAnalysis,canPublish:baseAnalysis.canPublish&&readinessIssues.length===0,issues:[...baseAnalysis.issues,...readinessIssues]};
    const parseRes = parseLessonSource(rawSource);

    const newStatus = analysis.canPublish ? 'VALIDATED' : 'DRAFT';
    const newValidationHash = analysis.canPublish ? sourceHash : null;

    const updateResult = await database.contentImport.updateMany({
      where: {
        id,
        draftRevision: expectedDraftRevision,
        sourceHash,
        status: { in: ['DRAFT', 'VALIDATED'] },
      },
      data: {
        status: newStatus,
        validationHash: newValidationHash,
        parsedAst: (parseRes.document as unknown) as Prisma.InputJsonValue,
        normalizedPreview: (analysis.normalizedDraft as unknown) as Prisma.InputJsonValue,
        validationReport: {
          issues: analysis.issues,
          issuesTruncated: analysis.issuesTruncated,
        } as unknown as Prisma.InputJsonValue,
        updatedById: actorId,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
        message: 'Draft revision conflict during validation. The content was updated concurrently.',
        statusCode: 409,
      });
    }

    const result = {
      importId: id,
      draftRevision: expectedDraftRevision,
      sourceHash,
      status: newStatus as ContentStatus,
      canPublish: analysis.canPublish,
      issues: (analysis.issues as unknown) as ContentIssueDto[],
      issuesTruncated: analysis.issuesTruncated,
    };
    if (analysis.canPublish) {
      await this.pilotMetrics?.recordBestEffort({
        dimensions: { outcome: 'passed' },
        eventType: 'CONTENT_IMPORT_VALIDATED',
        sourceKey: `content-import:${id}:validated:${sourceHash}`,
      });
    }
    return result;
  }

  async getPreview(id: string, _actorId: string): Promise<ContentPreviewDto> {
    const existing = await this.database.contentImport.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Content import ${id} not found`,
        statusCode: 404,
      });
    }

    if (
      existing.validationHash === existing.sourceHash &&
      existing.normalizedPreview
    ) {
      const report = existing.validationReport as {
        issues?: ContentIssueDto[];
        issuesTruncated?: boolean;
      } | null;

      return {
        importId: existing.id,
        draftRevision: existing.draftRevision,
        sourceHash: existing.sourceHash,
        status: existing.status as ContentStatus,
        normalizedDraft: (existing.normalizedPreview as unknown) as NormalizedLessonDraft | null,
        issues: report?.issues ?? [],
        canPublish: existing.status === 'VALIDATED',
      };
    }

    const analysis = analyzeLessonSource(existing.rawSource);
    return {
      importId: existing.id,
      draftRevision: existing.draftRevision,
      sourceHash: existing.sourceHash,
      status: existing.status as ContentStatus,
      normalizedDraft: analysis.normalizedDraft,
      issues: (analysis.issues as unknown) as ContentIssueDto[],
      canPublish: analysis.canPublish,
    };
  }
}
