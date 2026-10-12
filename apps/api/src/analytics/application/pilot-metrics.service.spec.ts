import { describe, expect, it, vi } from 'vitest';

import { PilotMetricsService } from './pilot-metrics.service.js';

describe('PilotMetricsService', () => {
  it('records one aggregate increment and one hashed receipt transactionally', async () => {
    const tx = {
      pilotMetricDaily: { upsert: vi.fn().mockResolvedValue({}) },
      pilotMetricReceipt: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const database = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
    const service = new PilotMetricsService(database as never);

    await expect(service.record({
      dimensions: { outcome: 'completed' },
      eventType: 'REGISTRATION_COMPLETED',
      occurredAt: new Date('2026-10-12T08:00:00.000Z'),
      sourceKey: 'registration:user-123',
    })).resolves.toBe(true);

    expect(tx.pilotMetricReceipt.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        eventType: 'REGISTRATION_COMPLETED',
        sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      })],
      skipDuplicates: true,
    });
    expect(tx.pilotMetricDaily.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ count: 1, dateKey: '2026-10-12' }),
      update: { count: { increment: 1 } },
    }));
  });

  it('treats an existing source receipt as an idempotent replay', async () => {
    const tx = {
      pilotMetricDaily: { upsert: vi.fn() },
      pilotMetricReceipt: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    const database = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
    const service = new PilotMetricsService(database as never);

    await expect(service.record({
      eventType: 'LEARNING_SESSION_COMPLETED',
      sourceKey: 'session:abc:completed',
    })).resolves.toBe(false);
    expect(tx.pilotMetricDaily.upsert).not.toHaveBeenCalled();
  });

  it('isolates metric storage failures from product flows through best-effort recording', async () => {
    const database = {
      $transaction: vi.fn().mockRejectedValue(new Error('analytics unavailable')),
    };
    const service = new PilotMetricsService(database as never);

    await expect(service.recordBestEffort({
      eventType: 'CONTENT_PUBLISHED',
      sourceKey: 'lesson-version:abc:published',
    })).resolves.toBe(false);
  });
});
