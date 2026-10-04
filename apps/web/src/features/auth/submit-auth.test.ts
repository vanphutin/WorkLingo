import { afterEach, describe, expect, it, vi } from 'vitest';

import { submitAuth } from './submit-auth';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitAuth', () => {
  it('uses the same-origin API proxy so session cookies work without CORS', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          displayName: 'An Nguyen',
          email: 'an@example.com',
          id: '4b5bc25f-8058-4df5-a0e2-68bf8a5b963e',
          roles: ['LEARNER'],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await submitAuth('login', {
      email: 'an@example.com',
      password: 'a-secure-local-password',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
