import { describe, expect, it } from 'vitest';
import type { ProgramVersionInput } from '@worklingo/contracts';
import { defaultProgramPolicy } from '../application/program-release-snapshot.js';
import { projectProgramProgress, type ProgramEvidence } from './program-progression.js';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = '2026-10-31T00:00:00.000Z';
const snapshot: ProgramVersionInput = { title: 'Course', description: 'Course', objectives: [], estimatedMinutes: 20, difficulty: 'A1', supportedLanguages: ['en'], audiences: ['adult'], policy: defaultProgramPolicy, curriculumBindings: [1, 2].map(n => ({ curriculumRevisionId: id(n), pathId: id(10), levelId: id(11), missionId: id(20 + n), order: n, title: `Unit ${n}`, objectives: [], required: true, prerequisiteRevisionIds: n === 2 ? [id(1)] : [], lessons: [{ lessonVersionId: id(30 + n), order: 1, title: `Lesson ${n}`, objectives: [], estimatedMinutes: 10, difficulty: 'A1', activityIds: [id(40 + n)], vocabularyRefs: [], resourceRefs: [] }] })) };
const evidence = (n: number, score: number | null = null): ProgramEvidence['attempts'][number] => ({ enrollmentId: id(100), programVersionId: id(101), curriculumRevisionId: id(n), lessonVersionId: id(30 + n), activityId: id(40 + n), attemptId: id(50 + n), sessionId: id(60 + n), skill: 'reading', completedAt: now, source: 'DETERMINISTIC', evaluationStatus: 'EVALUATED', qualification: score === null ? 'PENDING' : 'QUALIFIED', score, evaluationVersion: 'deterministic-v1' });
const base: ProgramEvidence = { enrollmentId: id(100), programVersionId: id(101), status: 'ACTIVE', attempts: [], resumes: [], reviews: [] };
describe('projectProgramProgress public rules', () => {
    it('gates sequential units on readiness and keeps unknown mastery distinct from completion', () => {
        const initial = projectProgramProgress(snapshot, base, now);
        expect(initial.items.map(i => i.state)).toEqual(['available', 'locked']);
        const pending = projectProgramProgress({ ...snapshot, policy: { ...snapshot.policy, mastery: { ...snapshot.policy.mastery, required: true } } }, { ...base, attempts: [evidence(1)] }, now);
        expect(pending.items[0]).toMatchObject({ completed: true, ready: false, mastery: { status: 'PENDING', score: null } });
        expect(pending.items[1]?.reasons).toContain('prerequisite_not_ready:' + id(1));
        const qualified = projectProgramProgress(snapshot, { ...base, attempts: [evidence(1, 1)] }, now);
        expect(qualified.items.map(i => i.state)).toEqual(['completed', 'available']);
    });
});
it('requires persisted review completion and ignores resume on locked content', () => {
    const policy = { ...snapshot.policy, review: { ...snapshot.policy.review, requiredForReadiness: true } };
    const p = projectProgramProgress({ ...snapshot, policy }, { ...base, attempts: [evidence(1, 1)], reviews: [{ curriculumRevisionId: id(1), lessonVersionId: id(31), dueAt: now, lastCompletedAt: null }], resumes: [{ curriculumRevisionId: id(2), lessonVersionId: id(32), sessionId: id(80), createdAt: now }] }, now);
    expect(p.items[0]).toMatchObject({ completed: true, ready: false, reviewCompleted: false });
    expect(p.nextAction.type).toBe('review');
    const reviewed = projectProgramProgress({ ...snapshot, policy }, { ...base, attempts: [evidence(1, 1)], reviews: [{ curriculumRevisionId: id(1), lessonVersionId: id(31), dueAt: '2026-11-07T00:00:00.000Z', lastCompletedAt: now }] }, now);
    expect(reviewed.items[1]?.eligible).toBe(true);
});
it('selects eligible resume before due review and snapshot order breaks equal due times', () => {
    const p = projectProgramProgress({ ...snapshot, policy: { ...snapshot.policy, sequential: { stages: false, units: false, lessons: false } }, curriculumBindings: snapshot.curriculumBindings.map(b => ({ ...b, prerequisiteRevisionIds: [] })) }, { ...base, reviews: [{ curriculumRevisionId: id(2), lessonVersionId: id(32), dueAt: now, lastCompletedAt: null }, { curriculumRevisionId: id(1), lessonVersionId: id(31), dueAt: now, lastCompletedAt: null }], resumes: [{ curriculumRevisionId: id(2), lessonVersionId: id(32), sessionId: id(80), createdAt: now }] }, now);
    expect(p.nextAction).toMatchObject({ type: 'resume', sessionId: id(80) });
    const review = projectProgramProgress(snapshot, { ...base, reviews: [{ curriculumRevisionId: id(1), lessonVersionId: id(31), dueAt: now, lastCompletedAt: null }] }, now);
    expect(review.nextAction).toMatchObject({ type: 'review', curriculumRevisionId: id(1) });
});
it('explains inactive enrollment, cooldown, retry limits and remediation', () => {
    const low = evidence(1, 0.2);
    const policy = { ...snapshot.policy, mastery: { ...snapshot.policy.mastery, required: true }, retry: { maxAttempts: 3, cooldownMinutes: 60 }, remediation: { enabled: true, afterAttempts: 2 } };
    const p = projectProgramProgress({ ...snapshot, policy }, { ...base, attempts: [low, { ...low, attemptId: id(71), sessionId: id(72) }] }, now);
    expect(p.items[0]).toMatchObject({ remediation: true, retryAt: '2026-10-31T01:00:00.000Z' });
    expect(p.items[0]?.reasons).toContain('retry_cooldown');
    const exhausted = projectProgramProgress({ ...snapshot, policy: { ...policy, remediation: { ...policy.remediation, enabled: false } } }, { ...base, attempts: [low, { ...low, attemptId: id(71), sessionId: id(72) }, { ...low, attemptId: id(73), sessionId: id(74) }] }, '2026-10-31T02:00:00.000Z');
    expect(exhausted.items[0]?.reasons).toContain('retry_limit_reached');
    const suspended = projectProgramProgress(snapshot, { ...base, status: 'SUSPENDED' }, now);
    expect(suspended.items.every(i => i.reasons.includes('enrollment_suspended') && !i.eligible)).toBe(true);
});
it('uses the later attempt within a completed session even when UUID ordering is reversed', () => {
    const earlier = { ...evidence(1, 0.2), attemptId: id(99), attemptedAt: '2026-10-30T22:00:00.000Z' };
    const later = { ...evidence(1, 1), attemptId: id(1), attemptedAt: '2026-10-30T23:00:00.000Z' };
    expect(projectProgramProgress(snapshot, { ...base, attempts: [earlier, later] }, now).items[0]?.mastery.score).toBe(1);
});

it('keeps explicit remediation actionable at the ordinary retry boundary', () => {
    const low = evidence(1, 0.2);
    const policy = { ...snapshot.policy, mastery: { ...snapshot.policy.mastery, required: true }, retry: { maxAttempts: 2, cooldownMinutes: 0 }, remediation: { enabled: true, afterAttempts: 2 } };
    const attempts = [low, { ...low, attemptId: id(71), sessionId: id(72) }];
    const progress = projectProgramProgress({ ...snapshot, policy }, { ...base, attempts }, now);
    expect(progress.items[0]).toMatchObject({ eligible: true, remediation: true, ready: false });
    expect(progress.nextAction).toMatchObject({ type: 'remediation', lessonVersionId: id(31) });
    const ordinary = projectProgramProgress({ ...snapshot, policy: { ...policy, remediation: { ...policy.remediation, enabled: false } } }, { ...base, attempts }, now);
    expect(ordinary.items[0]).toMatchObject({ eligible: false, remediation: false, reasons: ['retry_limit_reached'] });
});
