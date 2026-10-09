import { describe, expect, it } from 'vitest';

import { getPostAuthenticationPath } from './auth-page';

describe('getPostAuthenticationPath', () => {
  it('opens the admin workspace for content administrators', () => {
    expect(
      getPostAuthenticationPath({
        displayName: 'Content Admin',
        email: 'admin@example.test',
        id: '4b5bc25f-8058-4df5-a0e2-68bf8a5b963e',
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
        roles: ['LEARNER'],
      }),
    ).toBe('/dashboard');
  });
});
