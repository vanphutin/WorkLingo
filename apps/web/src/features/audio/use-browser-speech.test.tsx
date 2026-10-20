import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

import { useBrowserSpeech } from './use-browser-speech';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

class FakeUtterance {
  lang = '';
  onend: (() => void) | null = null;
  onerror: ((event?: { error: string }) => void) | null = null;
  onstart: (() => void) | null = null;
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

function Harness({ text = 'Hello team', rate, volume, preferredVoiceId = 'missing', itemId }: { readonly text?: string; readonly rate?: number; readonly volume?: number; readonly preferredVoiceId?: string; readonly itemId?: string }) {
  const speech = useBrowserSpeech({ lang: 'en-US', preferredVoiceId, text, ...(itemId ? { itemId, sessionId: 'review' } : {}), ...(rate === undefined ? {} : { rate }), ...(volume === undefined ? {} : { volume }) });
  return (
    <div>
      <p>{speech.status}</p>
      {speech.error && <p role="alert">{speech.error}</p>}
      <p>{speech.resolvedVoice?.voiceURI ?? 'no voice'}</p>
      <button type="button" onClick={speech.play}>Play</button>
      <button type="button" onClick={speech.pauseOrResume}>Pause or resume</button>
      <button type="button" onClick={speech.stop}>Stop</button>
    </div>
  );
}

function SwitchLocale() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('vi')}>Switch language</button>;
}

function ItemHarness({ itemId, sessionId = 'session-one' }: { readonly itemId: string; readonly sessionId?: string }) {
  const speech = useBrowserSpeech({ lang: 'en-US', itemId, sessionId, text: 'Same transcript' });
  return <><p>{speech.status}</p><button onClick={speech.play}>Play</button></>;
}

function SupportHarness() {
  const speech = useBrowserSpeech({ lang: 'en-US', text: 'Hydration check' });
  return <p>{speech.supported ? 'supported' : 'unsupported'}</p>;
}

