import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  LearnerActivityDto,
  LearningSessionDto,
} from '../../lib/api/api-client';
import { ActivityRenderer, isActivityComplete } from './activity-renderer';
import { SessionShell } from './session-shell';

const mockReadingActivity: LearnerActivityDto = {
  id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90',
  slug: 'read-email',
  activityType: 'reading',
  learningBlock: 'readDecode',
  skills: ['reading'],
  content: [
    {
      slug: 'intro-email',
      type: 'email',
      text: 'Subject: Team introduction\nDear team, I am eager to start.',
    },
  ],
  languageBlocks: [
    {
      slug: 'eager-to',
      canonicalForm: 'eager to',
    },
  ],
  payload: {
    prompt: 'Read the email and answer all questions.',
    questions: [
      {
        slug: 'q1',
        prompt: 'What is the topic of the email?',
        options: ['Project status', 'Team introduction'],
      },
    ],
  },
};

const mockWritingActivity: LearnerActivityDto = {
  id: '18b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d',
  slug: 'write-reply',
  activityType: 'writing',
  learningBlock: 'respond',
  skills: ['writing'],
  content: [],
  languageBlocks: [],
  payload: {
    prompt: 'Write a short greeting to your new teammate.',
    rubric: 'Clear greeting, friendly tone.',
  },
};

const mockListeningActivity: LearnerActivityDto = {
  id: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f90a1b2',
  slug: 'listen-dialogue',
  activityType: 'listening',
  learningBlock: 'listenReason',
  skills: ['listening'],
  content: [
    {
      slug: 'audio-placeholder',
      type: 'audio_transcript',
      text: '[Audio placeholder]: "Hi, welcome to the engineering team."',
    },
  ],
  languageBlocks: [],
  payload: {
    prompt: 'Listen to the greeting and choose the correct department.',
    questions: [
      {
        slug: 'dept',
        prompt: 'Which department was mentioned?',
        options: ['Engineering', 'Marketing'],
      },
    ],
  },
};

const mockSpeakingActivity: LearnerActivityDto = {
  id: '07a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c',
  slug: 'speak-greeting',
  activityType: 'speaking',
  learningBlock: 'respond',
  skills: ['speaking'],
  content: [],
  languageBlocks: [],
  payload: {
    prompt: 'Say your name and department clearly.',
  },
};

const createMockSession = (currentCheckpoint = 0): LearningSessionDto => ({
  id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  clientSessionId: 'f1e2d3c4-b5a6-7980-1234-56789abcdef0',
  lessonVersionId: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  durationMinutes: 60,
  status: 'in_progress',
  currentCheckpoint,
  mission: {
    id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    title: 'Introduce yourself to a new colleague',
  },
  plan: {
    durationMinutes: 60,
    missionId: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    lessonVersionId: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    blocks: [
      {
        type: 'activate',
        order: 1,
        targetMinutes: 15,
        activityIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
        skills: ['reading'],
      },
      {
        type: 'readDecode',
        order: 2,
        targetMinutes: 15,
        activityIds: ['d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90'],
        skills: ['reading'],
      },
      {
        type: 'listenReason',
        order: 3,
        targetMinutes: 15,
        activityIds: ['f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f90a1b2'],
        skills: ['listening'],
      },
      {
        type: 'respond',
        order: 4,
        targetMinutes: 15,
        activityIds: [
          '07a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c',
          '18b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d',
        ],
        skills: ['speaking', 'writing'],
      },
    ],
  },
  blocks: [
    {
      id: 'block-1',
      type: 'activate',
      order: 1,
      targetMinutes: 15,
      activityIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
      status: 'completed',
    },
    {
      id: 'block-2',
      type: 'readDecode',
      order: 2,
      targetMinutes: 15,
      activityIds: ['d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90'],
      status: 'available',
    },
    {
      id: 'block-3',
      type: 'listenReason',
      order: 3,
      targetMinutes: 15,
      activityIds: ['f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f90a1b2'],
      status: 'available',
    },
    {
      id: 'block-4',
      type: 'respond',
      order: 4,
      targetMinutes: 15,
      activityIds: [
        '07a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c',
        '18b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d',
      ],
      status: 'available',
    },
  ],
  attempts: [],
});

afterEach(cleanup);

