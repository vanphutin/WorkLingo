import { describe, expect, it, vi } from 'vitest';

import { AudioSettingsService } from './audio-settings.service.js';

describe('AudioSettingsService', () => {
  it('resolves missing system settings from safe config without writing', async () => {
    const database = {
      audioSystemSetting: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
      },
    };
    const registry = {
      list: () => [
        {
          available: true,
          defaultVoiceId: 'fake-neutral',
          displayName: 'Simulation audio',
          id: 'fake-tts',
          releaseQuality: false,
          supportedVoiceIds: ['fake-neutral'],
        },
        {
          available: false,
          defaultVoiceId: 'en-US-JennyNeural',
          displayName: 'Azure Speech',
          id: 'azure-speech',
          releaseQuality: true,
          supportedVoiceIds: ['en-US-JennyNeural'],
        },
      ],
    };
    const config = {
      get: vi.fn().mockReturnValue({
        textToSpeech: {
          azure: { voice: 'en-US-JennyNeural' },
          defaultProviderId: 'fake-tts',
        },
      }),
    };
    const service = new AudioSettingsService(
      database as never,
      registry as never,
      config as never,
    );

    await expect(service.getAdminSettings()).resolves.toEqual({
      defaultVoiceId: 'fake-neutral',
      providerId: 'fake-tts',
      providers: [
        {
          available: true,
          defaultVoiceId: 'fake-neutral',
          displayName: 'Simulation audio',
          id: 'fake-tts',
          simulation: true,
          supportedLocales: ['en-US'],
        },
        {
          available: false,
          defaultVoiceId: 'en-US-JennyNeural',
          displayName: 'Azure Speech',
          id: 'azure-speech',
          simulation: false,
          supportedLocales: ['en-US'],
        },
      ],
    });
    expect(database.audioSystemSetting.upsert).not.toHaveBeenCalled();
  });
});
