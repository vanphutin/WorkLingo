import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../common/database/prisma.service.js';
import { JobHandlerRegistry } from '../../jobs/application/job-runner.service.js';
import { RetryableJobError } from '../../jobs/domain/job-handler.port.js';
import type { ClaimedJob, JobHandler } from '../../jobs/domain/job-handler.port.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { MockAttemptClock } from './mock-attempt-clock.js';

@Injectable()
export class MockRecordingRetentionHandler implements JobHandler, OnModuleInit {
  readonly type = 'IELTS_MOCK_RECORDING_RETENTION';
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(ObjectStorage) private readonly storage: ObjectStorage, @Inject(JobHandlerRegistry) private readonly registry: JobHandlerRegistry, @Inject(MockAttemptClock) private readonly clock: MockAttemptClock) {}
  onModuleInit() { this.registry.register(this); }
  async handle(job: ClaimedJob): Promise<Readonly<Record<string, unknown>>> {
    const { recordingId } = z.object({ recordingId: z.uuid() }).strict().parse(job.payload);
    const recording = await this.db.ieltsMockRecording.findFirst({ where: { id: recordingId, deletedAt: null, retainUntil: { lte: this.clock.now() } } });
    if (!recording) return { deletedRecordings: 0 };
    try { await this.storage.delete(recording.storageKey); } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw new RetryableJobError('Recording cleanup is temporarily unavailable.'); }
    await this.db.ieltsMockRecording.updateMany({ where: { id: recording.id, deletedAt: null }, data: { deletedAt: this.clock.now() } });
    return { deletedRecordings: 1 };
  }
}
