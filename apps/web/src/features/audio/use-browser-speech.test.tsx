import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrowserSpeech } from './use-browser-speech';

class FakeUtterance {
  lang = '';
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  volume = 1;

  constructor(text: string) { this.text = text; }
}

const englishVoice = {
  default: true, lang: 'en-US', localService: true,
  name: 'English Voice', voiceURI: 'voice-en',
} as SpeechSynthesisVoice;

function Harness({ text = 'Hello team', rate, volume }: { readonly text?: string; readonly rate?: number; readonly volume?: number }) {
  const speech = useBrowserSpeech({ lang: 'en-US', preferredVoiceId: 'missing', text, ...(rate === undefined ? {} : { rate }), ...(volume === undefined ? {} : { volume }) });
  return (
    <div>
      <p>{speech.status}</p>
      <p>{speech.resolvedVoice?.voiceURI ?? 'no voice'}</p>
      <button type="button" onClick={speech.play}>Play</button>
      <button type="button" onClick={speech.pauseOrResume}>Pause or resume</button>
      <button type="button" onClick={speech.stop}>Stop</button>
    </div>
  );
}

describe('useBrowserSpeech', () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  const pause = vi.fn();
  const resume = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel, getVoices: () => [englishVoice], paused: false,
        pause, resume, speak,
        addEventListener: vi.fn(), removeEventListener: vi.fn(),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not autoplay and falls back to the first English voice', () => {
    render(<Harness />);
    expect(speak).not.toHaveBeenCalled();
    expect(screen.getByText('voice-en')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0]?.[0]).toMatchObject({
      lang: 'en-US', text: 'Hello team', voice: englishVoice,
    });
  });

  it('supports pause, resume, stop and cancels speech when text changes or unmounts', () => {
    const { rerender, unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause or resume' }));
    expect(pause).toHaveBeenCalledOnce();

    Object.defineProperty(window.speechSynthesis, 'paused', { value: true });
    fireEvent.click(screen.getByRole('button', { name: 'Pause or resume' }));
    expect(resume).toHaveBeenCalledOnce();

    rerender(<Harness text="Updated text" />);
    expect(cancel).toHaveBeenCalled();
    unmount();
    expect(cancel).toHaveBeenCalledTimes(3);
  });

  it('applies learner playback speed and volume to browser speech', () => {
    render(<Harness rate={1.25} volume={0.6} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(speak.mock.calls[0]?.[0]).toMatchObject({ rate: 1.25, volume: 0.6 });
  });
});
