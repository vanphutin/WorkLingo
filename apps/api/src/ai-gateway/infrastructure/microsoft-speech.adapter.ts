import { z } from 'zod';

import { ProviderError } from '../domain/provider-errors.js';
import {
  SpeechToTextPort,
  type SpeechTranscription,
  type SpeechTranscriptionInput,
} from '../domain/speech-to-text.port.js';
import { requestProviderJson } from './provider-http-client.js';

export interface MicrosoftSpeechConfig {
  readonly endpoint?: string;
  readonly key: string;
  readonly region: string;
  readonly timeoutMs: number;
}

const score = z.number().min(0).max(100);
const responseSchema = z.object({
  RecognitionStatus: z.string(),
  DisplayText: z.string().optional(),
  NBest: z.array(z.object({
    Confidence: z.number().min(0).max(1).optional(),
    Display: z.string().optional(),
    PronunciationAssessment: z.object({
      AccuracyScore: score,
      CompletenessScore: score.optional(),
      FluencyScore: score,
      ProsodyScore: score.optional(),
    }),
    Words: z.array(z.object({
      Word: z.string().min(1),
      Offset: z.number().nonnegative(),
      Duration: z.number().nonnegative(),
      PronunciationAssessment: z.object({ AccuracyScore: score }).optional(),
    })).default([]),
  })).optional(),
}).passthrough();

const percentage = (value: number): number => value / 100;

export class MicrosoftSpeechAdapter extends SpeechToTextPort {
  constructor(private readonly config: MicrosoftSpeechConfig) {
    super();
  }

  async transcribe(input: SpeechTranscriptionInput): Promise<SpeechTranscription> {
    const endpoint = this.config.endpoint
      ?? `https://${this.config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
    const url = new URL(endpoint);
    url.searchParams.set('format', 'detailed');
    url.searchParams.set('language', input.locale);

    const assessment = Buffer.from(JSON.stringify({
      ReferenceText: input.referenceText,
      GradingSystem: 'HundredMark',
      Granularity: 'Phoneme',
      Dimension: 'Comprehensive',
      EnableMiscue: true,
    })).toString('base64');
    const raw = await requestProviderJson({
      url: url.toString(),
      timeoutMs: this.config.timeoutMs,
      body: Uint8Array.from(input.audio).buffer,
      headers: {
        Accept: 'application/json',
        'Content-Type': input.mimeType,
        'Ocp-Apim-Subscription-Key': this.config.key,
        'Pronunciation-Assessment': assessment,
      },
    });
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ProviderError('The speech provider returned an invalid response.', {
        code: 'PROVIDER_RESPONSE_INVALID', retryable: true, cause: parsed.error,
      });
    }
    if (['NoMatch', 'InitialSilenceTimeout', 'BabbleTimeout'].includes(parsed.data.RecognitionStatus)) {
      throw new ProviderError('The recording does not contain recognizable speech.', {
        code: 'INVALID_AUDIO', retryable: false,
      });
    }
    if (parsed.data.RecognitionStatus !== 'Success' || !parsed.data.NBest?.[0]) {
      throw new ProviderError('The speech provider did not complete recognition.', {
        code: 'PROVIDER_RESPONSE_INVALID', retryable: true,
      });
    }

    const best = parsed.data.NBest[0];
    const pronunciation = best.PronunciationAssessment;
    return {
      transcript: parsed.data.DisplayText ?? best.Display ?? '',
      locale: input.locale,
      words: best.Words.map((word) => ({
        word: word.Word,
        offsetMs: word.Offset / 10_000,
        durationMs: word.Duration / 10_000,
        ...(word.PronunciationAssessment
          ? { accuracy: percentage(word.PronunciationAssessment.AccuracyScore) }
          : {}),
      })),
      providerConfidence: best.Confidence ?? null,
      pronunciation: {
        accuracy: percentage(pronunciation.AccuracyScore),
        fluency: percentage(pronunciation.FluencyScore),
        ...(pronunciation.CompletenessScore === undefined
          ? {} : { completeness: percentage(pronunciation.CompletenessScore) }),
        ...(pronunciation.ProsodyScore === undefined
          ? {} : { prosody: percentage(pronunciation.ProsodyScore) }),
      },
      provider: { name: 'microsoft-speech', requestId: null },
    };
  }
}
