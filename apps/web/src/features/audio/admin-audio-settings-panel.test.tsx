import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { AdminAudioSettingsPanel } from './admin-audio-settings-panel';
import { useBrowserSpeech } from './use-browser-speech';

function SpeechHarness({ text }: { readonly text: string }) {
  const speech = useBrowserSpeech({ lang: 'en-US', text });
  return <button onClick={speech.play}>Speak</button>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

  it('exposes actual device voices and applies tab-scoped enable and rotation controls to playback', async () => {
    vi.spyOn(audioSettingsClient, 'getAdminSettings').mockResolvedValue({
      defaultVoiceId: 'configured-server-voice', providerId: 'azure-speech', providers: [{
        available: true, defaultVoiceId: 'configured-server-voice', displayName: 'Azure Speech',
        id: 'azure-speech', simulation: false, supportedLocales: ['en-US'],
      }],
    });
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(readonly text: string) {} });
    vi.stubGlobal('speechSynthesis', {
      speak, cancel: vi.fn(), paused: false, pause: vi.fn(), resume: vi.fn(),
      getVoices: () => [
        { default: true, lang: 'en-US', localService: true, name: 'American', voiceURI: 'a' },
        { default: false, lang: 'en-GB', localService: false, name: 'British', voiceURI: 'b' },
        { default: false, lang: 'vi-VN', localService: true, name: 'Vietnamese', voiceURI: 'v' },
      ], addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    const view = render(<><AdminAudioSettingsPanel /><SpeechHarness text="First" /></>);
    const american = await screen.findByRole('checkbox', { name: /American/ });
    expect(screen.getByRole('checkbox', { name: /British/ })).toBeChecked();
    expect(screen.queryByText(/Vietnamese/)).not.toBeInTheDocument();
    expect(screen.getByText(/this tab only/i)).toBeInTheDocument();
    expect(screen.getByText(/server voice rotation is unavailable/i)).toBeInTheDocument();
    fireEvent.click(american);
    fireEvent.click(screen.getByText('Speak'));
    expect(speak.mock.calls.at(-1)?.[0].voice.voiceURI).toBe('b');
    fireEvent.click(screen.getByRole('checkbox', { name: /rotate/i }));
    fireEvent.click(american);
    view.rerender(<><AdminAudioSettingsPanel /><SpeechHarness text="Second" /></>);
    fireEvent.click(screen.getByText('Speak'));
    expect(speak.mock.calls.at(-1)?.[0].voice.voiceURI).toBe('a');
    view.rerender(<><AdminAudioSettingsPanel /><SpeechHarness text="Third" /></>);
    fireEvent.click(screen.getByText('Speak'));
    expect(speak.mock.calls.at(-1)?.[0].voice.voiceURI).toBe('a');
  });
});
