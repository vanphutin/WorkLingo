import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../../../../lib/api/api-client';
import { apiClient, type LearnerActivityDto, type LearningSessionDto } from '../../../../../lib/api/api-client';
import PlacementSessionPage from './page';

vi.mock('../../../../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getActivity: vi.fn(),
      getSession: vi.fn(),
      startSession: vi.fn(),
    },
  };
});

const mockPlacementSession: LearningSessionDto = {
  id: 'placement-session-123',
  clientSessionId: 'client-sess-123',
  lessonVersionId: 'lesson-ver-123',
  purpose: 'placement',
  durationMinutes: 60,
  status: 'in_progress',
  currentCheckpoint: 0,
  mission: {
    id: 'mission-1',
    title: 'Workplace Placement Assessment',
  },
  plan: {
    durationMinutes: 60,
    missionId: 'mission-1',
    lessonVersionId: 'lesson-ver-123',
    blocks: [
      {
        type: 'readDecode',
        order: 1,
        targetMinutes: 15,
        activityIds: ['act-1'],
        skills: ['reading'],
      },
    ],
  },
  blocks: [
    {
      id: 'block-1',
      type: 'readDecode',
      order: 1,
      targetMinutes: 15,
      activityIds: ['act-1'],
      status: 'available',
    },
  ],
  attempts: [],
};

const mockActivity: LearnerActivityDto = {
  id: 'act-1',
  slug: 'read-email',
  activityType: 'reading',
  learningBlock: 'readDecode',
  skills: ['reading'],
  content: [],
  languageBlocks: [],
  payload: {
    prompt: 'Read the email and answer.',
    questions: [
      {
        slug: 'q1',
        prompt: 'What is the topic?',
        options: ['Project status', 'Team introduction'],
      },
    ],
  },
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('PlacementSessionPage', () => {
  it('restores placement session and checkpoint on load/refresh', async () => {
    vi.mocked(apiClient.getSession).mockResolvedValue(mockPlacementSession);
    vi.mocked(apiClient.getActivity).mockResolvedValue(mockActivity);

    render(<PlacementSessionPage params={Promise.resolve({ sessionId: 'placement-session-123' })} />);

    await waitFor(() => {
      expect(screen.getByText('Placement assessment')).toBeInTheDocument();
      expect(screen.getByText('Workplace Placement Assessment')).toBeInTheDocument();
      expect(screen.getByText('Read the email and answer.')).toBeInTheDocument();
    });

    expect(apiClient.getSession).toHaveBeenCalledWith('placement-session-123');
    expect(apiClient.getActivity).toHaveBeenCalledWith('placement-session-123', 'act-1');
  });

  it('rejects ordinary learning sessions that do not have placement purpose', async () => {
    const ordinarySession: LearningSessionDto = {
      ...mockPlacementSession,
      purpose: 'learning',
    };
    vi.mocked(apiClient.getSession).mockResolvedValue(ordinarySession);

    render(<PlacementSessionPage params={Promise.resolve({ sessionId: 'placement-session-123' })} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/only placement assessment sessions can be opened here/i);
    });

    expect(screen.queryByText('Workplace Placement Assessment')).not.toBeInTheDocument();
  });

  it('renders completion state with link returning to /onboarding', async () => {
    const completedSession: LearningSessionDto = {
      ...mockPlacementSession,
      status: 'completed',
      currentCheckpoint: 1,
    };
    vi.mocked(apiClient.getSession).mockResolvedValue(completedSession);

    render(<PlacementSessionPage params={Promise.resolve({ sessionId: 'placement-session-123' })} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /placement assessment complete/i })).toBeInTheDocument();
      const returnLink = screen.getByRole('link', { name: /review assessment status/i });
      expect(returnLink).toHaveAttribute('href', '/onboarding');
    });
  });
});