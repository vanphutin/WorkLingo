import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

describe('AppModule', () => {
  it('compiles the application dependency graph', async () => {
    process.env.DATABASE_URL =
      'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
    process.env.SESSION_SECRET =
      'smoke-test-secret-with-at-least-32-characters';
    process.env.WORKLINGO_DATA_DIR = './data/test-smoke';
    const { AppModule } = await import('../../src/app.module.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    await moduleRef.close();
  });
});
