import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('audio settings and immutable candidate schema', () => {
  const schemaName = `audio_settings_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL
    ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: url.toString() },
      timeout: 45_000,
    });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
    database = new PrismaClient({ datasourceUrl: url.toString() });
    await database.$connect();
  }, 50_000);

  afterAll(async () => {
    await database?.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
  });

  it('defaults new learner profiles to system-default audio', async () => {
    const learner = await database.user.create({
      data: {
        displayName: 'Audio learner',
        email: `audio-${randomUUID()}@example.com`,
        passwordHash: 'test-hash',
        profile: { create: {} },
      },
      include: { profile: true },
    });

    expect(learner.profile?.audioSourceId).toBe('system-default');
    expect(learner.profile?.browserVoiceId).toBeNull();
  });

  it('persists one non-secret system audio settings row', async () => {
    await database.audioSystemSetting.create({
      data: {
        defaultVoiceId: 'en-US-JennyNeural',
        id: 'default',
        providerId: 'azure-speech',
      },
    });

    await expect(database.audioSystemSetting.create({
      data: { id: 'default', providerId: 'fake-tts' },
    })).rejects.toMatchObject({ code: 'P2002' });
    await expect(database.audioSystemSetting.create({
      data: { id: 'another-row', providerId: 'fake-tts' },
    })).rejects.toThrow(/AudioSystemSetting_singleton_check/);
  });

  it('allows immutable candidates for one script but rejects a duplicate generation key', async () => {
    const adminUser = await database.user.create({
      data: {
        displayName: 'Content admin',
        email: `content-admin-${randomUUID()}@example.com`,
        passwordHash: 'test-hash',
        role: 'CONTENT_ADMIN',
      },
    });
    const contentImport = await database.contentImport.create({
      data: {
        createdById: adminUser.id,
        rawSource: 'CONTENT\nHello workplace',
        sourceHash: 'same-script-hash',
        updatedById: adminUser.id,
      },
    });
    const baseCandidate = {
      adapterName: 'azure-speech',
      audioScriptSlug: 'workplace-intro',
      byteSize: 1,
      checksum: 'checksum-a',
      contentImportId: contentImport.id,
      mimeType: 'audio/wav',
      scriptHash: 'same-script-hash',
      status: 'READY' as const,
      storageKey: 'audio/a.wav',
      variantKey: 'azure-speech:voice-a:default',
      voiceConfig: {},
    };
    const first = await database.audioArtifact.create({
      data: { ...baseCandidate, generationKey: `generation-${randomUUID()}` },
    });
    const second = await database.audioArtifact.create({
      data: {
        ...baseCandidate,
        checksum: 'checksum-b',
        generationKey: `generation-${randomUUID()}`,
        storageKey: 'audio/b.wav',
        variantKey: 'azure-speech:voice-b:default',
      },
    });

    expect(second.id).not.toBe(first.id);
    await expect(database.audioArtifact.create({
      data: {
        ...baseCandidate,
        generationKey: first.generationKey,
      },
    })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('installs candidate lookup and settings ownership indexes', async () => {
    const indexes = await database.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ${schemaName}
        AND indexname IN (
          'AudioArtifact_generationKey_key',
          'AudioArtifact_contentImportId_audioScriptSlug_scriptHash_idx',
          'AudioSystemSetting_updatedById_idx'
        );
    `;

    expect(new Set(indexes.map((row) => row.indexname))).toEqual(new Set([
      'AudioArtifact_contentImportId_audioScriptSlug_scriptHash_idx',
      'AudioArtifact_generationKey_key',
      'AudioSystemSetting_updatedById_idx',
    ]));
  });

  it('backfills legacy candidates without changing lesson-version references', async () => {
    const legacySchema = `audio_legacy_${randomUUID().replaceAll('-', '')}`;
    const url = new URL(baseUrl);
    url.searchParams.set('schema', legacySchema);
    const legacy = new PrismaClient({ datasourceUrl: url.toString() });
    const artifactId = randomUUID();
    const referenceId = randomUUID();

    try {
      await legacy.$executeRawUnsafe(`CREATE SCHEMA "${legacySchema}"`);
      const legacyStatements = [
        'CREATE TABLE "User" ("id" UUID PRIMARY KEY)',
        'CREATE TABLE "LearnerProfile" ("userId" UUID PRIMARY KEY)',
        `CREATE TABLE "AudioArtifact" (
          "id" UUID PRIMARY KEY,
          "contentImportId" UUID,
          "audioScriptSlug" TEXT NOT NULL,
          "scriptHash" TEXT NOT NULL,
          "adapterName" TEXT NOT NULL
        )`,
        `CREATE UNIQUE INDEX "AudioArtifact_contentImportId_audioScriptSlug_scriptHash_key"
          ON "AudioArtifact"("contentImportId", "audioScriptSlug", "scriptHash")`,
        `CREATE TABLE "LessonVersionAudioArtifact" (
          "id" UUID PRIMARY KEY,
          "audioArtifactId" UUID NOT NULL
        )`,
        `INSERT INTO "AudioArtifact" (
          "id", "audioScriptSlug", "scriptHash", "adapterName"
        ) VALUES (
          '${artifactId}', 'legacy-script', 'legacy-hash', 'fake-tts'
        )`,
        `INSERT INTO "LessonVersionAudioArtifact" ("id", "audioArtifactId")
          VALUES ('${referenceId}', '${artifactId}')`,
      ];
      for (const statement of legacyStatements) {
        await legacy.$executeRawUnsafe(statement);
      }

      const migrationSql = await readFile(path.resolve(
        __dirname,
        '../../prisma/migrations/20261010000100_audio_tts_settings/migration.sql',
      ), 'utf8');
      const statements = migrationSql
        .replaceAll(/^\s*--.*$/gm, '')
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean);
      for (const statement of statements) {
        await legacy.$executeRawUnsafe(statement);
      }

      const [artifact] = await legacy.$queryRawUnsafe<Array<{
        generationKey: string;
        variantKey: string;
      }>>(`SELECT "generationKey", "variantKey" FROM "AudioArtifact" WHERE "id" = '${artifactId}'`);
      const [reference] = await legacy.$queryRawUnsafe<Array<{ audioArtifactId: string }>>(
        `SELECT "audioArtifactId" FROM "LessonVersionAudioArtifact" WHERE "id" = '${referenceId}'`,
      );

      expect(artifact).toEqual({
        generationKey: `legacy:${artifactId}`,
        variantKey: 'legacy:fake-tts',
      });
      expect(reference?.audioArtifactId).toBe(artifactId);
    } finally {
      await legacy.$disconnect();
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${legacySchema}" CASCADE`);
    }
  });
});
