import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('GET /api/v1/health', () => {
  let app: INestApplication | undefined;
  let dataDirectory: string;

  beforeAll(async () => {
    dataDirectory = await mkdtemp(path.join(tmpdir(), 'worklingo-health-'));
    process.env.DATABASE_URL =
      'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
    process.env.SESSION_SECRET =
      'health-test-secret-with-at-least-32-characters';
    process.env.WORKLINGO_DATA_DIR = dataDirectory;
    const { AppModule } = await import('../../src/app.module.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await rm(dataDirectory, { force: true, recursive: true });
  });

  it('reports database and storage readiness without leaking config', async () => {
    if (!app) {
      throw new Error('Test application was not initialized');
    }

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual({
      checks: {
        database: { status: 'up' },
        storage: { status: 'up' },
      },
      status: 'ok',
    });
    expect(JSON.stringify(response.body)).not.toContain(dataDirectory);
    expect(JSON.stringify(response.body)).not.toContain(
      process.env.DATABASE_URL,
    );
  });
});
