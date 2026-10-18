import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextToSpeechProviderRegistry, buildTextToSpeechProviderRegistrations,
  TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS } from '../../ai-gateway/application/text-to-speech-provider.registry.js';
import { TextToSpeechPort } from '../../ai-gateway/domain/text-to-speech.port.js';
import { FakeTextToSpeechAdapter } from '../../ai-gateway/infrastructure/fake-tts.adapter.js';
import { MicrosoftTextToSpeechAdapter } from '../../ai-gateway/infrastructure/microsoft-tts.adapter.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { JobHandlerRegistry } from '../../jobs/application/job-runner.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { AudioGenerationHandler } from './audio-generation.handler.js';
import { AudioGenerationService } from './audio-generation.service.js';

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

const scriptSource = (script: string) => `FORMAT: WorkLingoLesson/1.0
[LESSON]
slug: dialogue-audio
title: Dialogue audio
level: foundation
duration_minutes: 60
objective: Test dialogue
[AUDIO_SCRIPT call]
script:
<<<
${script}
>>>
[/AUDIO_SCRIPT]`;

async function setup(script: string) {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      requests.push(Buffer.concat(chunks).toString('utf8'));
      const wav = Buffer.alloc(48);
      wav.write('RIFF', 0); wav.writeUInt32LE(40, 4); wav.write('WAVE', 8);
      wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
      wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24_000, 24); wav.writeUInt32LE(48_000, 28);
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(4, 40);
      response.end(wav);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const adapter = new MicrosoftTextToSpeechAdapter({
    endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    key: 'local-test-only', region: 'test', timeoutMs: 2_000, voice: 'en-US-JennyNeural',
  });
  const database = {
    contentImport: { findUnique: vi.fn().mockResolvedValue({ rawSource: scriptSource(script) }) },
    mutationReceipt: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    audioArtifact: {
      create: vi.fn().mockResolvedValue({}),
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000002' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    job: { create: vi.fn().mockResolvedValue({ id: 'job', status: 'PENDING' }), update: vi.fn().mockResolvedValue({}) },
  };
  Object.assign(database, { $transaction: vi.fn((work) => work(database)) });
  const storage = { put: vi.fn().mockResolvedValue({ key: 'generated-audio/id', size: 48 }) };
  const module = await Test.createTestingModule({
    providers: [
      AudioGenerationService, AudioGenerationHandler, TextToSpeechProviderRegistry,
      { provide: TextToSpeechPort, useValue: adapter },
      { provide: PrismaService, useValue: database },
      { provide: ObjectStorage, useValue: storage },
      { provide: JobHandlerRegistry, useValue: { register: vi.fn() } },
      { provide: TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS, useValue: buildTextToSpeechProviderRegistrations({
        azureProvider: adapter, azureVoiceId: 'en-US-JennyNeural', fakeProvider: new FakeTextToSpeechAdapter(),
      }) },
    ],
  }).compile();
  return { requests, database, storage, module };
}

const importId = '00000000-0000-4000-8000-000000000001';
async function execute(context: Awaited<ReturnType<typeof setup>>, path: 'direct' | 'background', script: string) {
  if (path === 'direct') {
    const service = context.module.get(AudioGenerationService);
    const result = await service.generateAudio(importId, 'actor', {
      audioScriptSlug: 'call', idempotencyKey: 'dialogue-generation', providerId: 'azure-speech',
    });
    await service.waitForJob(result.jobId);
  } else {
    await context.module.get(AudioGenerationHandler).handle({
      id: 'job', type: 'GENERATE_AUDIO', attemptNumber: 1, maxAttempts: 3,
      payload: {
        artifactId: '00000000-0000-4000-8000-000000000002', contentImportId: importId,
        audioScriptSlug: 'call', providerId: 'azure-speech', voiceId: 'en-US-JennyNeural',
        voiceConfig: { generationVersion: 'azure-dialogue-v1', voice: 'en-US-JennyNeural' },
        scriptHash: createHash('sha256').update(script).digest('hex'), variantKey: 'azure-dialogue-test',
      },
    });
  }
}

describe.each(['direct', 'background'] as const)('Azure dialogue generation (%s)', (path) => {
  it('stores the actual ordered SSML speaker assignments on the mutable candidate', async () => {
    const script = 'An (male): Hi, Lan & team.\nLan (female): Hello, An.\nAn: Bye.';
    const context = await setup(script);
    try {
      await execute(context, path, script);
      expect(context.requests).toEqual(['<speak version="1.0" xml:lang="en-US">'
        + '<voice name="en-US-GuyNeural">Hi, Lan &amp; team.</voice>'
        + '<voice name="en-US-JennyNeural">Hello, An.</voice>'
        + '<voice name="en-US-GuyNeural">Bye.</voice></speak>']);
      expect(context.database.audioArtifact.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'GENERATING' }),
        data: expect.objectContaining({ status: 'READY', voiceConfig: {
          generationVersion: 'azure-dialogue-v1', voice: 'en-US-JennyNeural',
          speakerVoices: [
            { speaker: 'an', name: 'An', gender: 'male', voice: 'en-US-GuyNeural', voiceGender: 'male' },
            { speaker: 'lan', name: 'Lan', gender: 'female', voice: 'en-US-JennyNeural', voiceGender: 'female' },
          ],
        } }),
      });
    } finally { await context.module.close(); }
  });

  it('fails invalid dialogue without HTTP synthesis or storing generated bytes', async () => {
    const script = 'An: Hi.\nBinh: Hello.\nLan: Good morning.';
    const context = await setup(script);
    try {
      if (path === 'background') await expect(execute(context, path, script)).rejects.toThrow(/dialogue/iu);
      else await execute(context, path, script);
      expect(context.requests).toEqual([]);
      expect(context.storage.put).not.toHaveBeenCalled();
      expect(context.database.audioArtifact.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'GENERATING' }),
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    } finally { await context.module.close(); }
  });
});
