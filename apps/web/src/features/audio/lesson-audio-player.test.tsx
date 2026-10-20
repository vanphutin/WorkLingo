import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { LessonAudioPlayer } from './lesson-audio-player';
import { useBrowserSpeech } from './use-browser-speech';

function SpeechHarness() {
  const speech = useBrowserSpeech({ lang: 'en-US', text: 'Speech item' });
  return <><p>{speech.status}</p><button onClick={speech.play}>Speak</button></>;
}

vi.mock('./browser-speech-controls', () => ({
  BrowserSpeechControls: () => <div data-testid="browser-speech">Browser speech controls</div>,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

  it('skips simulated media and uses browser speech in automatic mode', async () => {
    vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockResolvedValue({
      browserVoiceId: null, sourceId: 'system-default',
    });

    render(
      <LessonAudioPlayer
        audioUrl="/private/simulated-audio"
        preferBrowserSpeech
        text="Meeting transcript"
      />,
    );

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

  it('arbitrates speech and media without unrelated media cleanup cancelling the current owner', async () => {
    vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockResolvedValue({ browserVoiceId: null, sourceId: 'published-audio' });
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(readonly text: string) {} });
    vi.stubGlobal('speechSynthesis', {
      cancel, speak, paused: false, pause: vi.fn(), resume: vi.fn(),
      getVoices: () => [{ default: true, lang: 'en-US', localService: true, name: 'English', voiceURI: 'en' }],
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    const oldMedia = render(<LessonAudioPlayer audioUrl="/first" text="First" />);
    const audio = await screen.findByLabelText('Lesson audio');
    render(<SpeechHarness />);
    fireEvent.play(audio);
    fireEvent.click(screen.getByText('Speak'));
    expect(pause).toHaveBeenCalledOnce();
    expect(screen.getByText('speaking')).toBeInTheDocument();
    const cancels = cancel.mock.calls.length;
    oldMedia.unmount();
    expect(cancel).toHaveBeenCalledTimes(cancels);
    render(<LessonAudioPlayer audioUrl="/second" text="Second" />);
    const next = await screen.findByLabelText('Lesson audio');
    const utterance = speak.mock.calls.at(-1)?.[0];
    fireEvent.play(next);
    expect(cancel).toHaveBeenCalledTimes(cancels + 1);
    expect(screen.getByText('idle')).toBeInTheDocument();
    act(() => utterance.onend());
    const pauses = pause.mock.calls.length;
    fireEvent.click(screen.getByText('Speak'));
    expect(pause).toHaveBeenCalledTimes(pauses + 1);
  });
});
