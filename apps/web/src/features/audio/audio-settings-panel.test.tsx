import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { AudioSettingsPanel } from './audio-settings-panel';

vi.mock('./browser-speech-controls', () => ({
  BrowserSpeechControls: () => <div>Speech preview controls</div>,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AudioSettingsPanel', () => {
  it('loads sources, shows browser voices conditionally and saves selection', async () => {
    vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockResolvedValue({
      browserVoiceId: null, sourceId: 'system-default',
    });
    const update = vi.spyOn(audioSettingsClient, 'updateLearnerSettings').mockResolvedValue({
      browserVoiceId: null, sourceId: 'browser-tts',
    });

    render(<AudioSettingsPanel />);
    fireEvent.click(await screen.findByRole('radio', { name: /browser voice/i }));
    expect(screen.getByLabelText(/voice on this device/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save audio settings/i }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({
      browserVoiceId: null, sourceId: 'browser-tts',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i);
  });

  it('shows a retry action when settings cannot load', async () => {
    vi.spyOn(audioSettingsClient, 'getLearnerSettings')
      .mockRejectedValueOnce(new Error('private backend details'))
      .mockResolvedValueOnce({ browserVoiceId: null, sourceId: 'system-default' });
    render(<AudioSettingsPanel />);
    expect(await screen.findByRole('alert')).not.toHaveTextContent(/private backend details/i);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('radio', { name: /automatic/i })).toBeChecked();
  });
});
