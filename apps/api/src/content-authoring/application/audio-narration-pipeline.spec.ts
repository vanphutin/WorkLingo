import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { audioScriptFingerprintText, narrationReviewInput, parseLessonSource, setAudioNarration } from '@worklingo/content-format';
import { AudioGenerationHandler } from './audio-generation.handler.js';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import type { TextToSpeechProviderRegistry } from '../../ai-gateway/application/text-to-speech-provider.registry.js';
import type { JobHandlerRegistry } from '../../jobs/application/job-runner.service.js';

const source = `FORMAT: WorkLingoLesson/1.0\n[AUDIO_SCRIPT call]\nscript:\n<<<\nFrom: May\nTo: Team\n\nHello team.\n>>>\n[/AUDIO_SCRIPT]\n`;
function reviewed(text = 'Hello team.') {
  const unsigned = setAudioNarration(source, 'call', text);
  const doc = parseLessonSource(unsigned).document;
  return setAudioNarration(unsigned, 'call', text, createHash('sha256').update(narrationReviewInput(doc, doc.audioScripts[0]!)).digest('hex'));
}
function setup(initial: string, latest = initial) {
  const synthesize = vi.fn().mockResolvedValue({ audioBytes: Buffer.alloc(48), checksum: 'checksum', mimeType: 'audio/wav' });
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const db = { contentImport: { findUnique: vi.fn().mockResolvedValueOnce({ rawSource: initial }).mockResolvedValue({ rawSource: latest }) },
    audioArtifact: { findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'artifact' }), updateMany } };
  const handler = new AudioGenerationHandler(db as unknown as PrismaService,
    { put: vi.fn().mockResolvedValue({ key: 'audio', size: 48 }) } as unknown as ObjectStorage,
    { assertVoiceSupported: vi.fn(), resolve: () => ({ providerName: 'fake-tts', synthesize }) } as unknown as TextToSpeechProviderRegistry,
    { register: vi.fn() } as unknown as JobHandlerRegistry);
  const script = parseLessonSource(initial).document.audioScripts[0]!;
  const job = { id: 'job', attemptNumber: 1, maxAttempts: 1, type: 'GENERATE_AUDIO', payload: {
    artifactId: '00000000-0000-4000-8000-000000000002', contentImportId: '00000000-0000-4000-8000-000000000001',
    audioScriptSlug: 'call', scriptHash: createHash('sha256').update(audioScriptFingerprintText(script)).digest('hex'),
    providerId: 'fake-tts', voiceId: 'fake-neutral', variantKey: 'fake', voiceConfig: {},
  } };
  return { handler, job, synthesize, updateMany };
}
describe('narration synthesis pipeline', () => {
  it('synthesizes only reviewed speech, not email headers', async () => {
    const { handler, job, synthesize } = setup(reviewed());
    expect(await handler.handle(job)).toEqual({ artifactId: 'artifact', status: 'READY' });
    expect(synthesize).toHaveBeenCalledWith(expect.objectContaining({ script: 'Hello team.' }));
  });
  it('marks generated output stale if narration changes during synthesis', async () => {
    const { handler, job } = setup(reviewed(), reviewed('Hello everyone.'));
    expect(await handler.handle(job)).toEqual({ artifactId: 'artifact', status: 'STALE' });
  });
});
