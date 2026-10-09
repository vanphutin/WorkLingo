import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import {
  TextToSpeechPort,
  type SynthesizeAudioInput,
  type SynthesizedAudio,
} from '../domain/text-to-speech.port.js';

export const SIMULATION_AUDIO_LABEL =
  'Simulation audio — not a release voice';

@Injectable()
export class FakeTextToSpeechAdapter extends TextToSpeechPort {
  readonly providerName = 'fake-tts';

  async synthesize(input: SynthesizeAudioInput): Promise<SynthesizedAudio> {
    const rawScript = input.script;
    if (!rawScript || rawScript.trim().length === 0) throw new Error('Script cannot be empty');
    if (rawScript.length > 10_000) {
      throw new Error('Script exceeds maximum length of 10,000 characters');
    }
    const voiceConfig = input.voiceConfig ?? {};
    const voice = typeof voiceConfig.voice === 'string' ? voiceConfig.voice : 'fake-neutral';
    const seedHash = createHash('sha256')
      .update(rawScript)
      .update(JSON.stringify(voiceConfig))
      .digest('hex');
    const sampleRate = 16_000;
    const words = rawScript.trim().split(/\s+/).length;
    const durationSeconds = Math.max(1, Math.min(10, Math.ceil(words * 0.3)));
    const totalSamples = durationSeconds * sampleRate;
    const dataSize = totalSamples * 2;
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0, 'ascii');
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8, 'ascii');
    buffer.write('fmt ', 12, 'ascii');
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36, 'ascii');
    buffer.writeUInt32LE(dataSize, 40);
    const baseFreq = 220 + (Number.parseInt(seedHash.slice(0, 4), 16) % 220);
    for (let index = 0, offset = 44; index < totalSamples; index += 1, offset += 2) {
      const envelope = Math.sin((Math.PI * index) / totalSamples);
      const sample = Math.round(
        Math.sin(2 * Math.PI * baseFreq * (index / sampleRate)) * 8_000 * envelope,
      );
      buffer.writeInt16LE(Math.max(-32_768, Math.min(32_767, sample)), offset);
    }
    return {
      audioBytes: buffer,
      checksum: createHash('sha256').update(buffer).digest('hex'),
      durationSeconds,
      mimeType: 'audio/wav',
      provider: { name: 'fake-tts', requestId: null, voice },
      sampleRate,
    };
  }
}
