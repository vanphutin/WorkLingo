import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../common/database/prisma.service.js';
import { JobHandlerRegistry } from '../../jobs/application/job-runner.service.js';
import type { ClaimedJob, JobHandler } from '../../jobs/domain/job-handler.port.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';

const payloadSchema = z.object({ now: z.iso.datetime().optional() }).strict();

@Injectable()
export class RetentionCleanupHandler implements JobHandler, OnModuleInit {
  readonly type = 'RETENTION_CLEANUP';

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
    @Inject(JobHandlerRegistry) private readonly registry: JobHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handle(job: ClaimedJob): Promise<Readonly<Record<string, unknown>>> {
    const payload = payloadSchema.parse(job.payload);
    const now = payload.now ? new Date(payload.now) : new Date();
    const recordings = await this.database.recording.findMany({
      where: {
        deletedAt: null,
        retentionUntil: { lte: now },
        attempt: { evaluationStatus: { in: ['EVALUATED', 'EVALUATION_FAILED'] } },
      },
      select: { id: true, storageKey: true },
      take: 100,
    });
    let deletedRecordings = 0;
    for (const recording of recordings) {
      try {
        await this.storage.delete(recording.storageKey);
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      }
      const updated = await this.database.recording.updateMany({
        where: { id: recording.id, deletedAt: null }, data: { deletedAt: now },
      });
      deletedRecordings += updated.count;
    }
    const drafts = await this.database.activityDraft.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return { deletedDrafts: drafts.count, deletedRecordings };
  }
}
