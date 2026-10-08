import { describe, expect, it } from 'vitest';
import { FakeTextToSpeechAdapter } from './fake-tts.adapter.js';

describe('FakeTextToSpeechAdapter', () => {
  const adapter = new FakeTextToSpeechAdapter();

  it('produces deterministic WAV bytes with provider metadata', async () => {
    const input = { script: 'Hello, this is customer support.', voiceConfig: { voice: 'fake-neutral' } };
    const first = await adapter.synthesize(input);
    const second = await adapter.synthesize(input);
    expect(first.audioBytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(first.checksum).toBe(second.checksum);
    expect(first.provider).toEqual({ name: 'fake-tts', requestId: null, voice: 'fake-neutral' });
  });

  it('rejects empty and oversized scripts', async () => {
    await expect(adapter.synthesize({ script: ' ' })).rejects.toThrow(/empty/i);
    await expect(adapter.synthesize({ script: 'A'.repeat(10_001) })).rejects.toThrow(/maximum/i);
  });
});
