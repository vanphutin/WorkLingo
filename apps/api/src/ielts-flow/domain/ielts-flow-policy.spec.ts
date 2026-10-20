import { describe, expect, it } from 'vitest';
import { canEnterIeltsV3 } from './ielts-flow-policy';

describe('IELTS V3 admission', () => {
  const learner = { role: 'LEARNER', status: 'ACTIVE', onboardingStatus: 'COMPLETE', programStatus: 'BETA' };
  it('admits onboarded learners without any earned phase or account grant', () => {
    expect(canEnterIeltsV3(learner)).toBe(true);
    expect(canEnterIeltsV3({ ...learner, programStatus: 'AVAILABLE' })).toBe(true);
  });
  it.each([{ role: 'SYSTEM_ADMIN' }, { status: 'DISABLED' }, { onboardingStatus: 'IN_PROGRESS' }, { programStatus: 'COMING_SOON' }])('rejects ineligible identity %j', (change) => {
    expect(canEnterIeltsV3({ ...learner, ...change })).toBe(false);
  });
});
