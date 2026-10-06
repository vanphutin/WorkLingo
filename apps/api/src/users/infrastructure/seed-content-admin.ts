import type { PrismaClient, User } from '@prisma/client';

import { PasswordHasher } from '../../auth/infrastructure/password-hasher.js';

export interface SeedContentAdminInput {
  readonly email?: string | undefined;
  readonly password?: string | undefined;
  readonly displayName?: string | undefined;
}

export async function seedContentAdmin(
  database: PrismaClient,
  input?: SeedContentAdminInput,
): Promise<User> {
  const email = input?.email || process.env.WORKLINGO_ADMIN_EMAIL;
  const password = input?.password || process.env.WORKLINGO_ADMIN_PASSWORD;
  const displayName = input?.displayName || 'Content Administrator';

  if (!email || !password || password === 'replace-with-a-local-admin-password') {
    throw new Error(
      'Content Admin credentials are required. Run pnpm setup:local or set WORKLINGO_ADMIN_EMAIL and WORKLINGO_ADMIN_PASSWORD.',
    );
  }

  const hasher = new PasswordHasher();
  const passwordHash = await hasher.hash(password);

  const admin = await database.user.upsert({
    where: { email },
    update: {
      displayName,
      role: 'CONTENT_ADMIN',
      status: 'ACTIVE',
      passwordHash,
    },
    create: {
      email,
      displayName,
      passwordHash,
      role: 'CONTENT_ADMIN',
      status: 'ACTIVE',
    },
  });

  return admin;
}
