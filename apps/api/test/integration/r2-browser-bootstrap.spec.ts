import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { it, expect } from 'vitest';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { createLearningSessionTestContext, registerLearner } from './learning-session-test-harness.js';

it('serves only an isolated R2 browser qualification fixture until explicit stop', async () => {
  if (process.env.WL_R2_BROWSER !== '1') throw new Error('R2_BROWSER_EXPLICIT_RUN_ONLY');
  const root = 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030';
  const context = await createLearningSessionTestContext('r2_browser', { migrationConfig: 'prisma.r2.config.ts' });
  try {
    mkdirSync(root, { recursive: true });
    const accounts = { admin: { email: `admin-${randomUUID()}@example.test`, password: 'Isolated-R2-Admin-123!' }, learner: { email: `learner-${randomUUID()}@example.test`, password: 'Isolated-R2-Learner-123!' } };
    await seedContentAdmin(context.database, accounts.admin);
    await registerLearner(context.app, { displayName: 'Synthetic R2 browser learner', ...accounts.learner });
    const version = await context.database.lessonVersion.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
    const admin = request.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send(accounts.admin).expect(200);
    const check = await admin.get('/api/v1/admin/learning-programs').expect(200);
    expect(check.body.programs.length).toBeGreaterThan(0);
    await context.app.listen(33542, '127.0.0.1');
    writeFileSync(`${root}/browser-manifest.json`, JSON.stringify({ provenance: 'SYNTHETIC_ACTUAL_NEST_POSTGRES', schemaName: context.schemaName, accounts, lessonVersion: version }, null, 2));
    while (!existsSync(`${root}/browser-stop.request`)) await new Promise(resolve => setTimeout(resolve, 500));
  } finally { await context.close(); }
}, 14_400_000);
