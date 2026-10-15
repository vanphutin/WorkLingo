import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('GET /api/v1/health', () => {
  let context: LearningSessionTestContext | undefined;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('health_test');
  }, 40_000);

  afterAll(async () => {
    await context?.close();
  });

  it('reports database and storage readiness without leaking config', async () => {
    if (!context) {
      throw new Error('Test application was not initialized');
    }

    const response = await request(context.app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual({
      checks: {
        database: { status: 'up' },
        storage: { status: 'up' },
      },
      status: 'ok',
    });
    expect(JSON.stringify(response.body)).not.toContain(process.env.WORKLINGO_DATA_DIR);
    expect(JSON.stringify(response.body)).not.toContain(
      process.env.DATABASE_URL,
    );
  });
});
