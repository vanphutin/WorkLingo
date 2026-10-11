import { describe, expect, it } from 'vitest';

import { getPostAuthenticationPath } from './auth-page';

describe('getPostAuthenticationPath', () => {
  it('opens the admin workspace for content administrators', () => {
    expect(
      getPostAuthenticationPath({
        displayName: 'Content Admin',
        email: 'admin@example.test',
        id: '4b5bc25f-8058-4df5-a0e2-68bf8a5b963e',
        onboardingStatus: null,
        roles: ['CONTENT_ADMIN'],
      }),
    ).toBe('/admin/content');
  });

  it('opens the learner dashboard for learners', () => {
    expect(
      getPostAuthenticationPath({
        displayName: 'An Nguyen',
        email: 'an@example.test',
        id: '4b5bc25f-8058-4df5-a0e2-68bf8a5b963e',
        onboardingStatus: 'COMPLETE',
        roles: ['LEARNER'],
      }),
    ).toBe('/dashboard');
  });

  it('opens onboarding for a learner who has not chosen a starting level', () => {
    expect(
      getPostAuthenticationPath({
        displayName: 'Minh Tran',
        email: 'minh@example.test',
        id: 'd9313851-b36a-480d-a760-095a0fd7699d',
        onboardingStatus: 'PENDING',
        roles: ['LEARNER'],
      }),
    ).toBe('/onboarding');
  });
});
