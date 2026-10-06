import { createHash } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  analyzeLessonSource,
  parseLessonSource,
  type NormalizedLessonDraft,
} from '@worklingo/content-format';
import {
  ContentAuthoringErrorCode,
  type ContentImportDto,
  type ContentIssueDto,
  type ContentPreviewDto,
  type ContentStatus,
  type UpdateContentSourceInput,
  type ValidateContentImportResult,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { mapContentImportToDto } from '../infrastructure/content-analysis.mapper.js';

@Injectable()
export class ContentImportsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async create(actorId: string, rawSource: string): Promise<ContentImportDto> {
    const sourceHash = createHash('sha256').update(rawSource).digest('hex');

    const created = await this.database.contentImport.create({
      data: {
        rawSource,
        sourceHash,
        status: 'DRAFT',
        draftRevision: 1,
        parserVersion: '1.0.0',
        createdById: actorId,
        updatedById: actorId,
      },
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
  ): Promise<ContentImportDto> {
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

    const nextRevision = existing.draftRevision + 1;
    const newHash = createHash('sha256').update(input.rawSource).digest('hex');

    const updateResult = await this.database.contentImport.updateMany({
      where: {
        id,
        draftRevision: input.expectedDraftRevision,
        status: { in: ['DRAFT', 'VALIDATED'] },
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

    const updated = await this.database.contentImport.findUniqueOrThrow({
      where: { id },
    });

    return mapContentImportToDto(updated);
  }

  async validate(
    id: string,
    actorId: string,
    expectedDraftRevision: number,
  ): Promise<ValidateContentImportResult> {
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
    const analysis = analyzeLessonSource(rawSource);
    const parseRes = parseLessonSource(rawSource);

    const newStatus = analysis.canPublish ? 'VALIDATED' : 'DRAFT';
    const newValidationHash = analysis.canPublish ? sourceHash : null;

    const updateResult = await this.database.contentImport.updateMany({
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

    return {
      importId: id,
      draftRevision: expectedDraftRevision,
      sourceHash,
      status: newStatus as ContentStatus,
      canPublish: analysis.canPublish,
      issues: (analysis.issues as unknown) as ContentIssueDto[],
      issuesTruncated: analysis.issuesTruncated,
    };
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
