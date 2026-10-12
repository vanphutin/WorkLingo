import { describe, expect, it, vi } from 'vitest';

import { PilotRetentionService } from './pilot-retention.service.js';

describe('PilotRetentionService', () => {
  it('returns bounded aggregate metrics and week-1/week-4 cohort retention', async () => {
    const database = {
      pilotMetricDaily: {
        findMany: vi.fn().mockResolvedValue([{
          count: 4,
          dateKey: '2026-08-01',
          dimensions: { outcome: 'completed' },
          eventType: 'LEARNING_SESSION_COMPLETED',
        }]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            createdAt: new Date('2026-08-01T08:00:00.000Z'),
            id: 'learner-1',
            studyDays: [
              { dateKey: '2026-08-09' },
              { dateKey: '2026-08-30' },
            ],
          },
          {
            createdAt: new Date('2026-08-02T08:00:00.000Z'),
            id: 'learner-2',
            studyDays: [],
          },
        ]),
      },
    };
    const service = new PilotRetentionService(database as never);

    const result = await service.summarize({
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(result.metrics).toEqual([{
      count: 4,
      dateKey: '2026-08-01',
      dimensions: { outcome: 'completed' },
      eventType: 'LEARNING_SESSION_COMPLETED',
    }]);
    expect(result.retention.week1).toEqual({
      cohortSize: 2,
      retainedCount: 1,
      retentionRate: 0.5,
    });
    expect(result.retention.week4).toEqual({
      cohortSize: 2,
      retainedCount: 1,
      retentionRate: 0.5,
    });
  });
});
