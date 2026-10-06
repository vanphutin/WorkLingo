import { describe, expect, it } from 'vitest';
import { FakeTextToSpeechAdapter } from './fake-tts.adapter.js';

describe('FakeTextToSpeechAdapter', () => {
  const adapter = new FakeTextToSpeechAdapter();

  it('produces identical valid audio/wav bytes and checksum for identical script and voice', async () => {
    const input = {
      script: 'Hello, this is a customer service call.',
      voiceConfig: { voiceId: 'en-US-standard-A', pitch: 1.0 },
      speaker: 'customer',
    };

    const first = await adapter.synthesize(input);
    const second = await adapter.synthesize(input);

    expect(first.mimeType).toBe('audio/wav');
    expect(first.sampleRate).toBe(16000);
    expect(first.checksum).toBe(second.checksum);
    expect(first.audioBytes.equals(second.audioBytes)).toBe(true);

    // Verify WAV RIFF header
    expect(first.audioBytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(first.audioBytes.subarray(8, 12).toString('ascii')).toBe('WAVE');
    expect(first.audioBytes.subarray(12, 16).toString('ascii')).toBe('fmt ');
    // PCM format code is 1 at offset 20 (2 bytes little-endian)
    expect(first.audioBytes.readUInt16LE(20)).toBe(1);
    // Channels is 1 (mono) at offset 22
    expect(first.audioBytes.readUInt16LE(22)).toBe(1);
    // Sample rate is 16000 at offset 24
    expect(first.audioBytes.readUInt32LE(24)).toBe(16000);
  });

  it('changes checksum and bytes when script changes', async () => {
    const first = await adapter.synthesize({
      script: 'Hello, this is script A.',
    });
    const second = await adapter.synthesize({
      script: 'Hello, this is script B with different content.',
    });

    expect(first.checksum).not.toBe(second.checksum);
    expect(first.audioBytes.equals(second.audioBytes)).toBe(false);
  });

  it('rejects empty script before generation', async () => {
    await expect(adapter.synthesize({ script: '' })).rejects.toThrow(
      /empty/i,
    );
    await expect(adapter.synthesize({ script: '   ' })).rejects.toThrow(
      /empty/i,
    );
  });

  it('rejects oversized script before generation', async () => {
    const oversized = 'A'.repeat(10_001);
    await expect(adapter.synthesize({ script: oversized })).rejects.toThrow(
      /maximum length/i,
    );
  });
});
