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
  };
}

export abstract class TextToSpeechPort {
  abstract readonly providerName: string;
  abstract synthesize(input: SynthesizeAudioInput): Promise<SynthesizedAudio>;
}
