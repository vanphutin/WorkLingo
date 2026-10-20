import { ieltsMockAttemptSchema, type IeltsMockAttemptDto } from '@worklingo/contracts';

export const shellUser = {
  id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.test',
  displayName: 'Nguyễn Minh Anh — học viên luyện tiếng Anh cho công việc',
  roles: ['LEARNER'], onboardingStatus: 'COMPLETE', locale: 'vi',
};
export const attemptId = '11111111-1111-4111-8111-111111111111';
export const questionId = '33333333-3333-4333-8333-333333333333';

// Same reading/answer fixture as features/ielts-mock/ielts-mock.test.tsx.
// Only network outcomes are simulated; the actual route/player/timer/autosave run.
export function shellAttempt(): IeltsMockAttemptDto {
  const now = new Date();
  return ieltsMockAttemptSchema.parse({
    id: attemptId, mockTestVersionId: '22222222-2222-4222-8222-222222222222', mockTestVersion: 1,
    title: 'Academic Mock', mode: 'PRACTICE', status: 'IN_PROGRESS', currentSection: 'READING', revision: 1,
    responses: { [questionId]: 'My saved answer' }, submittedSections: ['LISTENING'],
    sectionStartedAt: now.toISOString(), sectionDeadlineAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
    startedAt: now.toISOString(), submittedAt: null,
    sectionContent: { listening: [], reading: [{ section: 1, title: 'English passage',
      passage: 'Preserve this supplied English passage.', questions: [{ id: questionId, order: 1,
        type: 'short_answer', prompt: 'What is the main idea?', options: [], competencyTags: ['reading_detail'] }] }], writing: [], speaking: [] },
  });
}
