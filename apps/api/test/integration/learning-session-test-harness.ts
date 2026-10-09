import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { seedFoundationCurriculum } from '../../src/curriculum/infrastructure/seed-foundation.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';

export interface LearningSessionTestContext {
  readonly app: INestApplication;
  readonly database: PrismaService;
  readonly schemaName: string;
  close(): Promise<void>;
  resetLearners(): Promise<void>;
}

export async function createLearningSessionTestContext(prefix: string): Promise<LearningSessionTestContext> {
  const schemaName = `${prefix}_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schemaName);
  const dataDirectory = await mkdtemp(path.join(tmpdir(), `${prefix}-`));
  process.env.DATABASE_URL = url.toString();
  process.env.SESSION_SECRET = 'learning-session-test-secret-at-least-32-characters';
  process.env.WORKLINGO_DATA_DIR = dataDirectory;

  const prismaCli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
  const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 30_000,
  });
  if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);

  const database = new PrismaService({ datasourceUrl: url.toString() });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(database)
    .compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    forbidNonWhitelisted: true, transform: true, whitelist: true,
  }));
  await app.init();
  await seedFoundationCurriculum(database, app.get(ObjectStorage));

  return {
    app,
    database,
    schemaName,
    async resetLearners() {
      // Restrict-linked audit/authoring rows must be removed before users.
      // Row deletes preserve system audio, unlike TRUNCATE User CASCADE, which
      // truncates the entire AudioArtifact table through ContentImport.
      await database.auditLog.deleteMany();
      await database.mutationReceipt.deleteMany();
      await database.job.deleteMany();
      await database.contentImport.deleteMany();
      await database.user.deleteMany();
    },
    async close() {
      await app.close();
      const admin = new PrismaClient({ datasourceUrl: baseUrl });
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await admin.$disconnect();
      await rm(dataDirectory, { force: true, recursive: true });
    },
  };
}

export async function registerLearner(
  app: INestApplication,
  input: { displayName: string; email: string; password?: string },
) {
  const agent = request.agent(app.getHttpServer());
  await agent.post('/api/v1/auth/register').send({
    displayName: input.displayName,
    email: input.email,
    password: input.password ?? 'a-secure-local-password',
  }).expect(201);
  return agent;
}
