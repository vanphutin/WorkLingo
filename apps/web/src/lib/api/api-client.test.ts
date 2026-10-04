import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiClient,
  ApiError,
  type LearningSessionDto,
} from './api-client';

const mockSession: LearningSessionDto = {
  id: 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d',
  clientSessionId: 'f1e2d3c4-b5a6-4980-8234-56789abcdef0',
  lessonVersionId: 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e',
  durationMinutes: 60,
  status: 'planned',
  currentCheckpoint: 0,
  mission: {
    id: 'c3d4e5f6-a7b8-49c0-81e2-3a4b5c6d7e8f',
    title: 'Introduce yourself to a new colleague',
  },
  plan: {
    durationMinutes: 60,
    missionId: 'c3d4e5f6-a7b8-49c0-81e2-3a4b5c6d7e8f',
    lessonVersionId: 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e',
    blocks: [
      {
        type: 'activate',
        order: 1,
        targetMinutes: 15,
        activityIds: ['d4e5f6a7-b8c9-4d1e-8f3a-4b5c6d7e8f90'],
        skills: ['reading'],
      },
      {
        type: 'readDecode',
        order: 2,
        targetMinutes: 15,
        activityIds: ['e5f6a7b8-c9d0-4e2f-8a4b-5c6d7e8f90a1'],
        skills: ['reading'],
      },
      {
        type: 'listenReason',
        order: 3,
        targetMinutes: 15,
        activityIds: ['f6a7b8c9-d0e1-4f3a-8b5c-6d7e8f90a1b2'],
        skills: ['listening'],
      },
      {
        type: 'respond',
        order: 4,
        targetMinutes: 15,
        activityIds: [
          '07a8b9c0-d1e2-4f4a-8b6c-7d8e9f0a1b2c',
          '18b9c0d1-e2f3-4a5b-8c7d-8e9f0a1b2c3d',
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
      activityIds: ['d4e5f6a7-b8c9-4d1e-8f3a-4b5c6d7e8f90'],
      status: 'available',
    },
    {
      id: 'block-2',
      type: 'readDecode',
      order: 2,
      targetMinutes: 15,
      activityIds: ['e5f6a7b8-c9d0-4e2f-8a4b-5c6d7e8f90a1'],
      status: 'available',
    },
    {
      id: 'block-3',
      type: 'listenReason',
      order: 3,
      targetMinutes: 15,
      activityIds: ['f6a7b8c9-d0e1-4f3a-8b5c-6d7e8f90a1b2'],
      status: 'available',
    },
    {
      id: 'block-4',
      type: 'respond',
      order: 4,
      targetMinutes: 15,
      activityIds: [
        '07a8b9c0-d1e2-4f4a-8b6c-7d8e9f0a1b2c',
        '18b9c0d1-e2f3-4a5b-8c7d-8e9f0a1b2c3d',
      ],
      status: 'available',
    },
  ],
  attempts: [],
};

describe('ApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes credentials: "include" and parses created session response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockSession), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new ApiClient('/api/v1');
    const result = await client.createSession('f1e2d3c4-b5a6-4980-8234-56789abcdef0', 60);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/learning-sessions',
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
        }),
        body: JSON.stringify({
          clientSessionId: 'f1e2d3c4-b5a6-4980-8234-56789abcdef0',
          durationMinutes: 60,
        }),
      }),
    );
    expect(result.id).toBe(mockSession.id);
    expect(result.durationMinutes).toBe(60);
  });

  it('throws structured ApiError when backend returns an error envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_SESSION_DURATION',
            message: 'Only 60-minute sessions are supported in this increment',
            requestId: 'req-123',
          },
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const client = new ApiClient('/api/v1');
    let thrownError: unknown;
    try {
      await client.createSession('f1e2d3c4-b5a6-4980-8234-56789abcdef0', 45);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(ApiError);
    if (thrownError instanceof ApiError) {
      expect(thrownError.code).toBe('INVALID_SESSION_DURATION');
      expect(thrownError.status).toBe(422);
      expect(thrownError.requestId).toBe('req-123');
    }
  });

  it('reads session, starts, pauses, and resumes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify(mockSession), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    const client = new ApiClient('/api/v1');
    await client.getSession(mockSession.id);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      `/api/v1/learning-sessions/${mockSession.id}`,
      expect.objectContaining({ credentials: 'include', method: 'GET' }),
    );

    await client.startSession(mockSession.id);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      `/api/v1/learning-sessions/${mockSession.id}/start`,
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );

    await client.pauseSession(mockSession.id);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      `/api/v1/learning-sessions/${mockSession.id}/pause`,
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );

    await client.resumeSession(mockSession.id);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      `/api/v1/learning-sessions/${mockSession.id}/resume`,
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );
  });

  it('fetches learner-safe activity payload and submits attempt', async () => {
    const mockActivity = {
      id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90',
      slug: 'welcome-reading',
      activityType: 'reading' as const,
      learningBlock: 'readDecode' as const,
      skills: ['reading' as const],
      content: [{ slug: 'welcome-email', type: 'email', text: 'Hello colleague' }],
      languageBlocks: [{ slug: 'welcome-to', canonicalForm: 'welcome to' }],
      payload: {
        prompt: 'Read and answer',
        questions: [{ slug: 'q1', prompt: 'What is this?', options: ['Email', 'Letter'] }],
      },
    };

    const mockAttempt = {
      id: 'attempt-1',
      learnerId: 'learner-1',
      sessionId: mockSession.id,
      activityId: mockActivity.id,
      clientAttemptId: 'attempt-uuid-1',
      evaluationStatus: 'evaluated' as const,
      score: 1,
      feedback: 'Correct',
      createdAt: new Date().toISOString(),
      rawResponse: { answerIndexes: [0] },
      normalizedResponse: { answerIndexes: [0] },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockActivity), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockAttempt), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const client = new ApiClient('/api/v1');
    const activity = await client.getActivity(mockSession.id, mockActivity.id);
    expect(activity.activityType).toBe('reading');

    const attempt = await client.submitAttempt(mockActivity.id, {
      sessionId: mockSession.id,
      clientAttemptId: 'attempt-uuid-1',
      response: { answerIndexes: [0] },
    });
    expect(attempt.evaluationStatus).toBe('evaluated');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('fetches learner progress summary', async () => {
    const mockProgress = {
      activityAttempts: 3,
      completedActivities: 2,
      currentLevelCode: 'FOUNDATION_1',
      sessions: {
        completed: 1,
        inProgress: 1,
        paused: 0,
        planned: 1,
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockProgress), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new ApiClient('/api/v1');
    const progress = await client.getProgress();
    expect(progress.completedActivities).toBe(2);
    expect(progress.currentLevelCode).toBe('FOUNDATION_1');
  });
});
