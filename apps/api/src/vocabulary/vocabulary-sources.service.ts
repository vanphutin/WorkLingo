import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { vocabularySourceInputSchema, vocabularyRightsInputSchema, vocabularyDocumentInputSchema, vocabularyQuerySchema, type VocabularySourceInput, type VocabularyRightsInput, type VocabularyDocumentInput } from '@worklingo/contracts';
import { PrismaService } from '../common/database/prisma.service.js';

@Injectable()
export class VocabularySourcesService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  register(raw: VocabularySourceInput) {
    const input = vocabularySourceInputSchema.parse(raw);
    return this.db.vocabularySource.upsert({ where: { providerName_sourceUrl: { providerName: input.providerName, sourceUrl: input.sourceUrl } }, create: input, update: {} });
  }
  async list(page = 1, limit = 25) {
    ({ page, limit } = vocabularyQuerySchema.pick({ page: true, limit: true }).parse({ page, limit }));
    const [items, total] = await this.db.$transaction([this.db.vocabularySource.findMany({ skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], include: { _count: { select: { documents: true } } } }), this.db.vocabularySource.count()]);
    return { items, total, page, limit };
  }
  async rights(id: string, raw: VocabularyRightsInput) {
    const { revision, ...input } = vocabularyRightsInputSchema.parse(raw);
    return this.db.$transaction(async tx => {
      const result = await tx.vocabularySource.updateMany({ where: { id, revision }, data: { ...input, revision: { increment: 1 } } });
      if (!result.count) throw new ConflictException({ code: 'VOCABULARY_STALE', message: 'Refresh the source before changing authorization.' });
      return tx.vocabularySource.findUniqueOrThrow({ where: { id } });
    });
  }
  async document(raw: VocabularyDocumentInput) {
    const input = vocabularyDocumentInputSchema.parse(raw);
    if (!await this.db.vocabularySource.findUnique({ where: { id: input.sourceId } })) throw new NotFoundException('Vocabulary source not found');
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vocabulary-document:${input.sourceId}:${input.sha256}:${input.cefrLevel}`}))`;
      const existing = await tx.vocabularyDocument.findUnique({ where: { sourceId_sha256_cefrLevel: { sourceId: input.sourceId, sha256: input.sha256, cefrLevel: input.cefrLevel } } });
      if (existing) {
        if (existing.pageCount !== input.pageCount || existing.originalFilename !== input.originalFilename || existing.edition !== input.edition || existing.sourceUrl !== (input.sourceUrl ?? null)) throw new ConflictException({ code: 'SOURCE_DOCUMENT_CONFLICT', message: 'The same document hash has different source metadata.' });
        return existing;
      }
      return tx.vocabularyDocument.create({ data: input as Prisma.VocabularyDocumentUncheckedCreateInput });
    });
  }
}
