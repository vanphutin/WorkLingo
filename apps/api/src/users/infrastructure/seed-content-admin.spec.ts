import type { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { seedContentAdmin } from './seed-content-admin.js';

describe('seedContentAdmin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails closed when local credentials were not supplied', async () => {
    vi.stubEnv('WORKLINGO_ADMIN_EMAIL', '');
    vi.stubEnv('WORKLINGO_ADMIN_PASSWORD', '');
    const database = {
      user: { upsert: vi.fn() },
    } as unknown as PrismaClient;

    await expect(seedContentAdmin(database)).rejects.toThrow(
      /Content Admin credentials are required/u,
    );
    expect(database.user.upsert).not.toHaveBeenCalled();
  });

  it('rejects the checked-in password placeholder', async () => {
    vi.stubEnv('WORKLINGO_ADMIN_EMAIL', 'admin@worklingo.local');
    vi.stubEnv('WORKLINGO_ADMIN_PASSWORD', 'replace-with-a-local-admin-password');
    const database = {
      user: { upsert: vi.fn() },
    } as unknown as PrismaClient;

    await expect(seedContentAdmin(database)).rejects.toThrow(
      /Content Admin credentials are required/u,
    );
    expect(database.user.upsert).not.toHaveBeenCalled();
  });
});