describe('useBrowserSpeech', () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  const pause = vi.fn();
  const resume = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
    const cancelsAfterChange = cancel.mock.calls.length;
    unmount();
    expect(cancel).toHaveBeenCalledTimes(cancelsAfterChange);
  });

  it('applies learner playback speed and volume to browser speech', () => {
    render(<Harness rate={1.25} volume={0.6} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(speak.mock.calls[0]?.[0]).toMatchObject({ rate: 1.25, volume: 0.6 });
  });

  it('keeps active English speech playing when the interface switches to Vietnamese', () => {
    render(<LocaleProvider initialLocale="en"><SwitchLocale /><Harness /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const cancelsBeforeSwitch = cancel.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByText('speaking')).toBeInTheDocument();
    expect(cancel).toHaveBeenCalledTimes(cancelsBeforeSwitch);
    expect(speak.mock.calls.at(-1)?.[0]).toMatchObject({ lang: 'en-US', text: 'Hello team', voice: englishVoice });
  });

  it('rotates new items deterministically and keeps replay stable after other items play', () => {
    const secondVoice = { ...englishVoice, name: 'British Voice', lang: 'en-GB', voiceURI: 'voice-gb' };
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([secondVoice, englishVoice]);
    const { rerender } = render(<><section aria-label="first"><Harness /></section><section aria-label="second"><Harness text="Second item" /></section></>);
    const first = within(screen.getByLabelText('first'));
    const second = within(screen.getByLabelText('second'));
    fireEvent.click(first.getByText('Play'));
    fireEvent.click(second.getByText('Play'));
    expect(speak.mock.calls.slice(-2).map(([utterance]) => utterance.voice.voiceURI)).toEqual(['voice-en', 'voice-gb']);
    expect(first.getByText('idle')).toBeInTheDocument();
    fireEvent.click(first.getByText('Play'));
    expect(speak.mock.calls.at(-1)?.[0].voice.voiceURI).toBe('voice-en');
    rerender(<><section aria-label="first"><Harness rate={1.5} /></section><section aria-label="second"><Harness text="Second item" /></section></>);
    fireEvent.click(first.getByText('Play'));
    expect(speak.mock.calls.at(-1)?.[0]).toMatchObject({ rate: 1.5, voice: englishVoice });
  });

  it('does not let an unrelated unmount or stop cancel the current owner', () => {
    const first = render(<Harness text="First" />);
    const second = render(<Harness text="Second" />);
    fireEvent.click(within(second.container).getByText('Play'));
    const cancels = cancel.mock.calls.length;
    fireEvent.click(within(first.container).getByText('Stop'));
    first.unmount();
    expect(cancel).toHaveBeenCalledTimes(cancels);
    expect(within(second.container).getByText('speaking')).toBeInTheDocument();
  });

  it('rejects non-English preferred voices and handles late and disappearing voices without switching mid-utterance', () => {
    let voices: SpeechSynthesisVoice[] = [];
    const listeners = new Set<() => void>();
    vi.spyOn(window.speechSynthesis, 'getVoices').mockImplementation(() => voices);
    vi.spyOn(window.speechSynthesis, 'addEventListener').mockImplementation((_event, listener) => { listeners.add(listener as () => void); });
    const { rerender } = render(<Harness preferredVoiceId="voice-vi" />);
    fireEvent.click(screen.getByText('Play'));
    expect(speak).not.toHaveBeenCalled();
    const vietnameseVoice = { ...englishVoice, lang: 'vi-VN', voiceURI: 'voice-vi' };
    voices = [vietnameseVoice, englishVoice];
    act(() => listeners.forEach((listener) => listener()));
    fireEvent.click(screen.getByText('Play'));
    const utterance = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
    expect(utterance.voice).toBe(englishVoice);
    const replacement = { ...englishVoice, voiceURI: 'voice-gb', lang: 'en-GB' };
    voices = [replacement];
    act(() => listeners.forEach((listener) => listener()));
    expect(utterance.voice).toBe(englishVoice);
    expect(screen.getByText('speaking')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Play'));
    expect(speak.mock.calls.at(-1)?.[0].voice).toBe(replacement);
    act(() => utterance.onerror?.());
    expect(screen.getByText('speaking')).toBeInTheDocument();
    rerender(<Harness preferredVoiceId="voice-gb" />);
    fireEvent.click(screen.getByText('Play'));
    expect(speak.mock.calls.at(-1)?.[0].voice).toBe(replacement);
  });

  it('reports synchronous synthesis errors instead of leaving playback speaking', () => {
    speak.mockImplementationOnce(() => { throw new Error('unavailable'); });
    render(<Harness />);
    fireEvent.click(screen.getByText('Play'));
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it.each(['network', 'voice-unavailable', 'synthesis-failed', 'language-unavailable', 'synthesis-unavailable'])(
    'recovers from %s before speech starts using an enabled local voice and keeps replay stable', (error) => {
      const remote = { ...englishVoice, voiceURI: 'a-remote', localService: false };
      const anotherRemote = { ...englishVoice, voiceURI: 'b-remote', localService: false };
      const local = { ...englishVoice, voiceURI: 'c-local' };
      vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([remote, anotherRemote, local]);
      render(<Harness rate={1.25} volume={0.6} />);
      fireEvent.click(screen.getByText('Play'));
      const failed = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
      act(() => failed.onerror?.({ error }));
      const recovered = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
      expect(recovered).not.toBe(failed);
      expect(recovered).toMatchObject({ voice: local, text: 'Hello team', rate: 1.25, volume: 0.6 });
      expect(screen.getByText('speaking')).toBeInTheDocument();
      expect(screen.getByText('c-local')).toBeInTheDocument();
      act(() => { failed.onerror?.({ error }); failed.onend?.(); });
      expect(screen.getByText('speaking')).toBeInTheDocument();
      act(() => recovered.onend?.());
      expect(screen.getByText('idle')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Play'));
      expect(speak.mock.calls.at(-1)?.[0].voice).toBe(local);
    },
  );

  it('bounds recovery and reports the actual Edge error when all voices fail', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([
      englishVoice, ...Array.from({ length: 5 }, (_, index) => ({ ...englishVoice, voiceURI: `other-${index}` })),
    ]);
    render(<Harness />);
    fireEvent.click(screen.getByText('Play'));
    for (let index = 0; index < 3; index++) {
      const utterance = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
      act(() => utterance.onerror?.({ error: 'synthesis-failed' }));
    }
    expect(speak).toHaveBeenCalledTimes(3);
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('synthesis-failed');
  });

  it('does not restart a partially spoken transcript after a failure', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([
      englishVoice, { ...englishVoice, voiceURI: 'other' },
    ]);
    render(<Harness />);
    fireEvent.click(screen.getByText('Play'));
    const utterance = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
    act(() => { utterance.onstart?.(); utterance.onerror?.({ error: 'network' }); });
    expect(speak).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('network');
  });

  it('reports browser permission errors without retrying other voices', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([
      englishVoice, { ...englishVoice, voiceURI: 'other' },
    ]);
    render(<Harness />);
    fireEvent.click(screen.getByText('Play'));
    act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onerror?.({ error: 'not-allowed' }));
    expect(speak).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('not-allowed');
  });

  it('speaks only dialogue lines, switches gender-matched voices and keeps the same character stable', () => {
    const male = { ...englishVoice, name: 'Google UK English Male' };
    const female = { ...englishVoice, name: 'Google UK English Female', voiceURI: 'voice-female' };
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([male, female]);
    render(<Harness text={'An (nam): Hello, my name is An.\nLan (nữ): Hi An.\nAn: Welcome!'} />);
    fireEvent.click(screen.getByText('Play'));
    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0]?.[0]).toMatchObject({ text: 'Hello, my name is An.', voice: male });
    act(() => (speak.mock.calls[0]?.[0] as FakeUtterance).onend?.());
    expect(speak.mock.calls[1]?.[0]).toMatchObject({ text: 'Hi An.', voice: female });
    expect(screen.getByText('speaking')).toBeInTheDocument();
    act(() => (speak.mock.calls[1]?.[0] as FakeUtterance).onend?.());
    expect(speak.mock.calls[2]?.[0]).toMatchObject({ text: 'Welcome!', voice: male });
    act(() => (speak.mock.calls[2]?.[0] as FakeUtterance).onend?.());
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('cancels pending dialogue turns on stop, restart, navigation and native media replacement', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([
      englishVoice, { ...englishVoice, voiceURI: 'second' },
    ]);
    const view = render(<Harness text={'An: Hello.\nLan: Hi.'} />);
    fireEvent.click(screen.getByText('Play'));
    const stopped = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
    fireEvent.click(screen.getByText('Stop'));
    act(() => stopped.onend?.());
    expect(speak).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Play'));
    const restarted = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
    fireEvent.click(screen.getByText('Play'));
    act(() => restarted.onend?.());
    expect(speak).toHaveBeenCalledTimes(3);
    const navigated = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
    view.rerender(<Harness text="New item" />);
    act(() => navigated.onend?.());
    expect(speak).toHaveBeenCalledTimes(3);
    view.rerender(<Harness text={'An: Hello.\nLan: Hi.'} />);
    fireEvent.click(screen.getByText('Play'));
    const replaced = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
    const media = document.createElement('audio'); document.body.appendChild(media);
    fireEvent.play(media);
    act(() => replaced.onend?.());
    expect(speak).toHaveBeenCalledTimes(4);
    fireEvent.ended(media); media.remove();
  });

  it('does not start dialogue with the wrong gender or reuse one voice for two characters', () => {
    render(<Harness text={'An (nam): Hello.\nLan (nữ): Hi.'} />);
    fireEvent.click(screen.getByText('Play'));
    expect(speak).not.toHaveBeenCalled();
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/male|female/i);
  });

  it('holds the next dialogue turn while paused and resumes with the same speed and volume', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([
      englishVoice, { ...englishVoice, voiceURI: 'second' },
    ]);
    render(<Harness text={'An: Hello.\nLan: Hi.'} rate={1.5} volume={0.7} />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Pause or resume'));
    act(() => (speak.mock.calls[0]?.[0] as FakeUtterance).onend?.());
    expect(speak).toHaveBeenCalledOnce();
    expect(screen.getByText('paused')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pause or resume'));
    expect(speak.mock.calls[1]?.[0]).toMatchObject({ text: 'Hi.', rate: 1.5, volume: 0.7 });
    expect(screen.getByText('speaking')).toBeInTheDocument();
  });

  it('never steals another character’s assigned voice during failure recovery', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([
      { ...englishVoice, name: 'Microsoft David - English (United States)' },
      { ...englishVoice, name: 'Microsoft Mark - English (United States)', voiceURI: 'voice-mark' },
      { ...englishVoice, name: 'Microsoft Zira - English (United States)', voiceURI: 'voice-zira' },
    ]);
    render(<Harness text={'An (nam): Hello.\nMinh (nam): Hi.\nLan (nữ): Welcome.'} />);
    fireEvent.click(screen.getByText('Play'));
    act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onerror?.({ error: 'voice-unavailable' }));
    expect(speak).toHaveBeenCalledOnce();
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('voice-unavailable');
  });

  it('reserves unaffected character voices when another voice disappears across remounts', () => {
    const a = { ...englishVoice, name: 'Google UK English Male', voiceURI: 'a' };
    const b = { ...a, voiceURI: 'b' };
    const c = { ...a, voiceURI: 'c' };
    const f = { ...englishVoice, name: 'Google UK English Female', voiceURI: 'f' };
    const getVoices = vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([a, b, c, f]);
    const text = 'An (nam): Hello.\nMinh (nam): Hi.\nLan (nữ): Welcome.';
    const view = render(<Harness itemId="missing-voice" text={text} />);
    fireEvent.click(screen.getByText('Play'));
    for (let index = 0; index < 3; index++) act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onend?.());
    expect(speak.mock.calls.map(([u]) => u.voice.voiceURI)).toEqual(['a', 'b', 'f']);
    view.unmount(); getVoices.mockReturnValue([b, c, f]);
    render(<Harness itemId="missing-voice" text={text} />);
    fireEvent.click(screen.getByText('Play'));
    act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onend?.());
    expect(speak.mock.calls.slice(3).map(([u]) => u.voice.voiceURI)).toEqual(['c', 'b']);
  });

  it('keeps a recovered preferred voice across replay remounts until preference changes', () => {
    const a = { ...englishVoice, name: 'Google UK English Male', voiceURI: 'a', localService: false };
    const c = { ...a, voiceURI: 'c', localService: true };
    const f = { ...englishVoice, name: 'Google UK English Female', voiceURI: 'f' };
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([a, c, f]);
    const text = 'An (nam): Hello.\nLan (nữ): Hi.';
    const view = render(<Harness itemId="recovered-voice" preferredVoiceId="a" text={text} />);
    fireEvent.click(screen.getByText('Play'));
    act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onerror?.({ error: 'network' }));
    expect(speak.mock.calls.at(-1)?.[0].voice.voiceURI).toBe('c');
    act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onend?.());
    act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onend?.());
    view.unmount();
    const replay = render(<Harness itemId="recovered-voice" preferredVoiceId="a" text={text} />);
    fireEvent.click(screen.getByText('Play'));
    expect(speak.mock.calls.at(-1)?.[0].voice.voiceURI).toBe('c');
    replay.rerender(<Harness itemId="recovered-voice" preferredVoiceId="c" text={text} />);
    fireEvent.click(screen.getByText('Play'));
    replay.rerender(<Harness itemId="recovered-voice" preferredVoiceId="a" text={text} />);
    fireEvent.click(screen.getByText('Play'));
    expect(speak.mock.calls.at(-1)?.[0].voice.voiceURI).toBe('a');
  });

  it('keeps unaffected speakers stable after the preferred speaker recovers', () => {
    const a = { ...englishVoice, name: 'Google UK English Male', voiceURI: 'a', localService: false };
    const b = { ...a, voiceURI: 'b', localService: true };
    const c = { ...b, voiceURI: 'c' };
    const f = { ...englishVoice, name: 'Google UK English Female', voiceURI: 'f' };
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([a, b, c, f]);
    const text = 'An (nam): Hello.\nMinh (nam): Hi.\nLan (nữ): Welcome.';
    const view = render(<Harness itemId="three-recovery" text={text} preferredVoiceId="a" />);
    fireEvent.click(screen.getByText('Play'));
    act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onerror?.({ error: 'network' }));
    for (let index = 0; index < 3; index++) act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onend?.());
    expect(speak.mock.calls.map(([u]) => u.voice.voiceURI)).toEqual(['a', 'c', 'b', 'f']);
    view.unmount();
    render(<Harness itemId="three-recovery" text={text} preferredVoiceId="a" />);
    fireEvent.click(screen.getByText('Play'));
    for (let index = 0; index < 3; index++) act(() => (speak.mock.calls.at(-1)?.[0] as FakeUtterance).onend?.());
    expect(speak.mock.calls.slice(4).map(([u]) => u.voice.voiceURI)).toEqual(['c', 'b', 'f']);
  });

  it('stops an old item when its identity changes even if the transcript is identical', () => {
    const { rerender } = render(<ItemHarness itemId="first" />);
    fireEvent.click(screen.getByText('Play'));
    const cancels = cancel.mock.calls.length;
    rerender(<ItemHarness itemId="second" />);
    expect(cancel).toHaveBeenCalledTimes(cancels + 1);
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('shares one voiceschanged listener and removes it only after the last subscriber unmounts', () => {
    const add = vi.spyOn(window.speechSynthesis, 'addEventListener');
    const remove = vi.spyOn(window.speechSynthesis, 'removeEventListener');
    const first = render(<Harness text="First" />);
    const second = render(<Harness text="Second" />);
    expect(add).toHaveBeenCalledTimes(1);
    first.unmount();
    expect(remove).not.toHaveBeenCalled();
    second.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('keeps an earlier item assigned when navigating away and replaying within the mounted session', () => {
    const secondVoice = { ...englishVoice, name: 'British', voiceURI: 'voice-gb', lang: 'en-GB' };
    const thirdVoice = { ...englishVoice, name: 'Australian', voiceURI: 'voice-zz', lang: 'en-AU' };
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([englishVoice, secondVoice, thirdVoice]);
    const view = render(<ItemHarness itemId="first" />);
    fireEvent.click(screen.getByText('Play'));
    view.rerender(<ItemHarness itemId="second" />);
    fireEvent.click(screen.getByText('Play'));
    view.rerender(<ItemHarness itemId="first" />);
    fireEvent.click(screen.getByText('Play'));
    expect(speak.mock.calls.map(([utterance]) => utterance.voice.voiceURI)).toEqual(['voice-en', 'voice-gb', 'voice-en']);
  });

  it('honors an explicit preference that loads late on the next replay without changing active speech', () => {
    let voices: SpeechSynthesisVoice[] = [englishVoice];
    vi.spyOn(window.speechSynthesis, 'getVoices').mockImplementation(() => voices);
    render(<Harness preferredVoiceId="voice-gb" />);
    fireEvent.click(screen.getByText('Play'));
    const utterance = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
    const british = { ...englishVoice, name: 'British', voiceURI: 'voice-gb', lang: 'en-GB' };
    voices = [englishVoice, british];
    expect(utterance.voice).toBe(englishVoice);
    fireEvent.click(screen.getByText('Play'));
    expect(speak.mock.calls.at(-1)?.[0]).toMatchObject({ voice: british, lang: 'en-GB' });
  });

  it('keeps session-item assignments through remounts and separates the same item in another session', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([
      englishVoice,
      { ...englishVoice, voiceURI: 'voice-gb', lang: 'en-GB' },
      { ...englishVoice, voiceURI: 'voice-zz', lang: 'en-AU' },
    ]);
    let view = render(<ItemHarness itemId="first" />);
    fireEvent.click(screen.getByText('Play'));
    view.unmount();
    view = render(<ItemHarness itemId="second" />);
    fireEvent.click(screen.getByText('Play'));
    view.unmount();
    view = render(<ItemHarness itemId="first" />);
    fireEvent.click(screen.getByText('Play'));
    view.unmount();
    render(<ItemHarness itemId="first" sessionId="session-two" />);
    fireEvent.click(screen.getByText('Play'));
    expect(speak.mock.calls.map(([utterance]) => utterance.voice.voiceURI)).toEqual(['voice-en', 'voice-gb', 'voice-en', 'voice-gb']);
  });

  it('does not couple separate unkeyed previews just because their transcripts match', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([
      englishVoice, { ...englishVoice, voiceURI: 'voice-gb', lang: 'en-GB' },
    ]);
    const first = render(<Harness />);
    const second = render(<Harness />);
    fireEvent.click(within(first.container).getByText('Play'));
    fireEvent.click(within(second.container).getByText('Play'));
    expect(speak.mock.calls.map(([utterance]) => utterance.voice.voiceURI)).toEqual(['voice-en', 'voice-gb']);
  });

  it('cancels speech when any native audio starts and pauses native media before speech starts', () => {
    const mediaPause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    render(<><audio aria-label="Other audio" src="/existing-audio" /><Harness /></>);
    const media = screen.getByLabelText('Other audio');
    fireEvent.play(media);
    fireEvent.click(screen.getByText('Play'));
    expect(mediaPause).toHaveBeenCalledOnce();
    const cancels = cancel.mock.calls.length;
    fireEvent.play(media);
    expect(cancel).toHaveBeenCalledTimes(cancels + 1);
    expect(screen.getByText('idle')).toBeInTheDocument();
    fireEvent.ended(media);
  });

  it('hydrates server markup without a browser-capability mismatch', async () => {
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    const markup = renderToString(<SupportHarness />);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.appendChild(container);
    const errors: unknown[] = [];
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <SupportHarness />, { onRecoverableError: (cause) => errors.push(cause) });
    });
    try {
      expect(errors).toEqual([]);
      expect(container).toHaveTextContent('supported');
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
