import { afterEach, describe, expect, it, vi } from 'vitest';

import { AudioSettingsClient } from './audio-settings-client';

describe('AudioSettingsClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads and saves learner settings with cookie credentials', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        browserVoiceId: null, sourceId: 'system-default',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        browserVoiceId: 'voice-en', sourceId: 'browser-tts',
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new AudioSettingsClient('/api/v1');

    await expect(client.getLearnerSettings()).resolves.toMatchObject({
      sourceId: 'system-default',
    });
    await client.updateLearnerSettings({
      browserVoiceId: 'voice-en', sourceId: 'browser-tts',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/me/audio-settings',
      expect.objectContaining({ credentials: 'include', method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/me/audio-settings',
      expect.objectContaining({ credentials: 'include', method: 'PATCH' }));
  });

  it('parses only safe Admin capability fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      defaultVoiceId: 'fake-neutral',
      providerId: 'fake-tts',
      providers: [{
        available: true, defaultVoiceId: 'fake-neutral', displayName: 'Simulation audio',
        id: 'fake-tts', simulation: true, supportedLocales: ['en-US'],
      }],
    }), { status: 200 })));

    await expect(new AudioSettingsClient('/api/v1').getAdminSettings()).resolves.toMatchObject({
      providerId: 'fake-tts',
    });
  });
});
