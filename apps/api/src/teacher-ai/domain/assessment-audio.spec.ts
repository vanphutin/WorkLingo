import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as audio from './assessment-audio.js';

function wav(samples = 1600, amplitude = 8000): Buffer {
  const out = Buffer.alloc(44 + samples * 2);
  out.write('RIFF');
  out.writeUInt32LE(out.length - 8, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(16000, 24);
  out.writeUInt32LE(32000, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    out.writeInt16LE(i % 2 ? amplitude : -amplitude, 44 + i * 2);
  return out;
}
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const validate = (b: Uint8Array, mime = 'audio/wav', checksum = hash(b)) =>
  audio.validateAssessmentAudio(b, mime, checksum);

describe('validateAssessmentAudio', () => {
  it('binds exact bytes and duration while energy is not proof of speech', () => {
    const bytes = wav();
    expect(validate(bytes)).toMatchObject({
      checksum: hash(bytes),
      durationMs: 100,
      sampleRate: 16000,
      voiceActivity: true,
    });
  });
  it('rejects byte tampering', () =>
    expect(() => validate(wav(), 'audio/wav', 'a'.repeat(64))).toThrow(
      /checksum/i,
    ));
  it('rejects silence', () =>
    expect(() => validate(wav(1600, 0))).toThrow(/silence/i));
  it('rejects unsupported local WebM analysis explicitly', () =>
    expect(() => validate(wav(), 'audio/webm;codecs=opus')).toThrow(
      /unsupported/i,
    ));
  it('rejects corrupt RIFF length', () => {
    const b = wav();
    b.writeUInt32LE(8, 4);
    expect(() => validate(b)).toThrow(/invalid/i);
  });
  it('rejects truncated chunks', () => {
    const b = wav();
    b.writeUInt32LE(100000, 40);
    expect(() => validate(b)).toThrow(/invalid/i);
  });
  it('rejects non-PCM and inconsistent byte rates', () => {
    const b = wav();
    b.writeUInt16LE(3, 20);
    expect(() => validate(b)).toThrow(/unsupported/i);
    const c = wav();
    c.writeUInt32LE(8000, 28);
    expect(() => validate(c)).toThrow(/invalid/i);
  });
  it('rejects empty audio and oversized uploads before analysis', () => {
    expect(() => validate(Buffer.alloc(0))).toThrow(/invalid/i);
    expect(() => validate(Buffer.alloc(10 * 1024 * 1024 + 1))).toThrow(/size/i);
  });
  it('rejects excessive duration', () =>
    expect(() => validate(wav(16000 * 121))).toThrow(/duration/i));
  it('rejects duplicate data and partial PCM frames', () => {
    const b = wav();
    const extra = Buffer.alloc(10);
    extra.write('data');
    extra.writeUInt32LE(2, 4);
    const duplicate = Buffer.concat([b, extra]);
    duplicate.writeUInt32LE(duplicate.length - 8, 4);
    expect(() => validate(duplicate)).toThrow(/invalid/i);
    const c = wav();
    c.writeUInt32LE(c.length - 45, 40);
    expect(() => validate(c)).toThrow(/invalid/i);
  });
});
