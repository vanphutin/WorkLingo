import path from 'node:path';

import { z } from 'zod';

export interface AppConfig {
  readonly adminEmail?: string | undefined;
  readonly adminPassword?: string | undefined;
  readonly apiPort: number;
  readonly dataDir: string;
  readonly databaseUrl: string;
  readonly sessionSecret: string;
  readonly webPort: number;
}

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z
    .string()
    .min(32)
    .refine(
      (value) => value !== 'replace-with-a-local-development-secret',
      'must not use the documented placeholder',
    ),
  WEB_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  WORKLINGO_ADMIN_EMAIL: z.string().email().optional(),
  WORKLINGO_ADMIN_PASSWORD: z.string().min(8).optional(),
  WORKLINGO_DATA_DIR: z.string().min(1),
});

export function parseAppConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid application configuration: ${details}`);
  }

  return {
    adminEmail: result.data.WORKLINGO_ADMIN_EMAIL,
    adminPassword: result.data.WORKLINGO_ADMIN_PASSWORD,
    apiPort: result.data.API_PORT,
    dataDir: path.resolve(result.data.WORKLINGO_DATA_DIR),
    databaseUrl: result.data.DATABASE_URL,
    sessionSecret: result.data.SESSION_SECRET,
    webPort: result.data.WEB_PORT,
  };
}
