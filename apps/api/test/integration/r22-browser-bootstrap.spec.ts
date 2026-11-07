import { createServer, type Server } from 'node:http';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { it, expect } from 'vitest';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { LanguageEvaluationPort } from '../../src/ai-gateway/domain/language-evaluation.port.js';
import { ASSESSMENT_OPTIONS } from '../../src/teacher-ai/application/assessment-history.service.js';
import { OpenAiLanguageEvaluationAdapter } from '../../src/ai-gateway/infrastructure/openai-language-evaluation.adapter.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { configureContentSourceBodyParser } from '../../src/common/http/content-source-body-parser.js';
it.runIf(process.env.WL_R22_BROWSER === '1')(
  'serves the owned synthetic R2.2 browser fixture until stopped',
  async () => {
    const evidence =
      process.env.WL_R22_BROWSER_EVIDENCE_DIR ??
      'C:/Users/ASUS/AppData/Local/Temp/worklingo-r22-20261107/browser';
    const url =
      process.env.WL_R22_TEST_DATABASE_URL ??
      (
        await readFile(path.join(evidence, '../database-url.txt'), 'utf8')
      ).trim();
    const target = new URL(url);
    expect(`${target.hostname}:${target.port}${target.pathname}`).toBe(
      '127.0.0.1:55452/worklingo_r22',
    );
    let app: NestExpressApplication | undefined, server: Server | undefined;
    const db = new PrismaService({ datasourceUrl: url });
    try {
      server = createServer((req, res) => {
        let raw = '';
        req.on('data', (chunk) => (raw += chunk));
        req.on('end', () => {
          const input = JSON.parse(JSON.parse(raw).input);
          const text = input.submission as string;
          const verdict = {
            confidence: 'HIGH',
            summary: 'Synthetic browser assessment.',
            corrections: [],
            evidence: [
              {
                id: 'response',
                source: 'submission',
                quote: text.slice(0, 1000),
                start: 0,
                end: Math.min(text.length, 1000),
                startMs: null,
                endMs: null,
              },
            ],
            criteria: input.rubric.criteria.map((c: { id: string }) => ({
              id: c.id,
              level: 3,
              status: 'SCORED',
              evidenceIds: ['response'],
              rationale: 'Synthetic fixture evidence.',
              feedback: 'Synthetic fixture feedback.',
            })),
          };
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'completed',
              id: randomUUID(),
              model: 'r22-local-synthetic-browser',
              output: [
                {
                  content: [
                    { type: 'output_text', text: JSON.stringify(verdict) },
                  ],
                },
              ],
            }),
          );
        });
      });
      await new Promise<void>((resolve) =>
        server!.listen(0, '127.0.0.1', resolve),
      );
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('FIXTURE_ADDRESS_REQUIRED');
      const { AppModule } = await import('../../src/app.module.js');
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue(db)
        .overrideProvider(ASSESSMENT_OPTIONS)
        .useValue({
          enabled: true,
          privacyVerified: true,
          synthetic: true,
          leaseMs: 15000,
        })
        .overrideProvider(LanguageEvaluationPort)
        .useValue(
          new OpenAiLanguageEvaluationAdapter({
            apiKey: 'local-synthetic',
            baseUrl: `http://127.0.0.1:${address.port}/v1`,
            model: 'r22-synthetic',
            timeoutMs: 5000,
          }),
        )
        .compile();
      app = module.createNestApplication<NestExpressApplication>();
      configureContentSourceBodyParser(app);
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
      const { seedLearningPrograms } = await import(
        '../../src/learning-programs/infrastructure/seed-learning-programs.js'
      );
      const { seedFoundationCurriculum } = await import(
        '../../src/curriculum/infrastructure/seed-foundation.js'
      );
      await seedLearningPrograms(db);
      await seedFoundationCurriculum(db, app.get(ObjectStorage));
      await app.listen(4002, '127.0.0.1');
      await mkdir(evidence, { recursive: true });
      await writeFile(
        path.join(evidence, 'api-ready.json'),
        JSON.stringify({ api: 'http://127.0.0.1:4002', synthetic: true }),
      );
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          void access(path.join(evidence, 'stop'))
            .then(() => {
              clearInterval(timer);
              resolve();
            })
            .catch(() => undefined);
        }, 500);
      });
    } finally {
      await app?.close();
      await db.$disconnect();
      if (server)
        await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
  },
  1_800_000,
);
