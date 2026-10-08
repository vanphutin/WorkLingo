import { parseBuffer } from 'music-metadata';

export const SUPPORTED_RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/wav',
] as const;

export type SupportedRecordingFormat = 'webm-opus' | 'ogg-opus' | 'wav-pcm';

export class AudioUploadPolicyError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'AudioUploadPolicyError';
  }
}

export interface AudioUpload {
  readonly body: Buffer;
  readonly mimeType: string;
}

export interface AudioUploadLimits {
  readonly maxBytes: number;
  readonly maxDurationSeconds: number;
}

export type AudioDurationReader = (upload: AudioUpload) => Promise<number | undefined>;

export const readAudioDuration: AudioDurationReader = async (upload) => {
  const metadata = await parseBuffer(upload.body, { mimeType: upload.mimeType });
  return metadata.format.duration;
};

const detectFormat = (body: Buffer, mimeType: string): SupportedRecordingFormat | null => {
  if (mimeType === 'audio/webm' || mimeType === 'audio/webm;codecs=opus') {
    return body.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      && body.includes(Buffer.from('OpusHead')) ? 'webm-opus' : null;
  }
  if (mimeType === 'audio/ogg' || mimeType === 'audio/ogg;codecs=opus') {
    return body.subarray(0, 4).toString('ascii') === 'OggS'
      && body.includes(Buffer.from('OpusHead')) ? 'ogg-opus' : null;
  }
  if (mimeType === 'audio/wav') {
    return body.length >= 22
      && body.subarray(0, 4).toString('ascii') === 'RIFF'
      && body.subarray(8, 12).toString('ascii') === 'WAVE'
      && body.readUInt16LE(20) === 1 ? 'wav-pcm' : null;
  }
  return null;
};

export async function validateAudioUpload(
  upload: AudioUpload,
  limits: AudioUploadLimits,
  readDuration: AudioDurationReader = readAudioDuration,
): Promise<{ readonly durationSeconds: number; readonly format: SupportedRecordingFormat }> {
  if (upload.body.byteLength === 0) {
    throw new AudioUploadPolicyError('AUDIO_EMPTY', 'Recording is empty.');
  }
  if (upload.body.byteLength > limits.maxBytes) {
    throw new AudioUploadPolicyError('AUDIO_TOO_LARGE', 'Recording exceeds the upload limit.');
  }
  const mimeType = upload.mimeType.trim().toLowerCase();
  if (!(SUPPORTED_RECORDING_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new AudioUploadPolicyError('AUDIO_TYPE_UNSUPPORTED', 'Recording type is not supported.');
  }
  const format = detectFormat(upload.body, mimeType);
  if (!format) {
    throw new AudioUploadPolicyError('AUDIO_SIGNATURE_INVALID', 'Recording bytes do not match its media type.');
  }

  let durationSeconds: number | undefined;
  try {
    durationSeconds = await readDuration({ ...upload, mimeType });
  } catch (cause) {
    throw new AudioUploadPolicyError(
      'AUDIO_METADATA_INVALID',
      cause instanceof Error ? 'Recording metadata could not be read.' : 'Recording is invalid.',
    );
  }
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new AudioUploadPolicyError('AUDIO_METADATA_INVALID', 'Recording duration is unavailable.');
  }
  if (durationSeconds > limits.maxDurationSeconds) {
    throw new AudioUploadPolicyError('AUDIO_TOO_LONG', 'Recording exceeds the duration limit.');
  }
  return { durationSeconds, format };
}

export interface RecordingConsentInput {
  readonly accepted: boolean;
  readonly policyVersion: string;
  readonly scope: string;
}

export function validateRecordingConsent(input: RecordingConsentInput): {
  readonly policyVersion: string;
  readonly scope: string;
} {
  const policyVersion = input.policyVersion.trim();
  const scope = input.scope.trim();
  if (!input.accepted || !policyVersion || !scope) {
    throw new AudioUploadPolicyError(
      'RECORDING_CONSENT_REQUIRED',
      'Explicit versioned recording consent is required.',
    );
  }
  return { policyVersion, scope };
}
