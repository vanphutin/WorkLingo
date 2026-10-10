import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { LessonAudioPlayer } from './lesson-audio-player';

vi.mock('./browser-speech-controls', () => ({
  BrowserSpeechControls: () => <div data-testid="browser-speech">Browser speech controls</div>,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LessonAudioPlayer', () => {
  it('uses browser speech without requesting persisted media', async () => {
    let resolveSettings!: (value: { browserVoiceId: null; sourceId: 'browser-tts' }) => void;
    vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockReturnValue(new Promise((resolve) => {
      resolveSettings = resolve;
    }));
    render(<LessonAudioPlayer audioUrl="/private/audio" text="Meeting transcript" />);
    expect(screen.queryByLabelText('Lesson audio')).not.toBeInTheDocument();
    resolveSettings({ browserVoiceId: null, sourceId: 'browser-tts' });
    expect(await screen.findByTestId('browser-speech')).toBeInTheDocument();
    expect(screen.queryByLabelText('Lesson audio')).not.toBeInTheDocument();
  });

  it('keeps published-only failures explicit without silently changing source', async () => {
    vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockResolvedValue({
      browserVoiceId: null, sourceId: 'published-audio',
    });
    render(<LessonAudioPlayer audioUrl="/private/audio" text="Meeting transcript" />);
    fireEvent.error(await screen.findByLabelText('Lesson audio'));
    expect(screen.getByRole('alert')).toHaveTextContent(/published audio is unavailable/i);
    expect(screen.queryByTestId('browser-speech')).not.toBeInTheDocument();
  });

  it('offers browser speech after canonical media fails in automatic mode', async () => {
    vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockRejectedValue(new Error('offline'));
    render(<LessonAudioPlayer audioUrl="/private/audio" text="Meeting transcript" />);
    fireEvent.error(await screen.findByLabelText('Lesson audio'));
    expect(await screen.findByTestId('browser-speech')).toBeInTheDocument();
  });
});
