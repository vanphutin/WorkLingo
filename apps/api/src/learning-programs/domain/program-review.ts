import type { ProgramPolicy } from '@worklingo/contracts';
export interface ProgramReviewHistory {
    readonly curriculumRevisionId: string;
    readonly lessonVersionId: string;
    readonly scheduledAt?: string;
    readonly completedAt?: string;
    readonly iteration: number;
}
export interface ProgramReviewSchedule {
    readonly curriculumRevisionId: string;
    readonly lessonVersionId: string;
    readonly scheduleVersion: 'program-review-v1';
    readonly iteration: number;
    readonly dueAt: string;
    readonly reason: 'FIRST_COMPLETION' | 'REVIEW_COMPLETION';
}
export function scheduleProgramReview(policy: Pick<ProgramPolicy, 'review'>, history: readonly ProgramReviewHistory[], now: string): ProgramReviewSchedule[] {
    const at = Date.parse(now);
    if (!Number.isFinite(at))
        throw new Error('INVALID_NOW');
    const latest = new Map<string, ProgramReviewHistory>();
    for (const row of history) {
        const key = `${row.curriculumRevisionId}:${row.lessonVersionId}`;
        const previous = latest.get(key);
        if (!previous || (row.completedAt ?? row.scheduledAt ?? '') > (previous.completedAt ?? previous.scheduledAt ?? ''))
            latest.set(key, row);
    }
    return [...latest.values()].sort((a, b) => `${a.curriculumRevisionId}:${a.lessonVersionId}`.localeCompare(`${b.curriculumRevisionId}:${b.lessonVersionId}`)).map(row => {
        const iteration = row.completedAt ? row.iteration + 1 : Math.max(1, row.iteration);
        const anchor = row.completedAt ?? row.scheduledAt ?? now;
        const days = policy.review.intervalsDays[Math.min(iteration - 1, policy.review.intervalsDays.length - 1)]!;
        return { curriculumRevisionId: row.curriculumRevisionId, lessonVersionId: row.lessonVersionId, scheduleVersion: 'program-review-v1', iteration, dueAt: new Date(Date.parse(anchor) + days * 86400000).toISOString(), reason: row.completedAt ? 'REVIEW_COMPLETION' : 'FIRST_COMPLETION' };
    });
}
