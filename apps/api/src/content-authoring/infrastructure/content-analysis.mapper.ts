import type { ContentImport } from '@prisma/client';
import type {
  ContentImportDto,
  ContentStatus,
} from '@worklingo/contracts';

export function mapContentImportToDto(record: ContentImport): ContentImportDto {
  return {
    id: record.id,
    lessonId: record.lessonId,
    lessonVersionId: record.lessonVersionId,
    rawSource: record.rawSource,
    sourceHash: record.sourceHash,
    status: record.status as ContentStatus,
    draftRevision: record.draftRevision,
    parserVersion: record.parserVersion,
    validationHash: record.validationHash,
    createdById: record.createdById,
    updatedById: record.updatedById,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
