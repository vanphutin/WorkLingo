import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { dashboardSectionSchema, learnerProgressDtoSchema } from './dashboard-overview.contracts.ts';
describe('Dashboard section contracts', () => {
  it('distinguishes valid section data from bounded errors', () => {
    const schema = dashboardSectionSchema(z.number().min(0).max(1));
    expect(schema.parse({ status: 'ready', data: 0.75 })).toEqual({ status: 'ready', data: 0.75 });
    expect(schema.safeParse({ status: 'ready', data: 75 }).success).toBe(false);
    expect(schema.safeParse({ status: 'error', error: { code: 'OFFLINE', status: 503, message: 'private' } }).success).toBe(false);
  });
  it('rejects impossible progress counts', () => {
    expect(learnerProgressDtoSchema.safeParse({ activityAttempts: -1, completedActivities: 0, currentLevelCode: null, sessions: { completed: 0, inProgress: 0, paused: 0, planned: 0 } }).success).toBe(false);
  });
});
