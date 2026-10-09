export interface SpeechTranscriptionInput {
  readonly audio: Uint8Array;
  readonly locale: string;
  readonly mimeType: string;
  readonly referenceText: string;
}

export interface SpeechPronunciationMetrics {
  readonly accuracy: number;
  readonly completeness?: number;
  readonly fluency: number;
  readonly prosody?: number;
}

export interface SpeechWordResult {
  readonly word: string;
  readonly offsetMs: number;
  readonly durationMs: number;
  readonly accuracy?: number;
}

export interface SpeechTranscription {
  readonly transcript: string;
  readonly locale: string;
  readonly words: readonly SpeechWordResult[];
  readonly providerConfidence: number | null;
  readonly pronunciation: SpeechPronunciationMetrics;
  readonly provider: {
    readonly name: string;
    readonly requestId: string | null;
  };
}

export abstract class SpeechToTextPort {
  abstract transcribe(input: SpeechTranscriptionInput): Promise<SpeechTranscription>;
}
