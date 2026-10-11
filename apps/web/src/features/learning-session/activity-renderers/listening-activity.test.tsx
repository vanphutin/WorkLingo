import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LearnerActivityDto } from '../../../lib/api/api-client';
import { ListeningActivity } from './listening-activity';

afterEach(cleanup);

describe('ListeningActivity', () => {
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
    expect(screen.getByText('Mai: Welcome to the team.')).toBeInTheDocument();
  });

  it('uses browser speech immediately for a text-placeholder listening activity', async () => {
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
});
