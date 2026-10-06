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
}

export abstract class TextToSpeechPort {
  abstract synthesize(input: SynthesizeAudioInput): Promise<SynthesizedAudio>;
}
