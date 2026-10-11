import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { AdminAudioSettingsPanel } from './admin-audio-settings-panel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AdminAudioSettingsPanel', () => {
  it('shows safe readiness and disables unavailable providers', async () => {
    vi.spyOn(audioSettingsClient, 'getAdminSettings').mockResolvedValue({
      defaultVoiceId: 'fake-neutral', providerId: 'fake-tts',
      providers: [
        {
          available: true, defaultVoiceId: 'fake-neutral', displayName: 'Simulation audio',
          id: 'fake-tts', simulation: true, supportedLocales: ['en-US'],
        },
        {
          available: false, defaultVoiceId: 'en-US-JennyNeural', displayName: 'Azure Speech',
          id: 'azure-speech', simulation: false, supportedLocales: ['en-US'],
        },
      ],
    });
    render(<AdminAudioSettingsPanel />);
    expect(await screen.findByRole('radio', { name: /simulation audio/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /azure speech/i })).toBeDisabled();
    expect(screen.queryByText(/subscription key|credential value/i)).not.toBeInTheDocument();
  });
});
