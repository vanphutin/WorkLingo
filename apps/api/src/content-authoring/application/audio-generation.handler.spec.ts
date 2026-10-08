import { createHash } from 'node:crypto';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { TextToSpeechPort } from '../../ai-gateway/domain/text-to-speech.port.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import type { JobHandlerRegistry } from '../../jobs/application/job-runner.service.js';
import { describe, expect, it, vi } from 'vitest';

import { AudioGenerationHandler } from './audio-generation.handler.js';

const source = `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: tts-handler
title: TTS handler
level: foundation
duration_minutes: 60
objective: Test TTS

[AUDIO_SCRIPT call]
speaker: customer
script:
<<<
Hello from support.
>>>
[/AUDIO_SCRIPT]
`;

describe('AudioGenerationHandler', () => {
  it('stores selected-provider metadata and returns a safe job result', async () => {
    const scriptHash = createHash('sha256').update('Hello from support.').digest('hex');
    const update = vi.fn().mockResolvedValue({ id: 'artifact-id', status: 'READY' });
    const database = {
      contentImport: { findUnique: vi.fn().mockResolvedValue({ rawSource: source }) },
      audioArtifact: { update, updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as PrismaService;
    const storage = {
      put: vi.fn().mockResolvedValue({ key: 'generated-audio/id', size: 48 }),
    } as unknown as ObjectStorage;
    const tts = {
      providerName: 'microsoft-tts',
      synthesize: vi.fn().mockResolvedValue({
        audioBytes: Buffer.alloc(48), checksum: 'checksum', durationSeconds: 1,
        mimeType: 'audio/wav', sampleRate: 24_000,
        provider: { name: 'microsoft-tts', requestId: 'request-id', voice: 'en-US-JennyNeural' },
      }),
    } as unknown as TextToSpeechPort;
    const handler = new AudioGenerationHandler(
      database, storage, tts, { register: vi.fn() } as unknown as JobHandlerRegistry,
    );

    await expect(handler.handle({
      attemptNumber: 1, id: 'job', maxAttempts: 3, type: 'GENERATE_AUDIO',
      payload: {
        audioScriptSlug: 'call', contentImportId: '00000000-0000-4000-8000-000000000001',
        scriptHash, voiceConfig: {},
      },
    })).resolves.toEqual({ artifactId: 'artifact-id', status: 'READY' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      adapterName: 'microsoft-tts', status: 'READY',
      voiceConfig: { voice: 'en-US-JennyNeural' },
    }) }));
  });
});
