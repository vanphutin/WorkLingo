import { createHash } from 'node:crypto';

export interface AssessmentAudioValidation {
  readonly checksum: string;
  readonly durationMs: number;
  readonly sampleRate: number;
  /** Energy gate only: music, noise and synthetic tones can pass; not proof of speech. */
  readonly voiceActivity: boolean;
}

/** Local analysis supports mono, signed 16-bit little-endian PCM RIFF/WAVE only. */
export function validateAssessmentAudio(
  bytes: Uint8Array,
  mime: string,
  expectedHash: string,
): AssessmentAudioValidation {
  if (bytes.byteLength > 10 * 1024 * 1024)
    throw new Error('Audio size exceeds limit.');
  if (
    !['audio/wav', 'audio/wave', 'audio/x-wav'].includes(
      mime.split(';')[0]!.trim().toLowerCase(),
    )
  ) {
    throw new Error('Unsupported audio format for local PCM analysis.');
  }
  if (bytes.byteLength < 44) throw new Error('Invalid WAV audio.');
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (!/^[a-f0-9]{64}$/u.test(expectedHash) || checksum !== expectedHash)
    throw new Error('Audio checksum mismatch.');
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const invalid = (): never => {
    throw new Error('Invalid PCM WAV structure.');
  };
  if (
    b.toString('ascii', 0, 4) !== 'RIFF' ||
    b.toString('ascii', 8, 12) !== 'WAVE' ||
    b.readUInt32LE(4) !== b.length - 8
  )
    invalid();
  let sampleRate = 0;
  let dataStart = -1;
  let dataLength = 0;
  let formatSeen = false;
  for (let offset = 12; offset < b.length; ) {
    if (offset + 8 > b.length) invalid();
    const name = b.toString('ascii', offset, offset + 4);
    const length = b.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    const next = end + (length % 2);
    if (end > b.length || next > b.length) invalid();
    if (name === 'fmt ') {
      if (formatSeen || dataStart !== -1 || length !== 16) invalid();
      formatSeen = true;
      if (
        b.readUInt16LE(start) !== 1 ||
        b.readUInt16LE(start + 2) !== 1 ||
        b.readUInt16LE(start + 14) !== 16
      ) {
        throw new Error(
          'Unsupported PCM encoding; mono signed 16-bit required.',
        );
      }
      sampleRate = b.readUInt32LE(start + 4);
      if (
        sampleRate < 8000 ||
        sampleRate > 48000 ||
        b.readUInt16LE(start + 12) !== 2 ||
        b.readUInt32LE(start + 8) !== sampleRate * 2
      )
        invalid();
    } else if (name === 'data') {
      if (!formatSeen || dataStart !== -1 || length === 0 || length % 2 !== 0)
        invalid();
      dataStart = start;
      dataLength = length;
    }
    offset = next;
  }
  if (!formatSeen || dataStart === -1) invalid();
  const durationMs = (dataLength / (sampleRate * 2)) * 1000;
  if (durationMs < 100 || durationMs > 120000)
    throw new Error('Audio duration outside 100ms–120s limit.');
  // 20ms RMS windows, -40 dBFS gate, at least 60ms of active windows.
  const windowSamples = Math.round(sampleRate * 0.02);
  let activeSamples = 0;
  const samples = dataLength / 2;
  for (let start = 0; start < samples; start += windowSamples) {
    const count = Math.min(windowSamples, samples - start);
    let energy = 0;
    for (let j = 0; j < count; j++) {
      const sample = b.readInt16LE(dataStart + (start + j) * 2) / 32768;
      energy += sample * sample;
    }
    if (Math.sqrt(energy / count) >= 0.01) activeSamples += count;
  }
  const voiceActivity = activeSamples / sampleRate >= 0.06;
  if (!voiceActivity)
    throw new Error('Audio silence or insufficient voice energy.');
  return { checksum, durationMs, sampleRate, voiceActivity };
}
