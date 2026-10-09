import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { JobsService } from '../../src/jobs/application/jobs.service.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';

describe('leased PostgreSQL job worker', () => {
  const schemaName = `jobs_worker_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL
    ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const admin = new PrismaService({ datasourceUrl: baseUrl });
  let firstDatabase: PrismaService;
  let secondDatabase: PrismaService;
  let first: JobsService;
  let second: JobsService;
  let actorId: string;
  let schemaCreated = false;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: url.toString() },
      encoding: 'utf8', timeout: 45_000,
    });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
    firstDatabase = new PrismaService({ datasourceUrl: url.toString() });
    secondDatabase = new PrismaService({ datasourceUrl: url.toString() });
    await Promise.all([firstDatabase.$connect(), secondDatabase.$connect()]);
    schemaCreated = true;
    first = new JobsService(firstDatabase);
    second = new JobsService(secondDatabase);
    const actor = await firstDatabase.user.create({
      data: {
        email: `worker-${randomUUID()}@example.com`,
        displayName: 'Worker Test Actor',
        passwordHash: 'test-hash',
      },
    });
    actorId = actor.id;
  }, 50_000);

  beforeEach(async () => {
    await firstDatabase.job.deleteMany();
  });

  afterAll(async () => {
    await Promise.all([firstDatabase?.$disconnect(), secondDatabase?.$disconnect()]);
    if (schemaCreated) await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
  });

  const availableAt = new Date('2026-10-08T00:00:00.000Z');
  const enqueue = async (idempotencyKey: string) => {
    const job = await first.enqueue({
      createdById: actorId,
      idempotencyKey,
      payload: { fixture: true },
      resourceId: idempotencyKey,
      resourceType: 'test',
      type: 'TEST_JOB',
    });
    await firstDatabase.job.update({ where: { id: job.id }, data: { availableAt } });
    return job;
  };

  it('allows only one concurrent runner to claim a row', async () => {
    const job = await enqueue(`claim-${randomUUID()}`);
    const now = new Date('2026-10-08T01:00:00.000Z');

    const claims = await Promise.all([
      first.claimNext('worker-a', now, 30_000),
      second.claimNext('worker-b', now, 30_000),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)?.id).toBe(job.id);
    await expect(firstDatabase.jobAttempt.count({ where: { jobId: job.id } })).resolves.toBe(1);
  });

  it('protects a live lease and reclaims an expired lease without accepting stale completion', async () => {
    const job = await enqueue(`lease-${randomUUID()}`);
    const startedAt = new Date('2026-10-08T01:00:00.000Z');
    const firstClaim = await first.claimNext('worker-a', startedAt, 30_000);
    expect(firstClaim).not.toBeNull();

    await expect(second.claimNext('worker-b', new Date(startedAt.getTime() + 29_999), 30_000))
      .resolves.toBeNull();
    const reclaimed = await second.claimNext(
      'worker-b', new Date(startedAt.getTime() + 30_001), 30_000,
    );
    expect(reclaimed).toMatchObject({ id: job.id, attemptNumber: 2 });

    await expect(first.completeClaim({
      attemptNumber: 1, jobId: job.id, result: { stale: true }, workerId: 'worker-a',
    })).resolves.toBe(false);
    await expect(second.completeClaim({
      attemptNumber: 2, jobId: job.id, result: { completed: true }, workerId: 'worker-b',
    })).resolves.toBe(true);
    await expect(firstDatabase.job.findUniqueOrThrow({ where: { id: job.id } }))
      .resolves.toMatchObject({ status: 'COMPLETED', attemptCount: 2 });
    await expect(firstDatabase.jobAttempt.count({ where: { jobId: job.id } })).resolves.toBe(2);
  });

  it('keeps the same job identity while waiting for retry', async () => {
    const job = await enqueue(`retry-${randomUUID()}`);
    const startedAt = new Date('2026-10-08T01:00:00.000Z');
    const claim = await first.claimNext('worker-a', startedAt, 30_000);
    const availableAt = new Date(startedAt.getTime() + 5_000);

    await first.failClaim({
      attemptNumber: claim!.attemptNumber,
      availableAt,
      code: 'PROVIDER_TIMEOUT',
      errorSummary: 'Provider request timed out.',
      jobId: job.id,
      manuallyRetryable: true,
      retry: true,
      workerId: 'worker-a',
    });

    await expect(second.claimNext('worker-b', new Date(availableAt.getTime() - 1), 30_000))
      .resolves.toBeNull();
    await expect(second.claimNext('worker-b', availableAt, 30_000))
      .resolves.toMatchObject({ id: job.id, attemptNumber: 2 });
  });

  it('allows an admin retry to preserve identity and grant one explicit attempt', async () => {
    const job = await enqueue(`manual-${randomUUID()}`);
    const claim = await first.claimNext('worker-a', new Date(), 30_000);
    await first.failClaim({
      attemptNumber: claim!.attemptNumber,
      code: 'PROVIDER_RESPONSE_INVALID',
      errorSummary: 'Provider returned an invalid response.',
      jobId: job.id,
      manuallyRetryable: true,
      retry: false,
      workerId: 'worker-a',
    });

    await expect(first.retryJob(job.id, actorId)).resolves.toMatchObject({
      id: job.id, status: 'PENDING', type: 'TEST_JOB',
    });
    await expect(firstDatabase.job.findUniqueOrThrow({ where: { id: job.id } }))
      .resolves.toMatchObject({ id: job.id, maxAttempts: 4, retryable: false });
  });

  it('keeps existing fake-audio job records readable', async () => {
    const row = await firstDatabase.job.create({
      data: {
        type: 'generate-audio',
        payload: { contentImportId: 'legacy-fixture' },
        createdById: actorId,
        idempotencyKey: `legacy-audio-${randomUUID()}`,
      },
    });

    await expect(first.getJob(row.id, actorId)).resolves.toMatchObject({
      id: row.id, status: 'PENDING', type: 'generate-audio',
    });
  });
});
