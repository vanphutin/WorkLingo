import { describe, expect, it } from 'vitest';
import { programPolicySchema, programVersionInputSchema, programVersionSchema } from './index.ts';

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const policy = {
  version: 1, sequential: { stages: true, units: true, lessons: true },
  completion: { requiredActivityRatio: 1 }, mastery: { required: false, threshold: 0.8, minimumQualifiedAttempts: 1 },
  retry: { maxAttempts: 3, cooldownMinutes: 0 }, remediation: { enabled: true, afterAttempts: 2 },
  review: { scheduleVersion: 'program-review-v1', intervalsDays: [1, 3, 7], requiredForReadiness: false },
};
const binding = (n: number, prerequisites: string[] = []) => ({
  curriculumRevisionId: id(n), pathId: id(20), levelId: id(21), missionId: id(30 + n), order: n,
  title: `Unit ${n}`, objectives: ['Practice'], required: true, prerequisiteRevisionIds: prerequisites,
  lessons: [{ lessonVersionId: id(40 + n), order: 1, title: 'Lesson', objectives: ['Read'], estimatedMinutes: 15,
    difficulty: 'A1', activityIds: [id(50 + n)], vocabularyRefs: [], resourceRefs: [] }],
});
const input = () => ({ title: 'Program release', description: 'Exact curriculum pins', objectives: ['Learn'], estimatedMinutes: 30,
  difficulty: 'A1', policy, curriculumBindings: [binding(1), binding(2, [id(1)])] });

describe('program platform release contracts', () => {
  it('accepts exact ordered release snapshots with bounded audience defaults', () => {
    expect(programVersionInputSchema.parse(input())).toMatchObject({ supportedLanguages: ['en'], audiences: ['adult'] });
    expect(programVersionSchema.safeParse({ ...input(), supportedLanguages: ['en'], audiences: ['adult'], proficiencyLabel: 'A1',
      id: id(90), programId: id(91), version: 1, revision: 1, status: 'PUBLISHED', source: 'AUTHORED',
      capturedAt: '2026-10-30T00:00:00.000Z', createdAt: '2026-10-30T00:00:00.000Z', publishedAt: '2026-10-30T00:00:00.000Z', retiredAt: null }).success).toBe(true);
  });
});

describe('invalid release snapshots', () => {
  it.each([
    ['unknown root field', () => ({ ...input(), score: 1 })],
    ['unknown nested field', () => ({ ...input(), policy: { ...policy, trustAI: true } })],
    ['duplicate pins', () => ({ ...input(), curriculumBindings: [binding(1), binding(1)] })],
    ['forward prerequisite', () => ({ ...input(), curriculumBindings: [binding(1, [id(2)]), binding(2)] })],
    ['cyclic prerequisite', () => ({ ...input(), curriculumBindings: [binding(1, [id(2)]), binding(2, [id(1)])] })],
    ['missing prerequisite', () => ({ ...input(), curriculumBindings: [binding(1, [id(99)])] })],
    ['unordered binding', () => ({ ...input(), curriculumBindings: [binding(2), binding(1)] })],
    ['duplicate lesson', () => { const row = binding(1); return { ...input(), curriculumBindings: [{ ...row, lessons: [row.lessons[0], row.lessons[0]] }] }; }],
    ['duplicate vocabulary association', () => { const row = binding(1); return { ...input(), curriculumBindings: [{ ...row, lessons: [{ ...row.lessons[0], vocabularyRefs: [{ lexicalEntryId: id(7), senseId: id(8) }, { lexicalEntryId: id(7), senseId: id(8) }] }] }] }; }],
    ['duplicate languages', () => ({ ...input(), supportedLanguages: ['en', 'en'] })],
    ['oversize audience', () => ({ ...input(), audiences: ['x'.repeat(201)] })],
  ])('rejects %s', (_name, build) => { expect(programVersionInputSchema.safeParse(build()).success).toBe(false); });

  it.each([
    ['threshold above one', { ...policy, mastery: { ...policy.mastery, threshold: 1.1 } }],
    ['negative threshold', { ...policy, mastery: { ...policy.mastery, threshold: -0.1 } }],
    ['duplicate review interval', { ...policy, review: { ...policy.review, intervalsDays: [1, 1] } }],
    ['descending review interval', { ...policy, review: { ...policy.review, intervalsDays: [7, 1] } }],
    ['zero interval', { ...policy, review: { ...policy.review, intervalsDays: [0] } }],
    ['unreachable remediation', { ...policy, remediation: { enabled: true, afterAttempts: 4 } }],
  ])('rejects %s', (_name, value) => { expect(programPolicySchema.safeParse(value).success).toBe(false); });
});

describe('completion safety bounds', () => {
  it('requires evidence to complete a release', () => {
    expect(programPolicySchema.safeParse({ ...policy, completion: { requiredActivityRatio: 0 } }).success).toBe(false);
  });
  it('requires at least one real activity in a lesson', () => {
    const row = binding(1);
    expect(programVersionInputSchema.safeParse({ ...input(), curriculumBindings: [{ ...row, lessons: [{ ...row.lessons[0], activityIds: [] }] }] }).success).toBe(false);
  });
  it('requires contiguous lesson order', () => {
    const row = binding(1);
    expect(programVersionInputSchema.safeParse({ ...input(), curriculumBindings: [{ ...row, lessons: [{ ...row.lessons[0], order: 2 }] }] }).success).toBe(false);
  });
  it('fails closed for unknown scheduling algorithms', () => {
    expect(programPolicySchema.safeParse({ ...policy, review: { ...policy.review, scheduleVersion: 'unknown-v9' } }).success).toBe(false);
  });
});
