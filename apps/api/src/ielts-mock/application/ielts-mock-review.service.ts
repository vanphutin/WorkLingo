import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, Optional, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ieltsMockContentSchema, ieltsMockReportSchema, reviewIeltsMockAttemptSchema, type IeltsMockReportDto } from '@worklingo/contracts';

import { MockAttemptClock } from './mock-attempt-clock.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { scoreProductiveSkills, toOverallMockBand } from '../domain/ielts-mock-scoring.js';

@Injectable()
export class IeltsMockReviewService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService, @Optional() @Inject(MockAttemptClock) private readonly clock?: MockAttemptClock) {}

  async listPending(cursor?: string) {
    const after = cursor ? this.decodeCursor(cursor) : null;
    const rows = await this.database.ieltsMockAttempt.findMany({ where: { status: 'EVALUATION_PENDING', submittedAt: { not: null }, ...(after ? { OR: [{ submittedAt: { gt: after.at } }, { submittedAt: after.at, id: { gt: after.id } }] } : {}) }, select: { id: true, learnerId: true, revision: true, responses: true, policyVersion: true, mockRecordings: { where: { deletedAt: null, retainUntil: { gt: this.clock?.now() ?? new Date() } }, select: { id: true, part: true, durationSeconds: true, createdAt: true }, orderBy: { createdAt: 'desc' } }, submittedAt: true, mockTestVersion: { select: { version: true } } }, orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }], take: 51 });
    const items = rows.slice(0, 50).map(({ mockRecordings, ...row }) => ({ ...row, recordings: mockRecordings ?? [] })); const last = items.at(-1);
    return { items, nextCursor: rows.length > 50 && last?.submittedAt ? this.encodeCursor(last.submittedAt, last.id) : null };
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
      if (attempt.policyVersion === 'v2') {
        const recordings = await tx.ieltsMockRecording.findMany({ where: { attemptId, deletedAt: null, retainUntil: { gt: this.clock?.now() ?? new Date() } }, select: { part: true } });
        if (![1, 2, 3].every(part => recordings.some(recording => recording.part === part))) throw new ConflictException({ code: 'IELTS_MOCK_SPEAKING_AUDIO_REQUIRED' });
      }
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
  private encodeCursor(at: Date, id: string) { return Buffer.from(JSON.stringify({ at: at.toISOString(), id })).toString('base64url'); }
  private decodeCursor(cursor: string) { try { const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { at?: unknown; id?: unknown }; const at = typeof value.at === 'string' ? new Date(value.at) : null; if (!at || Number.isNaN(at.getTime()) || typeof value.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value.id)) throw new Error('invalid'); return { at, id: value.id }; } catch { throw new BadRequestException('Invalid IELTS mock review cursor.'); } }
}
