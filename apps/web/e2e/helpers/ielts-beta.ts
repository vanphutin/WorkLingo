import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, request, type APIRequestContext, type APIResponse } from '@playwright/test';
import {
  adminIeltsBandCurriculumSchema,
  adminIeltsBridgeModuleSchema,
  adminIeltsIntegratedProfileSchema,
  adminIeltsMockSchema,
  adminOrientationSchema,
  ieltsMockContentSchema,
} from '@worklingo/contracts';

import { ADMIN_CREDENTIALS } from './content-admin';

interface FixtureDatabase {
  learningProgram: { update(input: unknown): Promise<unknown> };
  audioArtifact: { create(input: unknown): Promise<{ id: string }> };
  $disconnect(): Promise<void>;
}

function isolatedTarget(baseURL: string) {
  const schema = process.env.WORKLINGO_E2E_SCHEMA;
  const datasourceUrl = process.env.WORKLINGO_E2E_DATABASE_URL;
  const dataDirectory = process.env.WORKLINGO_E2E_DATA_DIR;
  if (!schema || !/^worklingo_e2e_[0-9a-f]{32}$/u.test(schema) || !datasourceUrl || !dataDirectory) {
    throw new Error('IELTS Beta fixtures require the disposable Playwright schema and data directory.');
  }
  const databaseUrl = new URL(datasourceUrl);
  const webUrl = new URL(baseURL);
  if (databaseUrl.searchParams.get('schema') !== schema || databaseUrl.searchParams.has('options') ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(databaseUrl.hostname) ||
      webUrl.origin !== `http://127.0.0.1:${process.env.WORKLINGO_E2E_WEB_PORT ?? '33100'}` ||
      path.resolve(dataDirectory) !== path.resolve(tmpdir(), schema)) {
    throw new Error('Refusing IELTS Beta publication outside the isolated local E2E target.');
  }
  return { datasourceUrl, dataDirectory };
}

async function json(response: APIResponse): Promise<unknown> {
  expect(response.ok(), `${response.url()} returned ${response.status()}: ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function publish(admin: APIRequestContext, endpoint: string, draftRevision: number) {
  const validation = await json(await admin.post(`${endpoint}/validate`, {
    data: { expectedRevision: draftRevision },
  })) as { canPublish: boolean; issues: unknown[] };
  expect(validation.canPublish, JSON.stringify(validation.issues)).toBe(true);
  await json(await admin.post(`${endpoint}/publish`, {
    data: { expectedRevision: draftRevision, idempotencyKey: randomUUID() },
  }));
}

// A short PCM tone, NOT spoken content or release-ready IELTS material. Four distinct
// artifacts exercise the real catalog's metadata gate without synthesis/providers.
function syntheticWav(part: number): Buffer {
  const sampleRate = 8_000;
  const sampleCount = 2_000;
  const wav = Buffer.alloc(44 + sampleCount * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(sampleCount * 2, 40);
  for (let sample = 0; sample < sampleCount; sample += 1) {
    wav.writeInt16LE(Math.round(1_000 * Math.sin(2 * Math.PI * (220 + part * 110) * sample / sampleRate)), 44 + sample * 2);
  }
  return wav;
}

/** Publication fixtures only: never write progress, enrollments, checkpoints or real public data. */
export async function publishIeltsBetaFixtures(baseURL: string): Promise<void> {
  // All target checks precede login, file creation, and any publication/database write.
  const { datasourceUrl, dataDirectory } = isolatedTarget(baseURL);
  const apiRequire = createRequire(path.resolve(__dirname, '../../../api/package.json'));
  const { PrismaClient } = apiRequire('@prisma/client') as {
    PrismaClient: new (options: { datasourceUrl: string }) => FixtureDatabase;
  };
  const database = new PrismaClient({ datasourceUrl });
  const admin = await request.newContext({ baseURL });
  try {
    await json(await admin.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS }));

    const orientation = adminOrientationSchema.parse(await json(await admin.get('/api/v1/admin/ielts-orientation')));
    if (!orientation.currentPublishedVersion) {
      await publish(admin, '/api/v1/admin/ielts-orientation', orientation.draftRevision);
    }

    const bridge = (await json(await admin.get('/api/v1/admin/ielts-bridge/modules')) as unknown[])
      .map((row) => adminIeltsBridgeModuleSchema.parse(row));
    expect(new Set(bridge.map((row) => row.draft.skill))).toEqual(new Set(['listening', 'reading', 'writing', 'speaking']));
    for (const module of bridge) {
      if (!module.currentPublishedVersion) {
        await publish(admin, `/api/v1/admin/ielts-bridge/modules/${module.id}`, module.draftRevision);
      }
    }

    const profiles = (await json(await admin.get('/api/v1/admin/ielts-integrated/profiles')) as unknown[])
      .map((row) => adminIeltsIntegratedProfileSchema.parse(row));
    expect(profiles.map((profile) => profile.durationMinutes)).toEqual([60, 90, 120, 150]);
    for (const profile of profiles) {
      if (!profile.currentPublishedVersion) {
        await publish(admin, `/api/v1/admin/ielts-integrated/profiles/${profile.id}`, profile.draftRevision);
      }
    }

    const band = adminIeltsBandCurriculumSchema.parse(await json(await admin.get('/api/v1/admin/ielts-band-curriculum')));
    expect(band.draft.stages).toHaveLength(7);
    if (!band.currentPublishedVersion) {
      await publish(admin, '/api/v1/admin/ielts-band-curriculum', band.draftRevision);
    }

    const mocks = await json(await admin.get('/api/v1/admin/ielts-mocks')) as { items: unknown[] };
    const mock = mocks.items.map((row) => adminIeltsMockSchema.parse(row)).find((row) => row.draft.variant === 'ACADEMIC');
    if (!mock) throw new Error('The isolated E2E seed must contain an Academic mock draft.');
    if (!mock.currentPublishedVersion) {
      const content = { ...structuredClone(mock.draft), title: 'E2E ONLY — synthetic media, catalog navigation fixture' };
      for (const [index, part] of content.listening.parts.entries()) {
        const body = syntheticWav(index);
        const storageKey = `e2e-only-ielts-beta/${randomUUID()}.wav`;
        await mkdir(path.join(dataDirectory, 'e2e-only-ielts-beta'), { recursive: true });
        await writeFile(path.join(dataDirectory, storageKey), body, { flag: 'wx' });
        const artifact = await database.audioArtifact.create({ data: {
          audioScriptSlug: `e2e-only-ielts-beta-part-${index + 1}`,
          scriptHash: createHash('sha256').update(`synthetic-tone-${index}`).digest('hex'),
          adapterName: 'e2e-only-synthetic-pcm',
          voiceConfig: { e2eOnly: true, synthetic: true, purpose: 'catalog-navigation-only; not speech or release content' },
          mimeType: 'audio/wav', byteSize: body.length,
          checksum: createHash('sha256').update(body).digest('hex'), storageKey, status: 'READY',
        } });
        part.audioAssetId = artifact.id;
      }
      const saved = adminIeltsMockSchema.parse(await json(await admin.put(`/api/v1/admin/ielts-mocks/${mock.id}/draft`, {
        data: { expectedRevision: mock.draftRevision, idempotencyKey: randomUUID(), content: ieltsMockContentSchema.parse(content) },
      })));
      await publish(admin, `/api/v1/admin/ielts-mocks/${mock.id}`, saved.draftRevision);
    }

    await database.learningProgram.update({ where: { slug: 'ielts' }, data: { availabilityStatus: 'BETA' } });
  } finally {
    await admin.dispose();
    await database.$disconnect();
  }
}
