import { describe, expect, it } from 'vitest';

import {
  adminPilotAnalyticsQuerySchema,
  adminPilotAnalyticsResponseSchema,
  pilotMetricDimensionsSchema,
} from './admin-analytics.contracts.js';

describe('Admin pilot analytics contracts', () => {
  it('accepts only bounded aggregate dimensions', () => {
    expect(pilotMetricDimensionsSchema.parse({
      durationBucket: '60',
      levelCode: 'FOUNDATION_1',
      missionCode: 'welcome-to-the-team',
      outcome: 'completed',
      skill: 'speaking',
    })).toEqual({
      durationBucket: '60',
      levelCode: 'FOUNDATION_1',
      missionCode: 'welcome-to-the-team',
      outcome: 'completed',
      skill: 'speaking',
    });

    expect(() => pilotMetricDimensionsSchema.parse({
      email: 'learner@example.com',
      transcript: 'raw learner text',
    })).toThrow();
  });

  it('requires a valid bounded date range', () => {
    expect(adminPilotAnalyticsQuerySchema.parse({
      from: '2026-09-01',
      to: '2026-10-01',
    })).toEqual({ from: '2026-09-01', to: '2026-10-01' });

    expect(() => adminPilotAnalyticsQuerySchema.parse({
      from: '2026-10-02',
      to: '2026-10-01',
    })).toThrow();
    expect(() => adminPilotAnalyticsQuerySchema.parse({
      from: '2025-01-01',
      to: '2026-10-01',
    })).toThrow();
  });

  it('returns aggregate counts and explicit definitions without learner identity', () => {
    const response = {
      definitions: [{
        description: 'A learner account was created successfully.',
        eventType: 'REGISTRATION_COMPLETED',
      }],
      from: '2026-10-01',
      metrics: [{
        count: 3,
        dateKey: '2026-10-01',
        dimensions: {},
        eventType: 'REGISTRATION_COMPLETED',
      }],
      retention: {
        week1: { cohortSize: 10, retainedCount: 6, retentionRate: 0.6 },
        week4: { cohortSize: 8, retainedCount: 3, retentionRate: 0.375 },
      },
      to: '2026-10-01',
    };

    expect(adminPilotAnalyticsResponseSchema.parse(response)).toEqual(response);
    expect(JSON.stringify(response)).not.toContain('userId');
  });
});