describe('SessionShell and Activity Renderers', () => {
  it('requires every comprehension answer even when questions are answered out of order', () => {
    const twoQuestionActivity: LearnerActivityDto = {
      ...mockReadingActivity,
      payload: {
        ...mockReadingActivity.payload,
        questions: [
          ...(mockReadingActivity.payload.questions as Array<Record<string, unknown>>),
          {
            slug: 'q2',
            prompt: 'What is the writer feeling?',
            options: ['Eager', 'Worried'],
          },
        ],
      },
    };
    const answers: number[] = [];
    answers[1] = 0;

    expect(isActivityComplete(twoQuestionActivity, { answerIndexes: answers })).toBe(false);
  });

  it('renders four named blocks in canonical order without countdown pressure', () => {
    const session = createMockSession(0);
    render(
      <SessionShell
        session={session}
        currentActivity={mockReadingActivity}
        onSubmitAttempt={vi.fn()}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
      />,
    );

    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Read & Decode')).toBeInTheDocument();
    expect(screen.getByText('Listen & Reason')).toBeInTheDocument();
    expect(screen.getByText('Respond')).toBeInTheDocument();
    expect(screen.queryByText(/00:\d\d/)).not.toBeInTheDocument();
  });

  it('keeps Continue button disabled until current activity satisfies completion rule', async () => {
    const session = createMockSession(0);
    render(
      <SessionShell
        session={session}
        currentActivity={mockReadingActivity}
        onSubmitAttempt={vi.fn()}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
      />,
    );

    const continueButton = screen.getByRole('button', { name: /continue|submit/i });
    expect(continueButton).toBeDisabled();

    // Select the question answer
    fireEvent.click(screen.getByLabelText('Team introduction'));
    expect(continueButton).not.toBeDisabled();
  });

  it('retains typed text and displays Retry upon API failure during submit', async () => {
    const session = createMockSession(3);
    const onSubmitAttempt = vi.fn().mockRejectedValueOnce(new Error('Network failure'));

    render(
      <SessionShell
        session={session}
        currentActivity={mockWritingActivity}
        onSubmitAttempt={onSubmitAttempt}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText(/your written response/i);
    fireEvent.change(textarea, { target: { value: 'Hello teammate, glad to meet you!' } });

    const submitBtn = screen.getByRole('button', { name: /continue|submit/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/submission failed|network failure/i);
    });

    // Verify typed text is preserved
    expect(screen.getByLabelText(/your written response/i)).toHaveValue(
      'Hello teammate, glad to meet you!',
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('reuses the same idempotency key when a failed submission is retried', async () => {
    const session = createMockSession(3);
    const onSubmitAttempt = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({
        id: 'attempt-1',
        learnerId: 'learner-1',
        sessionId: session.id,
        activityId: mockWritingActivity.id,
        clientAttemptId: 'ignored-by-assertion',
        evaluationStatus: 'submitted',
        score: null,
        feedback: 'Saved',
        createdAt: new Date().toISOString(),
        rawResponse: { text: 'Hello teammate, glad to meet you!' },
        normalizedResponse: { text: 'Hello teammate, glad to meet you!' },
      });

    render(
      <SessionShell
        session={session}
        currentActivity={mockWritingActivity}
        onSubmitAttempt={onSubmitAttempt}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/your written response/i), {
      target: { value: 'Hello teammate, glad to meet you!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByRole('button', { name: /retry/i });
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(onSubmitAttempt).toHaveBeenCalledTimes(2));
    expect(onSubmitAttempt.mock.calls[0]?.[2]).toBeTruthy();
    expect(onSubmitAttempt.mock.calls[1]?.[2]).toBe(onSubmitAttempt.mock.calls[0]?.[2]);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('shows evaluation feedback when a comprehension answer needs another attempt', async () => {
    const session = createMockSession(1);
    const onSubmitAttempt = vi.fn().mockResolvedValue({
      id: 'attempt-1',
      learnerId: 'learner-1',
      sessionId: session.id,
      activityId: mockReadingActivity.id,
      clientAttemptId: 'attempt-key-1',
      evaluationStatus: 'evaluated',
      score: 0,
      feedback: 'Review the evidence and try again',
      createdAt: new Date().toISOString(),
      rawResponse: { answerIndexes: [0] },
      normalizedResponse: { answerIndexes: [0] },
    });

    render(
      <SessionShell
        session={session}
        currentActivity={mockReadingActivity}
        onSubmitAttempt={onSubmitAttempt}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Project status'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Review the evidence and try again',
    );
  });

  it('restores persisted checkpoint and raw response after refresh/remount', () => {
    const sessionWithAttempt: LearningSessionDto = {
      ...createMockSession(1),
      attempts: [
        {
          id: 'att-1',
          learnerId: 'learner-1',
          sessionId: 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d',
          activityId: mockReadingActivity.id,
          clientAttemptId: 'att-uuid-1',
          evaluationStatus: 'evaluated',
          score: 1,
          feedback: 'Good job',
          createdAt: new Date().toISOString(),
          rawResponse: { answerIndexes: [1] },
          normalizedResponse: { answerIndexes: [1] },
        },
      ],
    };

    render(
      <SessionShell
        session={sessionWithAttempt}
        currentActivity={mockReadingActivity}
        onSubmitAttempt={vi.fn()}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
      />,
    );

    // Should reflect that option 1 was selected previously
    const radioOption = screen.getByLabelText('Team introduction') as HTMLInputElement;
    expect(radioOption.checked).toBe(true);
  });

  it('restores the most recent response when an activity has multiple attempts', () => {
    const baseAttempt = {
      id: 'att-1',
      learnerId: 'learner-1',
      sessionId: createMockSession().id,
      activityId: mockReadingActivity.id,
      clientAttemptId: 'att-uuid-1',
      evaluationStatus: 'evaluated' as const,
      score: 0,
      feedback: 'Try again',
      createdAt: new Date('2026-10-04T01:00:00.000Z').toISOString(),
      rawResponse: { answerIndexes: [0] },
      normalizedResponse: { answerIndexes: [0] },
    };
    const sessionWithAttempts: LearningSessionDto = {
      ...createMockSession(1),
      attempts: [
        baseAttempt,
        {
          ...baseAttempt,
          id: 'att-2',
          clientAttemptId: 'att-uuid-2',
          createdAt: new Date('2026-10-04T01:01:00.000Z').toISOString(),
          rawResponse: { answerIndexes: [1] },
          normalizedResponse: { answerIndexes: [1] },
        },
      ],
    };

    render(
      <SessionShell
        session={sessionWithAttempts}
        currentActivity={mockReadingActivity}
        onSubmitAttempt={vi.fn()}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Team introduction')).toBeChecked();
  });

  it('renders speaking activity with clear notification that recording arrives in Increment 4', () => {
    render(
      <ActivityRenderer
        activity={mockSpeakingActivity}
        value=""
        onChange={vi.fn()}
        savedResponse={null}
      />,
    );

    expect(screen.getAllByText(/increment 4/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/spoken response/i)).toBeInTheDocument();
  });

  it('renders a truthful listening placeholder without a fake playback control', () => {
    const { container } = render(
      <ActivityRenderer
        activity={mockListeningActivity}
        value={{ answerIndexes: [] }}
        onChange={vi.fn()}
        savedResponse={null}
      />,
    );

    expect(screen.getByText(/placeholder audio/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /play audio/i })).not.toBeInTheDocument();
    const audioElement = container.querySelector('audio');
    expect(audioElement).not.toBeInTheDocument();
  });

  it('exposes semantic landmarks in reading order', () => {
    const session = createMockSession(0);
    const { container } = render(
      <SessionShell
        session={session}
        currentActivity={mockReadingActivity}
        onSubmitAttempt={vi.fn()}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
      />,
    );

    expect(container.querySelector('main')).toBeInTheDocument();
    expect(container.querySelector('nav')).toBeInTheDocument();
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(container.querySelector('aside')).toBeInTheDocument();
  });

  it('surfaces pause failures without changing the session state', async () => {
    render(
      <SessionShell
        session={createMockSession(1)}
        currentActivity={mockReadingActivity}
        onSubmitAttempt={vi.fn()}
        onPauseSession={vi.fn().mockRejectedValue(new Error('Network failure'))}
        onResumeSession={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pause session' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not pause session/i);
    expect(screen.getByRole('button', { name: 'Pause session' })).toBeEnabled();
  });

  it('renders completed progress without a fabricated current activity', () => {
    const completedSession: LearningSessionDto = {
      ...createMockSession(5),
      status: 'completed',
      blocks: createMockSession(5).blocks.map((block) => ({
        ...block,
        status: 'completed' as const,
      })),
    };

    render(
      <SessionShell
        session={completedSession}
        currentActivity={null}
        onSubmitAttempt={vi.fn()}
        onPauseSession={vi.fn()}
        onResumeSession={vi.fn()}
        isCompleted
      />,
    );

    expect(screen.getByRole('heading', { name: 'Session Completed!' })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="step"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
