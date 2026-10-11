import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';

import type {
  TextToSpeechPort,
  TtsProviderDescriptor,
} from '../domain/text-to-speech.port.js';

export const TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS = Symbol(
  'TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS',
);

export interface TextToSpeechProviderRegistration {
  readonly descriptor: TtsProviderDescriptor;
  readonly provider: TextToSpeechPort | null;
}

export function buildTextToSpeechProviderRegistrations(input: {
  readonly azureProvider: TextToSpeechPort | null;
  readonly azureVoiceId: string;
  readonly fakeProvider: TextToSpeechPort;
}): readonly TextToSpeechProviderRegistration[] {
  return [
    {
      descriptor: {
        available: true,
        defaultVoiceId: 'fake-neutral',
        displayName: 'Simulation audio',
        id: 'fake-tts',
        releaseQuality: false,
        supportedVoiceIds: ['fake-neutral'],
      },
      provider: input.fakeProvider,
    },
    {
      descriptor: {
        available: input.azureProvider !== null,
        defaultVoiceId: input.azureVoiceId,
        displayName: 'Azure Speech',
        id: 'azure-speech',
        releaseQuality: true,
        supportedVoiceIds: [input.azureVoiceId],
      },
      provider: input.azureProvider,
    },
  ];
}

export type TtsProviderSelectionErrorCode =
  | 'TTS_PROVIDER_UNAVAILABLE'
  | 'TTS_VOICE_UNSUPPORTED';

export class TtsProviderSelectionError extends UnprocessableEntityException {
  constructor(
    readonly code: TtsProviderSelectionErrorCode,
    message: string,
  ) {
    super({ code, message, statusCode: 422 });
    this.name = 'TtsProviderSelectionError';
  }
}

@Injectable()
export class TextToSpeechProviderRegistry {
  private readonly registrations: ReadonlyMap<string, TextToSpeechProviderRegistration>;
  private readonly descriptors: readonly TtsProviderDescriptor[];

  constructor(
    @Inject(TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS)
    registrations: readonly TextToSpeechProviderRegistration[],
  ) {
    const byId = new Map<string, TextToSpeechProviderRegistration>();
    for (const registration of registrations) {
      if (byId.has(registration.descriptor.id)) {
        throw new Error(
          `Duplicate text to speech provider ID: ${registration.descriptor.id}`,
        );
      }
      byId.set(registration.descriptor.id, registration);
    }
    this.registrations = byId;
    this.descriptors = Object.freeze(
      registrations.map(({ descriptor }) => Object.freeze({
        ...descriptor,
        supportedVoiceIds: Object.freeze([...descriptor.supportedVoiceIds]),
      })),
    );
  }

  list(): readonly TtsProviderDescriptor[] {
    return this.descriptors;
  }

  resolve(providerId: string): TextToSpeechPort {
    const registration = this.registrations.get(providerId);
    if (!registration?.descriptor.available || !registration.provider) {
      throw new TtsProviderSelectionError(
        'TTS_PROVIDER_UNAVAILABLE',
        'The selected text to speech provider is unavailable.',
      );
    }
    return registration.provider;
  }

  assertVoiceSupported(providerId: string, voiceId: string): void {
    const registration = this.registrations.get(providerId);
    if (!registration?.descriptor.available || !registration.provider) {
      throw new TtsProviderSelectionError(
        'TTS_PROVIDER_UNAVAILABLE',
        'The selected text to speech provider is unavailable.',
      );
    }
    if (!registration.descriptor.supportedVoiceIds.includes(voiceId)) {
      throw new TtsProviderSelectionError(
        'TTS_VOICE_UNSUPPORTED',
        'The selected text to speech voice is unsupported.',
      );
    }
  }
}
