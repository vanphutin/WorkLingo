import { expect, it } from 'vitest';
import { reviewCycleAttempts, scheduleProgramReview } from './program-review.js';
const policy = { review: { scheduleVersion: 'program-review-v1' as const, intervalsDays: [1, 7, 30], requiredForReadiness: true } };
it('schedules first and subsequent review deterministically with bounded interval', () => {
    const result = scheduleProgramReview(policy, [{ curriculumRevisionId: 'a', lessonVersionId: 'b', iteration: 0 }], '2026-10-31T00:00:00.000Z');
    expect(result[0]).toMatchObject({ iteration: 1, dueAt: '2026-11-01T00:00:00.000Z', reason: 'FIRST_COMPLETION' });
    const next = scheduleProgramReview(policy, [{ curriculumRevisionId: 'a', lessonVersionId: 'b', iteration: 1, completedAt: '2026-11-01T00:00:00.000Z' }], '2026-11-02T00:00:00.000Z');
    expect(next[0]).toMatchObject({ iteration: 2, dueAt: '2026-11-08T00:00:00.000Z', reason: 'REVIEW_COMPLETION' });
});
it('caps the configured interval and uses persisted completion instead of current time', () => {
    const result = scheduleProgramReview(policy, [{ curriculumRevisionId: 'a', lessonVersionId: 'b', iteration: 50, completedAt: '2026-10-01T00:00:00.000Z' }], '2026-10-31T00:00:00.000Z');
    expect(result[0]).toMatchObject({ iteration: 51, dueAt: '2026-10-31T00:00:00.000Z' });
    expect(scheduleProgramReview(policy, [{ curriculumRevisionId: 'a', lessonVersionId: 'b', iteration: 0, scheduledAt: '2026-10-01T00:00:00.000Z' }], '2026-10-31T00:00:00.000Z')[0]?.dueAt).toBe('2026-10-02T00:00:00.000Z');
});

it('counts only completed sessions begun within the current review cycle', () => {
    const boundary = '2026-10-31T00:00:00.000Z';
    const old = { activityId: 'old', sessionStartedAt: '2026-10-30T23:59:59.000Z', completedAt: '2026-10-31T01:00:00.000Z' };
    const equal = { activityId: 'equal', sessionStartedAt: boundary, completedAt: '2026-10-31T01:00:00.000Z' };
    const current = { activityId: 'current', sessionStartedAt: '2026-10-31T00:30:00.000Z', completedAt: '2026-10-31T02:00:00.000Z' };
    const missing = { activityId: 'missing', completedAt: current.completedAt };
    expect(reviewCycleAttempts([old, equal, current, missing], boundary).map(a => a.activityId)).toEqual(['equal', 'current']);
    expect(reviewCycleAttempts([old, equal, current], boundary, equal.completedAt).map(a => a.activityId)).toEqual(['equal']);
    expect(reviewCycleAttempts([old], null)).toEqual([old]);
});
