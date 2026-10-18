import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ieltsMockAttemptSchema, mockClockOperationSchema, type IeltsMockAttemptDto } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import type { Clock } from '../../mastery/domain/clock.port.js';
import { resolveMockModePolicy } from '../domain/mock-mode-policy.js';
import { expireMockSections, lockMockAttempt, mockAttemptInclude, mockElapsedMilliseconds, toMockAttemptDto } from './mock-attempt-state.js';

@Injectable()
export class MockAttemptClock {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Optional() @Inject('CLOCK') private readonly clock?: Clock) {}
  now(): Date { return this.clock?.now() ?? new Date(); }
  pause(learnerId: string, attemptId: string, input: unknown): Promise<IeltsMockAttemptDto> { return this.change(learnerId, attemptId, input, true); }
  resume(learnerId: string, attemptId: string, input: unknown): Promise<IeltsMockAttemptDto> { return this.change(learnerId, attemptId, input, false); }
  async expireIfDue(learnerId: string, attemptId: string): Promise<IeltsMockAttemptDto> {
    return this.db.$transaction(async tx => { const attempt = await lockMockAttempt(tx, learnerId, attemptId); const now = this.now(); return toMockAttemptDto(await expireMockSections(tx, attempt, now), now); });
  }
  private async change(learnerId: string, attemptId: string, input: unknown, pause: boolean): Promise<IeltsMockAttemptDto> {
    const parsed = mockClockOperationSchema.parse(input);
    const operation = `ielts-mock-${pause ? 'pause' : 'resume'}:${attemptId}`;
    const requestHash = createHash('sha256').update(JSON.stringify(parsed)).digest('hex');
    return this.db.$transaction(async tx => {
      const attempt = await lockMockAttempt(tx, learnerId, attemptId);
      const receipt = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId: learnerId, operation, idempotencyKey: parsed.clientOperationId } } });
      if (receipt) { if (receipt.requestHash !== requestHash) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT' }); return ieltsMockAttemptSchema.parse(receipt.responseBody); }
      if (!resolveMockModePolicy(attempt.mode as IeltsMockAttemptDto['mode'], attempt.policyVersion as IeltsMockAttemptDto['policyVersion']).canPause) throw new ConflictException({ code: 'IELTS_MOCK_PAUSE_NOT_ALLOWED' });
      if (attempt.status !== 'IN_PROGRESS' || attempt.revision !== parsed.expectedRevision || (pause ? !!attempt.pausedAt : !attempt.pausedAt)) throw new ConflictException({ code: 'IELTS_MOCK_REVISION_STALE' });
      const now = this.now();
      const updated = await tx.ieltsMockAttempt.update({ where: { id: attempt.id }, data: { elapsedMs: mockElapsedMilliseconds(attempt, now), clockUpdatedAt: now, pausedAt: pause ? now : null, revision: { increment: 1 } }, include: mockAttemptInclude });
      const result = toMockAttemptDto(updated, now);
      await tx.mutationReceipt.create({ data: { actorId: learnerId, operation, idempotencyKey: parsed.clientOperationId, requestHash, responseStatus: 200, responseBody: result as unknown as Prisma.InputJsonValue } });
      return result;
    });
  }
}
