import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LearnerActivityDto } from '../../../lib/api/api-client';
import { ListeningActivity } from './listening-activity';

afterEach(cleanup);

describe('ListeningActivity', () => {
  it('uses session-bound audio without autoplay', () => {
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

    const audio = screen.getByLabelText('Lesson audio') as HTMLAudioElement;
    expect(audio.autoplay).toBe(false);
    expect(audio.getAttribute('src')).toContain(`/learning-sessions/00000000-0000-4000-8000-000000000020/activities/${activity.id}/audio`);
  });
});
