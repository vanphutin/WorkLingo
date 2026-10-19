import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ContentImport, type IntermediateTopicReview } from '@prisma/client';
import { approveTopicSchema, topicProposalSchema, topicReviewRequestSchema, topicReviewSchema, type ApproveTopic, type TopicReviewRequest } from '@worklingo/contracts';
import { PrismaService } from '../common/database/prisma.service.js';
import { TopicProposalService } from './topic-proposal.service.js';
import { isTopicSource, requireTopicSource } from './topic-source.js';

@Injectable()
export class TopicReviewService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService,
    @Inject(TopicProposalService) private readonly proposals: TopicProposalService) {}

  async get(importId: string) {
    return this.database.$transaction(async tx => {
      const source = await this.source(tx, importId);
      const review = await tx.intermediateTopicReview.findUnique({ where: { contentImportId: importId } });
      return this.response(source, review);
    }, { isolationLevel: 'RepeatableRead' });
  }

  async propose(importId: string, actorId: string, input: TopicReviewRequest) {
    const parsed = topicReviewRequestSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid review request');
    const source = await this.database.$transaction(async tx => {
      const draft = await this.source(tx, importId);
      this.check(draft, await tx.intermediateTopicReview.findUnique({ where: { contentImportId: importId } }), parsed.data);
      requireTopicSource(draft.rawSource);
      return draft;
    });
    // Never hold a database lock while calling an external provider.
    const proposal = topicProposalSchema.parse(await this.proposals.propose(source.rawSource, actorId));
    return this.write(importId, parsed.data, (draft, review) => ({
      proposal: proposal as unknown as Prisma.InputJsonValue,
      ...(review?.sourceHash === draft.sourceHash && review.draftRevision === draft.draftRevision ? {} :
        { approvedPlan: Prisma.DbNull, approvedById: null, approvedAt: null }),
    }));
  }

  async approve(importId: string, actorId: string, input: ApproveTopic) {
    const parsed = approveTopicSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid topic approval');
    return this.write(importId, parsed.data, draft => {
      requireTopicSource(draft.rawSource);
      return { approvedPlan: parsed.data.plan as unknown as Prisma.InputJsonValue, approvedById: actorId, approvedAt: new Date() };
    });
  }

  private async write(importId: string, input: TopicReviewRequest,
    fields: (source: ContentImport, review: IntermediateTopicReview | null) => Prisma.IntermediateTopicReviewUncheckedUpdateInput) {
    return this.database.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "ContentImport" WHERE "id" = ${importId}::uuid FOR UPDATE`;
      const source = await this.source(tx, importId);
      const review = await tx.intermediateTopicReview.findUnique({ where: { contentImportId: importId } });
      this.check(source, review, input);
      const update = { ...fields(source, review), sourceHash: source.sourceHash, draftRevision: source.draftRevision, revision: (review?.revision ?? 0) + 1 };
      const result = await tx.intermediateTopicReview.upsert({ where: { contentImportId: importId },
        create: { contentImportId: importId, ...update } as Prisma.IntermediateTopicReviewUncheckedCreateInput, update });
      return this.response(source, result);
    });
  }

  private async source(tx: Prisma.TransactionClient, id: string) {
    const source = await tx.contentImport.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Topic import not found');
    if (!isTopicSource(source.rawSource)) throw new BadRequestException('Import is not an Intermediate topic');
    return source;
  }

  private check(source: ContentImport, review: IntermediateTopicReview | null, input: TopicReviewRequest) {
    if (!['DRAFT', 'VALIDATED'].includes(source.status) || source.sourceHash !== input.expectedSourceHash ||
        source.draftRevision !== input.expectedDraftRevision || (review?.revision ?? 0) !== input.expectedReviewRevision) {
      throw new ConflictException({ code: 'TOPIC_REVIEW_CONFLICT', message: 'Topic source or review changed. Refresh before retrying.' });
    }
  }

  private response(source: ContentImport, review: IntermediateTopicReview | null) {
    const stale = review && (review.sourceHash !== source.sourceHash || review.draftRevision !== source.draftRevision);
    const approved = !stale && review?.approvedPlan && review.approvedById && review.approvedAt;
    return topicReviewSchema.parse({ importId: source.id, revision: review?.revision ?? 0,
      status: stale ? 'stale' : approved ? 'approved' : review?.proposal ? 'proposed' : 'none',
      proposal: review?.proposal ?? null,
      approval: approved ? { plan: review.approvedPlan, approvedById: review.approvedById, approvedAt: review.approvedAt!.toISOString() } : null });
  }
}
