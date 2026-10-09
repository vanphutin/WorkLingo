import { createHash } from 'node:crypto';

import { ProviderError } from '../domain/provider-errors.js';
import {
  TextToSpeechPort,
  type SynthesizeAudioInput,
  type SynthesizedAudio,
} from '../domain/text-to-speech.port.js';
import { requestProviderBytes } from './provider-http-client.js';

export interface MicrosoftTextToSpeechConfig {
  readonly endpoint?: string;
  readonly key: string;
  readonly region: string;
  readonly timeoutMs: number;
  readonly voice: string;
}

const escapeXml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const inspectPcmWav = (audio: Buffer): { durationSeconds: number; sampleRate: number } => {
  if (audio.length < 44
    || audio.subarray(0, 4).toString('ascii') !== 'RIFF'
    || audio.subarray(8, 12).toString('ascii') !== 'WAVE') {
    throw new ProviderError('The speech provider returned invalid WAV audio.', {
      code: 'PROVIDER_RESPONSE_INVALID', retryable: true,
    });
  }
  const sampleRate = audio.readUInt32LE(24);
  const byteRate = audio.readUInt32LE(28);
  const dataSize = audio.readUInt32LE(40);
  if (sampleRate <= 0 || byteRate <= 0 || dataSize > audio.length - 44) {
    throw new ProviderError('The speech provider returned malformed WAV metadata.', {
      code: 'PROVIDER_RESPONSE_INVALID', retryable: true,
    });
  }
  return { durationSeconds: dataSize / byteRate, sampleRate };
};

export class MicrosoftTextToSpeechAdapter extends TextToSpeechPort {
  readonly providerName = 'microsoft-tts';

  constructor(private readonly config: MicrosoftTextToSpeechConfig) {
    super();
  }

  async synthesize(input: SynthesizeAudioInput): Promise<SynthesizedAudio> {
    const script = input.script.trim();
    if (!script) throw new Error('Script cannot be empty');
    if (script.length > 10_000) throw new Error('Script exceeds maximum length of 10,000 characters');
    const requestedVoice = input.voiceConfig?.voice;
    const voice = typeof requestedVoice === 'string' && requestedVoice.length > 0
      ? requestedVoice
      : this.config.voice;
    const endpoint = this.config.endpoint
      ?? `https://${this.config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="${escapeXml(voice)}">${escapeXml(script)}</voice></speak>`;
    const response = await requestProviderBytes({
      body: ssml,
      headers: {
        'Content-Type': 'application/ssml+xml',
        'Ocp-Apim-Subscription-Key': this.config.key,
        'User-Agent': 'WorkLingo',
        'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
      },
      maxResponseBytes: 20 * 1024 * 1024,
      timeoutMs: this.config.timeoutMs,
      url: endpoint,
    });
    const inspected = inspectPcmWav(response.body);
    return {
      audioBytes: response.body,
      checksum: createHash('sha256').update(response.body).digest('hex'),
      durationSeconds: inspected.durationSeconds,
      mimeType: 'audio/wav',
      provider: {
        name: 'microsoft-tts',
        requestId: response.headers.get('x-requestid'),
        voice,
      },
      sampleRate: inspected.sampleRate,
    };
  }
}
