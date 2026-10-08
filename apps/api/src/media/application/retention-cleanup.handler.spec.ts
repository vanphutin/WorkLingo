import type { PrismaService } from '../../common/database/prisma.service.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import type { JobHandlerRegistry } from '../../jobs/application/job-runner.service.js';
import { describe, expect, it, vi } from 'vitest';

import { RetentionCleanupHandler } from './retention-cleanup.handler.js';

describe('RetentionCleanupHandler', () => {
  it('deletes only due terminal recordings and expired drafts idempotently', async () => {
    const due = { id: 'due-recording', storageKey: 'recordings/due' };
    const database = {
      recording: {
        findMany: vi.fn().mockResolvedValue([due]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      activityDraft: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    } as unknown as PrismaService;
    const missing = Object.assign(new Error('missing'), { code: 'ENOENT' });
    const storage = { delete: vi.fn().mockRejectedValue(missing) } as unknown as ObjectStorage;
    const registry = { register: vi.fn() } as unknown as JobHandlerRegistry;
    const handler = new RetentionCleanupHandler(database, storage, registry);

    const result = await handler.handle({
      attemptNumber: 1,
      id: 'cleanup-job',
      maxAttempts: 3,
      payload: { now: '2026-10-08T00:00:00.000Z' },
      type: 'RETENTION_CLEANUP',
    });

    expect(database.recording.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        retentionUntil: { lte: new Date('2026-10-08T00:00:00.000Z') },
        attempt: { evaluationStatus: { in: ['EVALUATED', 'EVALUATION_FAILED'] } },
      },
      select: { id: true, storageKey: true },
      take: 100,
    });
    expect(storage.delete).toHaveBeenCalledWith(due.storageKey);
    expect(database.recording.updateMany).toHaveBeenCalledWith({
      where: { id: due.id, deletedAt: null },
      data: { deletedAt: new Date('2026-10-08T00:00:00.000Z') },
    });
    expect(database.activityDraft.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: new Date('2026-10-08T00:00:00.000Z') } },
    });
    expect(result).toEqual({ deletedDrafts: 2, deletedRecordings: 1 });
  });
});
