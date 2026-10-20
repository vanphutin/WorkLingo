import { createHash, randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ContentAuthoringErrorCode } from '@worklingo/contracts';

import type { PrismaService } from '../../common/database/prisma.service.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import type { TextToSpeechPort } from '../../ai-gateway/domain/text-to-speech.port.js';
import type { TextToSpeechProviderRegistry } from '../../ai-gateway/application/text-to-speech-provider.registry.js';
import type { JobRunnerService } from '../../jobs/application/job-runner.service.js';
import type { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import { AudioGenerationService } from './audio-generation.service.js';

const registryFor = (provider: TextToSpeechPort): TextToSpeechProviderRegistry => ({
  assertVoiceSupported: vi.fn(),
  list: vi.fn().mockReturnValue([{
    available: true,
    defaultVoiceId: 'fake-neutral',
    displayName: 'Simulation audio',
    id: 'fake-tts',
    releaseQuality: false,
    supportedVoiceIds: ['fake-neutral'],
  }]),
  resolve: vi.fn().mockReturnValue(provider),
} as unknown as TextToSpeechProviderRegistry);

describe('AudioGenerationService', () => {
  const actorId = randomUUID();
  const importId = randomUUID();
  const audioScriptSlug = 'complaint-call';

  const scriptA = 'Hello, this is script A for complaint call.';
  const hashA = createHash('sha256').update(scriptA).digest('hex');

  const lessonSourceWithScriptA = `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: test-lesson
title: Test Lesson
level: foundation
duration_minutes: 60
objective: Test

[AUDIO_SCRIPT ${audioScriptSlug}]
speaker: customer
script:
<<<
${scriptA}
>>>
[/AUDIO_SCRIPT]
`;

  it('runs MISSING -> GENERATING -> READY lifecycle and stores under generated-audio/ prefix', async () => {
    const artifactId = randomUUID();
    const jobId = randomUUID();

    let artifactStatus = 'MISSING';
    const fakeAudioBytes = Buffer.from('FAKE WAV BYTES');
    const fakeChecksum = createHash('sha256').update(fakeAudioBytes).digest('hex');

    const contentImportRecord = {
      id: importId,
      rawSource: lessonSourceWithScriptA,
      status: 'VALIDATED',
      draftRevision: 1,
    };

    const database = {
      contentImport: {
        findUnique: vi.fn().mockResolvedValue(contentImportRecord),
      },
      mutationReceipt: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: randomUUID() }),
      },
      audioArtifact: {
        create: vi.fn().mockImplementation(async () => {
          artifactStatus = 'GENERATING';
          return { id: artifactId, status: artifactStatus };
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: artifactId }),
        findUnique: vi.fn().mockImplementation(() => null),
        upsert: vi.fn().mockImplementation(async () => {
          artifactStatus = 'GENERATING';
          return {
            id: artifactId,
            contentImportId: importId,
            audioScriptSlug,
            scriptHash: hashA,
            status: artifactStatus,
            storageKey: '',
          };
        }),
        update: vi.fn().mockImplementation(async ({ data }) => {
          artifactStatus = data.status;
          return {
            id: artifactId,
            status: artifactStatus,
            ...data,
          };
        }),
        updateMany: vi.fn().mockImplementation(async ({ data }) => {
          artifactStatus = data.status;
          return { count: 1 };
        }),
      },
      job: {
        create: vi.fn().mockResolvedValue({ id: jobId, status: 'PENDING' }),
        update: vi.fn().mockResolvedValue({ id: jobId, status: 'COMPLETED' }),
      },
    } as unknown as PrismaService;

    const storage = {
      put: vi.fn().mockResolvedValue({
        key: `generated-audio/${randomUUID()}`,
        contentType: 'audio/wav',
        size: fakeAudioBytes.length,
      }),
    } as unknown as ObjectStorage;

    const tts = {
      synthesize: vi.fn().mockResolvedValue({
        mimeType: 'audio/wav',
        audioBytes: fakeAudioBytes,
        checksum: fakeChecksum,
        sampleRate: 16000,
        durationSeconds: 3,
      }),
    } as unknown as TextToSpeechPort;

    Object.assign(database, { $transaction: vi.fn((work) => work(database)) });
    const service = new AudioGenerationService(database, storage, tts, registryFor(tts));

    const result = await service.generateAudio(importId, actorId, {
      audioScriptSlug,
      idempotencyKey: 'idemp-key-1',
    });

    expect(result.jobId).toBe(jobId);
    expect(result.status).toBe('PENDING');

    // Wait for in-process async job to complete
    await service.waitForJob(jobId);

    expect(storage.put).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: 'generated-audio',
        contentType: 'audio/wav',
      }),
    );
    expect(artifactStatus).toBe('READY');
  });

  it('versions Azure candidates and persists actual assignments in the direct execution path', async () => {
    const database = {
      contentImport: { findUnique: vi.fn().mockResolvedValue({ rawSource: lessonSourceWithScriptA }) },
      mutationReceipt: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      audioArtifact: { create: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      job: { create: vi.fn().mockResolvedValue({ id: 'direct-job', status: 'PENDING' }), update: vi.fn().mockResolvedValue({}) },
    };
    Object.assign(database, { $transaction: vi.fn((work) => work(database)) });
    const tts = {
      providerName: 'azure-speech',
      synthesize: vi.fn().mockResolvedValue({
        mimeType: 'audio/wav', audioBytes: Buffer.alloc(48), checksum: 'checksum', sampleRate: 24_000, durationSeconds: 1,
        provider: {
          name: 'azure-speech', requestId: null, voice: 'en-US-JennyNeural',
          speakerVoices: [{ speaker: 'an', name: 'An', gender: null, voice: 'en-US-GuyNeural', voiceGender: 'male' }],
        },
      }),
    } as unknown as TextToSpeechPort;
    const service = new AudioGenerationService(
      database as unknown as PrismaService,
      { put: vi.fn().mockResolvedValue({ key: 'generated-audio/id', size: 48 }) } as unknown as ObjectStorage,
      tts, registryFor(tts),
    );

    await service.generateAudio(importId, actorId, {
      audioScriptSlug, idempotencyKey: 'azure-version', providerId: 'azure-speech', voiceId: 'en-US-JennyNeural',
      voiceConfig: { generationVersion: 'old', speakerVoices: [{ voice: 'forged' }] },
    });
    await service.waitForJob('direct-job');

    expect(database.audioArtifact.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      voiceConfig: { generationVersion: 'azure-dialogue-v1', voice: 'en-US-JennyNeural' },
    }) });
    const oldVariant = `azure-speech:en-US-JennyNeural:${createHash('sha256')
      .update(JSON.stringify({ voice: 'en-US-JennyNeural' })).digest('hex')}`;
    expect(database.audioArtifact.create.mock.calls[0]![0].data.variantKey).not.toBe(oldVariant);
    expect(database.audioArtifact.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: 'GENERATING' }),
      data: expect.objectContaining({
        status: 'READY',
        voiceConfig: {
          generationVersion: 'azure-dialogue-v1', voice: 'en-US-JennyNeural',
          speakerVoices: [{ speaker: 'an', name: 'An', gender: null, voice: 'en-US-GuyNeural', voiceGender: 'male' }],
        },
      }),
    });
    expect(database.job.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      payload: expect.objectContaining({ voiceConfig: { generationVersion: 'azure-dialogue-v1', voice: 'en-US-JennyNeural' } }),
    }) });
  });

  it('handles idempotency replay and detects key reuse conflict', async () => {
    const existingReceipt = {
      id: randomUUID(),
      actorId,
      operation: 'generate-audio',
      idempotencyKey: 'same-key',
      requestHash: createHash('sha256')
        .update(JSON.stringify({
          audioScriptSlug,
          contentImportId: importId,
          idempotencyKey: 'same-key',
          providerId: 'fake-tts',
          voiceConfig: { voice: 'fake-neutral' },
          voiceId: 'fake-neutral',
        }))
        .digest('hex'),
      responseStatus: 202,
      responseBody: { jobId: 'existing-job-id', status: 'PENDING' },
    };

    const database = {
      mutationReceipt: {
        findUnique: vi.fn().mockResolvedValue(existingReceipt),
      },
    } as unknown as PrismaService;

    const service = new AudioGenerationService(
      database,
      {} as ObjectStorage,
      { providerName: 'fake-tts' } as TextToSpeechPort,
      registryFor({ providerName: 'fake-tts' } as TextToSpeechPort),
    );

    // 1. Same key and same request returns identical cached response
    const replayed = await service.generateAudio(importId, actorId, {
      audioScriptSlug,
      idempotencyKey: 'same-key',
    });
    expect(replayed).toEqual(existingReceipt.responseBody);

    // 2. Same key but different request payload throws 409 IDEMPOTENCY_KEY_REUSED
    await expect(
      service.generateAudio(importId, actorId, {
        audioScriptSlug: 'different-slug',
        idempotencyKey: 'same-key',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
        statusCode: 409,
      }),
    });
  });

  it('does not replay an Azure receipt made before dialogue configuration versioning', async () => {
    const database = {
      mutationReceipt: { findUnique: vi.fn().mockResolvedValue({
        requestHash: createHash('sha256').update(JSON.stringify({
          audioScriptSlug, contentImportId: importId, idempotencyKey: 'old-azure', providerId: 'azure-speech',
          voiceConfig: { voice: 'en-US-JennyNeural' }, voiceId: 'en-US-JennyNeural',
        })).digest('hex'),
        responseBody: { jobId: 'old-single-voice-job', status: 'COMPLETED' },
      }) },
    } as unknown as PrismaService;
    const tts = { providerName: 'azure-speech' } as TextToSpeechPort;
    const service = new AudioGenerationService(database, {} as ObjectStorage, tts, registryFor(tts));

    await expect(service.generateAudio(importId, actorId, {
      audioScriptSlug, idempotencyKey: 'old-azure', providerId: 'azure-speech', voiceId: 'en-US-JennyNeural',
    })).rejects.toMatchObject({ response: expect.objectContaining({
      code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
    }) });
  });

  it('marks artifact STALE when out-of-order completion occurs after source was edited', async () => {
    const artifactId = randomUUID();
    const jobId = randomUUID();

    const scriptB = 'Hello, this is script B after author edited the lesson.';

    const lessonSourceWithScriptB = `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: test-lesson
title: Test Lesson
level: foundation
duration_minutes: 60
objective: Test

[AUDIO_SCRIPT ${audioScriptSlug}]
speaker: customer
script:
<<<
${scriptB}
>>>
[/AUDIO_SCRIPT]
`;

    let finalArtifactStatus = 'UNKNOWN';

    // When generation started, source had script A.
    // But when job finishes and reads fresh source from DB, source has script B!
    const database = {
      contentImport: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: importId,
            rawSource: lessonSourceWithScriptA,
            status: 'DRAFT',
            draftRevision: 1,
          })
          .mockResolvedValueOnce({
            id: importId,
            rawSource: lessonSourceWithScriptB,
            status: 'DRAFT',
            draftRevision: 2,
          }),
      },
      mutationReceipt: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: randomUUID() }),
      },
      audioArtifact: {
        create: vi.fn().mockResolvedValue({ id: artifactId, status: 'GENERATING' }),
        findFirst: vi.fn().mockResolvedValue(null),
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: artifactId }),
        upsert: vi.fn().mockResolvedValue({
          id: artifactId,
          contentImportId: importId,
          audioScriptSlug,
          scriptHash: hashA,
          status: 'GENERATING',
        }),
        update: vi.fn().mockImplementation(async ({ data }) => {
          finalArtifactStatus = data.status;
          return { id: artifactId, ...data };
        }),
        updateMany: vi.fn().mockImplementation(async ({ data }) => {
          finalArtifactStatus = data.status;
          return { count: 1 };
        }),
      },
      job: {
        create: vi.fn().mockResolvedValue({ id: jobId, status: 'PENDING' }),
        update: vi.fn().mockResolvedValue({ id: jobId, status: 'COMPLETED' }),
      },
    } as unknown as PrismaService;

    const storage = {
      put: vi.fn().mockResolvedValue({
        key: `generated-audio/${randomUUID()}`,
        contentType: 'audio/wav',
        size: 100,
      }),
    } as unknown as ObjectStorage;

    const tts = {
      synthesize: vi.fn().mockResolvedValue({
        mimeType: 'audio/wav',
        audioBytes: Buffer.from('AUDIO'),
        checksum: 'checksum-a',
        sampleRate: 16000,
        durationSeconds: 2,
      }),
    } as unknown as TextToSpeechPort;

    Object.assign(database, { $transaction: vi.fn((work) => work(database)) });
    const service = new AudioGenerationService(database, storage, tts, registryFor(tts));

    await service.generateAudio(importId, actorId, {
      audioScriptSlug,
      idempotencyKey: 'out-of-order-key',
    });

    await service.waitForJob(jobId);

    // Because script hash changed from A to B before completion, artifact A MUST be marked STALE!
    expect(finalArtifactStatus).toBe('STALE');
  });

  it('marks artifact FAILED when synthesis throws error', async () => {
    const artifactId = randomUUID();
    const jobId = randomUUID();
    let artifactStatus = 'UNKNOWN';

    const database = {
      contentImport: {
        findUnique: vi.fn().mockResolvedValue({
          id: importId,
          rawSource: lessonSourceWithScriptA,
          status: 'DRAFT',
          draftRevision: 1,
        }),
      },
      mutationReceipt: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: randomUUID() }),
      },
      audioArtifact: {
        create: vi.fn().mockResolvedValue({ id: artifactId, status: 'GENERATING' }),
        findFirst: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({
          id: artifactId,
          contentImportId: importId,
          audioScriptSlug,
          scriptHash: hashA,
          status: 'GENERATING',
        }),
        update: vi.fn().mockImplementation(async ({ data }) => {
          artifactStatus = data.status;
          return { id: artifactId, ...data };
        }),
        updateMany: vi.fn().mockImplementation(async ({ data }) => {
          artifactStatus = data.status;
          return { count: 1 };
        }),
      },
      job: {
        create: vi.fn().mockResolvedValue({ id: jobId, status: 'PENDING' }),
        update: vi.fn().mockResolvedValue({ id: jobId, status: 'FAILED' }),
      },
    } as unknown as PrismaService;

    const storage = {} as ObjectStorage;
    const tts = {
      synthesize: vi.fn().mockRejectedValue(new Error('TTS provider synthesis error')),
    } as unknown as TextToSpeechPort;

    Object.assign(database, { $transaction: vi.fn((work) => work(database)) });
    const service = new AudioGenerationService(database, storage, tts, registryFor(tts));

    await service.generateAudio(importId, actorId, {
      audioScriptSlug,
      idempotencyKey: 'fail-key',
    });

    await service.waitForJob(jobId);

    expect(artifactStatus).toBe('FAILED');
  });

  it('waits for active durable audio work before application shutdown completes', async () => {
    let finishLookup!: (value: { status: 'COMPLETED' }) => void;
    const lookup = new Promise<{ status: 'COMPLETED' }>((resolve) => {
      finishLookup = resolve;
    });
    const jobId = randomUUID();
    const database = {
      audioArtifact: {
        create: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      contentImport: {
        findUnique: vi.fn().mockResolvedValue({ rawSource: lessonSourceWithScriptA }),
      },
      job: { findUnique: vi.fn().mockReturnValue(lookup) },
      mutationReceipt: {
        create: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const jobs = {
      enqueue: vi.fn().mockResolvedValue({ id: jobId, status: 'PENDING', type: 'GENERATE_AUDIO' }),
    } as unknown as JobDispatcher;
    const runner = { runOnce: vi.fn() } as unknown as JobRunnerService;
    Object.assign(database, { $transaction: vi.fn((work) => work(database)) });
    const service = new AudioGenerationService(
      database,
      {} as ObjectStorage,
      { providerName: 'fake-tts' } as TextToSpeechPort,
      registryFor({ providerName: 'fake-tts' } as TextToSpeechPort),
      jobs,
      runner,
    );

    await service.generateAudio(importId, actorId, {
      audioScriptSlug,
      idempotencyKey: 'shutdown-drain',
    });
    let shutdownComplete = false;
    const shutdown = service.onApplicationShutdown().then(() => {
      shutdownComplete = true;
    });
    await Promise.resolve();
    expect(shutdownComplete).toBe(false);

    finishLookup({ status: 'COMPLETED' });
    await shutdown;
    expect(shutdownComplete).toBe(true);
  });
});
