import { describe, expect, it, vi } from 'vitest';

import {
  SUPPORTED_RECORDING_MIME_TYPES,
  validateAudioUpload,
  validateRecordingConsent,
} from './audio-upload-policy.js';

const webmOpus = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('OpusHead')]);
const oggOpus = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(16), Buffer.from('OpusHead')]);
const wavPcm = (() => {
  const value = Buffer.alloc(44);
  value.write('RIFF', 0); value.write('WAVE', 8); value.writeUInt16LE(1, 20);
  return value;
})();

describe('recording upload policy', () => {
  it('exports the browser/provider-compatible allowlist', () => {
    expect(SUPPORTED_RECORDING_MIME_TYPES).toEqual([
      'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/wav',
    ]);
  });

  it.each([
    ['audio/webm;codecs=opus', webmOpus, 'webm-opus'],
    ['audio/ogg;codecs=opus', oggOpus, 'ogg-opus'],
    ['audio/wav', wavPcm, 'wav-pcm'],
  ] as const)('accepts signed %s audio within duration', async (mimeType, body, format) => {
    const readDuration = vi.fn().mockResolvedValue(42);
    await expect(validateAudioUpload(
      { body, mimeType },
      { maxBytes: 10 * 1024 * 1024, maxDurationSeconds: 120 },
      readDuration,
    )).resolves.toEqual({ durationSeconds: 42, format });
  });

  it.each([
    [{ body: Buffer.alloc(0), mimeType: 'audio/webm' }, 'AUDIO_EMPTY'],
    [{ body: Buffer.alloc(1025), mimeType: 'audio/webm' }, 'AUDIO_TOO_LARGE'],
    [{ body: Buffer.from('ftypisom'), mimeType: 'audio/mp4' }, 'AUDIO_TYPE_UNSUPPORTED'],
    [{ body: Buffer.from('not webm'), mimeType: 'audio/webm;codecs=opus' }, 'AUDIO_SIGNATURE_INVALID'],
  ] as const)('rejects invalid upload %# before metadata parsing', async (file, code) => {
    const readDuration = vi.fn();
    await expect(validateAudioUpload(
      file,
      { maxBytes: 1024, maxDurationSeconds: 120 },
      readDuration,
    )).rejects.toMatchObject({ code });
    expect(readDuration).not.toHaveBeenCalled();
  });

  it('rejects audio longer than two minutes', async () => {
    await expect(validateAudioUpload(
      { body: webmOpus, mimeType: 'audio/webm' },
      { maxBytes: 1024, maxDurationSeconds: 120 },
      async () => 120.01,
    )).rejects.toMatchObject({ code: 'AUDIO_TOO_LONG' });
  });

  it('requires explicit, versioned consent', () => {
    expect(() => validateRecordingConsent({ accepted: false, policyVersion: 'recording-v1', scope: 'teacher-ai' }))
      .toThrow(expect.objectContaining({ code: 'RECORDING_CONSENT_REQUIRED' }));
    expect(() => validateRecordingConsent({ accepted: true, policyVersion: '', scope: 'teacher-ai' }))
      .toThrow(expect.objectContaining({ code: 'RECORDING_CONSENT_REQUIRED' }));
    expect(validateRecordingConsent({ accepted: true, policyVersion: 'recording-v1', scope: 'teacher-ai' }))
      .toEqual({ policyVersion: 'recording-v1', scope: 'teacher-ai' });
  });
});
