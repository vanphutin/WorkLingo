import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type {
  SynthesizeAudioInput,
  SynthesizedAudio,
  TextToSpeechPort,
} from '../domain/text-to-speech.port.js';

export const SIMULATION_AUDIO_LABEL =
  'Audio mô phỏng — chưa phải giọng đọc phát hành';

@Injectable()
export class FakeTextToSpeechAdapter implements TextToSpeechPort {
  async synthesize(input: SynthesizeAudioInput): Promise<SynthesizedAudio> {
    const rawScript = input.script;
    if (!rawScript || rawScript.trim().length === 0) {
      throw new Error('Script cannot be empty');
    }
    if (rawScript.length > 10_000) {
      throw new Error('Script exceeds maximum length of 10,000 characters');
    }

    const voiceConfig = input.voiceConfig ?? {};
    const seedHash = createHash('sha256')
      .update(rawScript)
      .update(JSON.stringify(voiceConfig))
      .digest('hex');

    const sampleRate = 16000;
    const words = rawScript.trim().split(/\s+/).length;
    const durationSeconds = Math.max(1, Math.min(10, Math.ceil(words * 0.3)));
    const totalSamples = durationSeconds * sampleRate;
    const dataSize = totalSamples * 2; // 16-bit mono = 2 bytes per sample
    const bufferSize = 44 + dataSize;
    const buffer = Buffer.alloc(bufferSize);

    // 1. RIFF chunk descriptor
    buffer.write('RIFF', 0, 'ascii');
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8, 'ascii');

    // 2. "fmt " sub-chunk
    buffer.write('fmt ', 12, 'ascii');
    buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
    buffer.writeUInt16LE(1, 20); // AudioFormat = 1 (PCM)
    buffer.writeUInt16LE(1, 22); // NumChannels = 1 (mono)
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate = SampleRate * NumChannels * BitsPerSample/8
    buffer.writeUInt16LE(2, 32); // BlockAlign = NumChannels * BitsPerSample/8
    buffer.writeUInt16LE(16, 34); // BitsPerSample = 16

    // 3. "data" sub-chunk
    buffer.write('data', 36, 'ascii');
    buffer.writeUInt32LE(dataSize, 40);

    // 4. Deterministic PCM samples derived from seedHash
    const baseFreq = 220 + (parseInt(seedHash.slice(0, 4), 16) % 220); // 220-440 Hz
    let offset = 44;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // Soft synthesized sine wave with envelope
      const envelope = Math.sin((Math.PI * i) / totalSamples);
      const sampleValue = Math.round(
        Math.sin(2 * Math.PI * baseFreq * t) * 8000 * envelope,
      );
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sampleValue)), offset);
      offset += 2;
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');

    return {
      mimeType: 'audio/wav',
      audioBytes: buffer,
      checksum,
      sampleRate,
      durationSeconds,
    };
  }
}
