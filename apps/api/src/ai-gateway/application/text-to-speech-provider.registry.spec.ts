import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import type { TextToSpeechPort } from '../domain/text-to-speech.port.js';
import {
  TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS,
  TextToSpeechProviderRegistry,
  buildTextToSpeechProviderRegistrations,
  type TextToSpeechProviderRegistration,
} from './text-to-speech-provider.registry.js';

const fakePort = { providerName: 'fake-tts' } as TextToSpeechPort;
const azurePort = { providerName: 'azure-speech' } as TextToSpeechPort;

const registration = (
  overrides: Partial<TextToSpeechProviderRegistration> = {},
): TextToSpeechProviderRegistration => ({
  descriptor: {
    available: true,
    defaultVoiceId: 'fake-neutral',
    displayName: 'Simulation audio',
    id: 'fake-tts',
    releaseQuality: false,
    supportedVoiceIds: ['fake-neutral'],
  },
  provider: fakePort,
  ...overrides,
});

async function createRegistry(
  registrations: readonly TextToSpeechProviderRegistration[],
): Promise<TextToSpeechProviderRegistry> {
  const module = await Test.createTestingModule({
    providers: [
      TextToSpeechProviderRegistry,
      {
        provide: TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS,
        useValue: registrations,
      },
    ],
  }).compile();

  return module.get(TextToSpeechProviderRegistry);
}

describe('TextToSpeechProviderRegistry', () => {
  it('marks Azure available only when its configured adapter exists', () => {
    const unavailable = buildTextToSpeechProviderRegistrations({
      azureProvider: null,
      azureVoiceId: 'en-US-JennyNeural',
      fakeProvider: fakePort,
    });
    const available = buildTextToSpeechProviderRegistrations({
      azureProvider: azurePort,
      azureVoiceId: 'en-US-JennyNeural',
      fakeProvider: fakePort,
    });

    expect(unavailable.find(({ descriptor }) => descriptor.id === 'azure-speech'))
      .toMatchObject({ descriptor: { available: false } });
    expect(available.find(({ descriptor }) => descriptor.id === 'azure-speech'))
      .toMatchObject({ descriptor: { available: true } });
  });

  it('lists safe fake and configured Azure capabilities', async () => {
    const secret = 'must-not-appear-in-capabilities';
    const registry = await createRegistry([
      registration(),
      registration({
        descriptor: {
          available: true,
          defaultVoiceId: 'en-US-JennyNeural',
          displayName: 'Azure Speech',
          id: 'azure-speech',
          releaseQuality: true,
          supportedVoiceIds: ['en-US-JennyNeural'],
        },
        provider: Object.assign(azurePort, { testSecret: secret }),
      }),
    ]);

    expect(registry.list()).toEqual([
      expect.objectContaining({ id: 'fake-tts', releaseQuality: false }),
      expect.objectContaining({ id: 'azure-speech', releaseQuality: true }),
    ]);
    expect(JSON.stringify(registry.list())).not.toContain(secret);
  });

  it('resolves known available providers and rejects unknown providers', async () => {
    const registry = await createRegistry([registration()]);

    expect(registry.resolve('fake-tts')).toBe(fakePort);
    expect(() => registry.resolve('browser-tts')).toThrowError(expect.objectContaining({
      code: 'TTS_PROVIDER_UNAVAILABLE',
    }));
  });

  it('rejects unavailable Azure without silently falling back to fake', async () => {
    const registry = await createRegistry([
      registration(),
      registration({
        descriptor: {
          available: false,
          defaultVoiceId: 'en-US-JennyNeural',
          displayName: 'Azure Speech',
          id: 'azure-speech',
          releaseQuality: true,
          supportedVoiceIds: ['en-US-JennyNeural'],
        },
        provider: null,
      }),
    ]);

    expect(() => registry.resolve('azure-speech')).toThrowError(expect.objectContaining({
      code: 'TTS_PROVIDER_UNAVAILABLE',
    }));
  });

  it('accepts configured voices and rejects unsupported voice IDs safely', async () => {
    const registry = await createRegistry([registration()]);

    expect(() => registry.assertVoiceSupported('fake-tts', 'fake-neutral')).not.toThrow();
    expect(() => registry.assertVoiceSupported('fake-tts', 'secret-looking-voice')).toThrowError(
      expect.objectContaining({ code: 'TTS_VOICE_UNSUPPORTED' }),
    );
  });

  it('rejects duplicate provider IDs during startup', async () => {
    await expect(createRegistry([registration(), registration()])).rejects.toThrow(
      /duplicate text to speech provider/i,
    );
  });
});
