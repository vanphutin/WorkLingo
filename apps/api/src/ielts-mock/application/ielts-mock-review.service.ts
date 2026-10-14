import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ieltsMockContentSchema, ieltsMockReportSchema, reviewIeltsMockAttemptSchema, type IeltsMockReportDto } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { scoreProductiveSkills, toOverallMockBand } from '../domain/ielts-mock-scoring.js';

@Injectable()
export class IeltsMockReviewService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  listPending() {
    return this.database.ieltsMockAttempt.findMany({ where: { status: 'EVALUATION_PENDING' }, select: { id: true, learnerId: true, revision: true, responses: true, submittedAt: true, mockTestVersion: { select: { version: true } } }, orderBy: { submittedAt: 'asc' }, take: 100 });
  }

  async review(reviewerId: string, attemptId: string, input: unknown): Promise<IeltsMockReportDto> {
    const parsed = reviewIeltsMockAttemptSchema.parse(input); const operation = `review-ielts-mock:${attemptId}`; const requestHash = this.hash(parsed);
    return this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-mock-review:' + attemptId}))`;
      const replay = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId: reviewerId, operation, idempotencyKey: parsed.idempotencyKey } } });
      if (replay) { if (replay.requestHash !== requestHash) throw new ConflictException('Idempotency key reused.'); return ieltsMockReportSchema.parse(replay.responseBody); }
      const attempt = await tx.ieltsMockAttempt.findUnique({ where: { id: attemptId }, include: { mockTestVersion: true } });
      if (!attempt) throw new NotFoundException('IELTS mock attempt was not found.');
      if (attempt.status !== 'EVALUATION_PENDING' || attempt.revision !== parsed.expectedRevision) throw new ConflictException({ code: 'IELTS_MOCK_REVIEW_REVISION_STALE' });
      const objective = attempt.objectiveScore as { listening?: { rawScore: number; mockBand: number }; reading?: { rawScore: number; mockBand: number } } | null;
      if (!objective?.listening || !objective.reading) throw new ConflictException({ code: 'IELTS_MOCK_OBJECTIVE_SCORE_MISSING' });
      const productive = scoreProductiveSkills(parsed); const completedAt = new Date();
      const report = ieltsMockReportSchema.parse({ attemptId, status: 'COMPLETED', scoringPolicyVersion: 1, disclosure: ieltsMockContentSchema.parse(attempt.mockTestVersion.content).disclosure,
        skills: { listening: { status: 'SCORED', ...objective.listening }, reading: { status: 'SCORED', ...objective.reading }, writing: { status: 'TEACHER_REVIEWED', rawScore: null, mockBand: productive.writing }, speaking: { status: 'TEACHER_REVIEWED', rawScore: null, mockBand: productive.speaking } },
        overallMockBand: toOverallMockBand([objective.listening.mockBand, objective.reading.mockBand, productive.writing, productive.speaking]), strengths: parsed.strengths, gaps: parsed.gaps, nextActions: parsed.nextActions, completedAt: completedAt.toISOString() });
      const updated = await tx.ieltsMockAttempt.updateMany({ where: { id: attemptId, revision: parsed.expectedRevision, status: 'EVALUATION_PENDING' }, data: { status: 'COMPLETED', productiveEvaluation: parsed as unknown as Prisma.InputJsonValue, reportSnapshot: report as Prisma.InputJsonValue, completedAt, revision: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException({ code: 'IELTS_MOCK_REVIEW_REVISION_STALE' });
      await tx.ieltsMockReview.create({ data: { attemptId, reviewerId, attemptRevision: parsed.expectedRevision, evaluation: parsed as unknown as Prisma.InputJsonValue } });
      await tx.auditLog.create({ data: { actorId: reviewerId, action: 'REVIEW_IELTS_MOCK_ATTEMPT', resourceType: 'IeltsMockAttempt', resourceId: attemptId, metadata: { overallMockBand: report.overallMockBand } } });
      await tx.mutationReceipt.create({ data: { actorId: reviewerId, operation, idempotencyKey: parsed.idempotencyKey, requestHash, responseStatus: 200, responseBody: report as Prisma.InputJsonValue } });
      return report;
    });
  }
  private hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
}
