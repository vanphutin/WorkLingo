import { ProviderError } from '../domain/provider-errors.js';
import {
  SpeechToTextPort,
  type SpeechTranscription,
  type SpeechTranscriptionInput,
} from '../domain/speech-to-text.port.js';

const CLEAR_SHADOWING_TRANSCRIPT = 'Hello, I am Lan from the support team.';

const decodeFixtureMarker = (audio: Uint8Array): string => new TextDecoder().decode(audio);

const createWords = (transcript: string, accuracy: number) => transcript
  .replace(/[.,!?]/g, '')
  .split(/\s+/)
  .filter(Boolean)
  .map((word, index) => ({
    word,
    offsetMs: index * 350,
    durationMs: 300,
    accuracy,
  }));

export class FakeSpeechToTextAdapter extends SpeechToTextPort {
  async transcribe(input: SpeechTranscriptionInput): Promise<SpeechTranscription> {
    const marker = decodeFixtureMarker(input.audio);

    if (input.audio.byteLength === 0 || marker.includes('worklingo-fixture:silent')) {
      throw new ProviderError('The recording does not contain recognizable speech.', {
        code: 'INVALID_AUDIO',
        retryable: false,
      });
    }

    const clearShadowing = marker.includes('worklingo-fixture:clear-shadowing');
    const transcript = clearShadowing ? CLEAR_SHADOWING_TRANSCRIPT : input.referenceText;
    const accuracy = clearShadowing ? 0.92 : 0.75;
    const completeness = clearShadowing ? 0.96 : 0.75;
    const fluency = clearShadowing ? 0.84 : 0.75;

    return {
      transcript,
      locale: input.locale,
      words: createWords(transcript, accuracy),
      providerConfidence: clearShadowing ? 0.95 : 0.75,
      pronunciation: { accuracy, completeness, fluency },
      provider: {
        name: 'fake-microsoft-speech',
        requestId: null,
      },
    };
  }
}
