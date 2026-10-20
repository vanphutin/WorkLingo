import type { SpeakerGender } from '@worklingo/content-format';

export interface SpeakerVoiceAssignment {
  readonly speaker: string;
  readonly name: string;
  /** Author declaration; null means unknown, including legacy dialogue. */
  readonly gender: SpeakerGender | null;
  readonly voice: string;
  readonly voiceGender: SpeakerGender;
}

export interface SynthesizeAudioInput {
  readonly script: string;
  readonly voiceConfig?: Record<string, unknown>;
  readonly speaker?: string;
}

export interface SynthesizedAudio {
  readonly mimeType: 'audio/wav';
  readonly audioBytes: Buffer;
  readonly checksum: string;
  readonly sampleRate: number;
  readonly durationSeconds: number;
  readonly provider?: {
    readonly name: string;
    readonly requestId: string | null;
    readonly voice: string;
    readonly speakerVoices?: readonly SpeakerVoiceAssignment[];
  };
}

export type TtsProviderId = 'azure-speech' | 'fake-tts';

export interface TtsProviderDescriptor {
  readonly id: TtsProviderId;
  readonly displayName: string;
  readonly available: boolean;
  readonly defaultVoiceId: string;
  readonly supportedVoiceIds: readonly string[];
  readonly releaseQuality: boolean;
}

export abstract class TextToSpeechPort {
  abstract readonly providerName: TtsProviderId;
  abstract synthesize(input: SynthesizeAudioInput): Promise<SynthesizedAudio>;
}
