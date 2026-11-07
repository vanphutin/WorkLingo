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
  readonly errorType?: string;
  readonly phonemes?: readonly SpeechPhonemeResult[];
  readonly syllables?: readonly SpeechSyllableResult[];
}

export interface SpeechPhonemeResult {
  readonly phoneme: string;
  readonly offsetMs: number;
  readonly durationMs: number;
  readonly accuracy?: number;
  readonly errorType?: string;
}

export interface SpeechSyllableResult {
  readonly syllable: string;
  readonly offsetMs: number;
  readonly durationMs: number;
  readonly accuracy?: number;
  readonly errorType?: string;
}

export interface SpeechAcousticEvidence {
  readonly audioChecksum: string;
  readonly durationMs?: number;
  readonly dimensions: readonly string[];
  readonly unassessedDimensions: readonly string[];
  readonly words: readonly SpeechWordResult[];
}

export interface SpeechTranscription {
  readonly acousticEvidence?: SpeechAcousticEvidence;
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
