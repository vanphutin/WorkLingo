import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LearnerActivityDto } from '../../../lib/api/api-client';
import { ListeningActivity } from './listening-activity';
import { audioSettingsClient } from '../../../lib/api/audio-settings-client';

beforeEach(() => {
  vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockResolvedValue({
    browserVoiceId: null, sourceId: 'system-default',
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const transcript = 'Mai: Hello.\nAn: Good morning.';
const listeningActivity: LearnerActivityDto = {
  id: '00000000-0000-4000-8000-000000000010', slug: 'listen', activityType: 'listening',
  learningBlock: 'listenReason', skills: ['listening'],
  content: [{ slug: 'dialogue', type: 'dialogue', text: transcript }], languageBlocks: [],
  payload: { prompt: 'Listen carefully', questions: [
    { slug: 'q1', prompt: 'Who is speaking?', options: ['Mai', 'Lan'] },
    { slug: 'q2', prompt: 'When?', options: ['Morning', 'Evening'] },
  ] },
};

function completeListen(audio: HTMLElement) {
  fireEvent.play(audio);
  fireEvent.ended(audio);
}

describe('ListeningActivity', () => {
  it('speaks the reviewed rendition rather than the original email in browser mode', async () => {
    vi.mocked(audioSettingsClient.getLearnerSettings).mockResolvedValue({ browserVoiceId: null, sourceId: 'browser-tts' });
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(readonly text: string) {} });
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), paused: false,
      getVoices: () => [{ name: 'Microsoft Zira', voiceURI: 'zira', lang: 'en-US', localService: true, default: true }], addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(<ListeningActivity activity={{ ...listeningActivity, audioText: 'Hello team.', content: [{ type: 'email', text: 'From: May\nTo: Team\n\nHello team.' }] }} sessionId="00000000-0000-4000-8000-000000000020" value={{ answerIndexes: [] }} onChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Play preview' }));
    expect(speak.mock.calls[0]![0].text).toBe('Hello team.');
    expect(screen.queryByText('From: May')).not.toBeInTheDocument();
  });
  it('uses session-bound audio without autoplay', async () => {
    const activity = {
      id: '00000000-0000-4000-8000-000000000010', slug: 'listen', activityType: 'listening',
      learningBlock: 'listenReason', skills: ['listening'], content: [], languageBlocks: [],
      payload: { prompt: 'Listen carefully', questions: [] },
    } satisfies LearnerActivityDto;

    render(
      <ListeningActivity
        activity={activity}
        sessionId="00000000-0000-4000-8000-000000000020"
        value={{ answerIndexes: [] }}
        onChange={vi.fn()}
      />,
    );

    const audio = await screen.findByLabelText('Lesson audio') as HTMLAudioElement;
    expect(audio.autoplay).toBe(false);
    expect(audio.getAttribute('src')).toContain(`/learning-sessions/00000000-0000-4000-8000-000000000020/activities/${activity.id}/audio`);
  });

  it('replaces a failed audio player with an actionable browser speech fallback', async () => {
    const activity = {
      id: '00000000-0000-4000-8000-000000000010', slug: 'listen', activityType: 'listening',
      learningBlock: 'listenReason', skills: ['listening'],
      content: [{ slug: 'dialogue', type: 'dialogue', text: 'Mai: Welcome to the team.' }],
      languageBlocks: [], payload: { prompt: 'Listen carefully', questions: [] },
    } satisfies LearnerActivityDto;

    render(
      <ListeningActivity
        activity={activity}
        sessionId="00000000-0000-4000-8000-000000000020"
        value={{ answerIndexes: [] }}
        onChange={vi.fn()}
      />,
    );

    fireEvent.error(await screen.findByLabelText('Lesson audio'));

    expect(screen.queryByLabelText('Lesson audio')).not.toBeInTheDocument();
    expect(await screen.findByText(/browser speech is ready as a fallback/i)).toBeInTheDocument();
    expect(screen.queryByText('Mai: Welcome to the team.')).not.toBeInTheDocument();
  });

  it('uses browser speech immediately for a text-placeholder listening activity', async () => {
    vi.mocked(audioSettingsClient.getLearnerSettings).mockResolvedValue({
      browserVoiceId: null, sourceId: 'system-default',
    });
    const activity = {
      id: '00000000-0000-4000-8000-000000000010', slug: 'listen', activityType: 'listening',
      learningBlock: 'listenReason', skills: ['listening'],
      content: [{
        slug: 'dialogue', type: 'dialogue', text: 'Mai: Welcome to the team.',
        audio: { kind: 'textPlaceholder', notice: 'Use a local simulated voice.' },
      }],
      languageBlocks: [], payload: { prompt: 'Listen carefully', questions: [] },
    } satisfies LearnerActivityDto;

    render(
      <ListeningActivity
        activity={activity}
        sessionId="00000000-0000-4000-8000-000000000020"
        value={{ answerIndexes: [] }}
        onChange={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Play preview' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Lesson audio')).not.toBeInTheDocument();
  });

  it('keeps the script out of the page until six complete listens and an explicit reveal', async () => {
    render(<ListeningActivity activity={listeningActivity} sessionId="00000000-0000-4000-8000-000000000020" value={{ answerIndexes: [] }} onChange={vi.fn()} />);
    const audio = await screen.findByLabelText('Lesson audio');
    expect(screen.queryByText(/Mai: Hello\.\s+An: Good morning\./)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show script' })).not.toBeInTheDocument();
    for (let index = 0; index < 5; index++) completeListen(audio);
    expect(screen.queryByRole('button', { name: 'Show script' })).not.toBeInTheDocument();
    completeListen(audio);
    expect(screen.queryByText(/Mai: Hello\.\s+An: Good morning\./)).not.toBeInTheDocument();
    const showScript = screen.getByRole('button', { name: 'Show script' });
    showScript.focus();
    fireEvent.click(showScript);
    expect(screen.getByText(/Mai: Hello\.\s+An: Good morning\./)).toBeVisible();
    const hideScript = screen.getByRole('button', { name: 'Hide script' });
    expect(hideScript).toHaveFocus();
    expect(hideScript).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(hideScript);
    expect(screen.queryByText(/Mai: Hello\.\s+An: Good morning\./)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show script' })).toHaveFocus();
  });

  it('only offers the script while at least one question remains unanswered', async () => {
    const view = render(<ListeningActivity activity={listeningActivity} sessionId="00000000-0000-4000-8000-000000000020" value={{ answerIndexes: [0, 0] }} onChange={vi.fn()} />);
    const audio = await screen.findByLabelText('Lesson audio');
    for (let index = 0; index < 6; index++) completeListen(audio);
    expect(screen.queryByRole('button', { name: 'Show script' })).not.toBeInTheDocument();
    view.rerender(<ListeningActivity activity={listeningActivity} sessionId="00000000-0000-4000-8000-000000000020" value={{ answerIndexes: [0] }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Show script' })).toBeEnabled();
  });

  it('does not count incomplete playback, seeking or duplicate ended events', async () => {
    render(<ListeningActivity activity={listeningActivity} sessionId="00000000-0000-4000-8000-000000000020" value={{ answerIndexes: [] }} onChange={vi.fn()} />);
    const audio = await screen.findByLabelText('Lesson audio');
    for (let index = 0; index < 6; index++) { fireEvent.play(audio); fireEvent.pause(audio); }
    expect(screen.queryByRole('button', { name: 'Show script' })).not.toBeInTheDocument();
    for (let index = 0; index < 6; index++) { fireEvent.play(audio); fireEvent.seeking(audio); fireEvent.ended(audio); }
    expect(screen.queryByRole('button', { name: 'Show script' })).not.toBeInTheDocument();
    completeListen(audio);
    for (let index = 0; index < 6; index++) fireEvent.ended(audio);
    expect(screen.queryByRole('button', { name: 'Show script' })).not.toBeInTheDocument();
    for (let index = 0; index < 5; index++) completeListen(audio);
    expect(screen.getByRole('button', { name: 'Show script' })).toBeEnabled();
  });

  it('does not reuse script access for another activity or session', async () => {
    const view = render(<ListeningActivity activity={listeningActivity} sessionId="00000000-0000-4000-8000-000000000020" value={{ answerIndexes: [] }} onChange={vi.fn()} />);
    const audio = await screen.findByLabelText('Lesson audio');
    for (let index = 0; index < 6; index++) completeListen(audio);
    fireEvent.click(screen.getByRole('button', { name: 'Show script' }));
    view.rerender(<ListeningActivity activity={{ ...listeningActivity, id: '00000000-0000-4000-8000-000000000011' }} sessionId="00000000-0000-4000-8000-000000000020" value={{ answerIndexes: [] }} onChange={vi.fn()} />);
    expect(screen.queryByText(/Mai: Hello\.\s+An: Good morning\./)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show script' })).not.toBeInTheDocument();
    view.rerender(<ListeningActivity activity={listeningActivity} sessionId="00000000-0000-4000-8000-000000000021" value={{ answerIndexes: [] }} onChange={vi.fn()} />);
    expect(screen.queryByText(/Mai: Hello\.\s+An: Good morning\./)).not.toBeInTheDocument();
  });

  it('counts a complete browser dialogue once, excluding stopped, failed and partial speech', async () => {
    vi.mocked(audioSettingsClient.getLearnerSettings).mockResolvedValue({ browserVoiceId: null, sourceId: 'browser-tts' });
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(readonly text: string) {} });
    vi.stubGlobal('speechSynthesis', {
      speak, cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), paused: false,
      getVoices: () => ['David', 'Zira'].map(name => ({ name: `Microsoft ${name}`, voiceURI: name, lang: 'en-US', localService: true, default: false })),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    render(<ListeningActivity activity={listeningActivity} sessionId="00000000-0000-4000-8000-000000000020" value={{ answerIndexes: [] }} onChange={vi.fn()} />);
    await screen.findByRole('button', { name: 'Play preview' });
    fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
    const stopped = speak.mock.calls.at(-1)?.[0];
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    act(() => stopped.onend());
    fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
    act(() => speak.mock.calls.at(-1)?.[0].onerror({ error: 'canceled' }));
    for (let index = 0; index < 6; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
      act(() => speak.mock.calls.at(-1)?.[0].onend());
      expect(screen.queryByRole('button', { name: 'Show script' })).not.toBeInTheDocument();
      act(() => speak.mock.calls.at(-1)?.[0].onend());
    }
    fireEvent.click(screen.getByRole('button', { name: 'Show script' }));
    expect(screen.getByText(/Mai: Hello\.\s+An: Good morning\./)).toBeVisible();
  });
});
