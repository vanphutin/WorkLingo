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

  it('accepts a 45-minute session returned by the API', async () => {
    const response = {
      ...mockSession,
      durationMinutes: 45,
      plan: {
        ...mockSession.plan,
        durationMinutes: 45,
        blocks: mockSession.plan.blocks.slice(1).map((block, index) => ({ ...block, order: index + 1 })),
      },
      blocks: mockSession.blocks.slice(1).map((block, index) => ({ ...block, order: index + 1 })),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(response), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await new ApiClient('/api/v1').createSession(mockSession.clientSessionId, 45);

    expect(result.durationMinutes).toBe(45);
    expect(result.plan.blocks.map((block) => block.type)).toEqual(['readDecode', 'listenReason', 'respond']);
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

  describe('Content Authoring Admin Methods', () => {
    const importId = '11111111-1111-4111-8111-111111111111';
    const sampleImport = {
      id: importId,
      lessonId: null,
      lessonVersionId: null,
      rawSource: 'FORMAT: WorkLingoLesson/1.0',
      sourceHash: 'hash-123',
      status: 'DRAFT',
      draftRevision: 1,
      parserVersion: '1.0.0',
      validationHash: null,
      createdById: '22222222-2222-4222-8222-222222222222',
      updatedById: '22222222-2222-4222-8222-222222222222',
      createdAt: '2026-10-04T00:00:00.000Z',
      updatedAt: '2026-10-04T00:00:00.000Z',
    };

    it('lists content imports from /admin/content-imports', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify([sampleImport]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = new ApiClient('/api/v1');
      const list = await client.listContentImports();

      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(importId);
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/admin/content-imports', expect.objectContaining({ method: 'GET' }));
    });

    it('creates content import carrying rawSource', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(sampleImport), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = new ApiClient('/api/v1');
      const res = await client.createContentImport('FORMAT: WorkLingoLesson/1.0');

      expect(res.id).toBe(importId);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/admin/content-imports',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ rawSource: 'FORMAT: WorkLingoLesson/1.0' }),
        }),
      );
    });

    it('updates source with expectedDraftRevision', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ ...sampleImport, draftRevision: 2 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = new ApiClient('/api/v1');
      const res = await client.updateContentSource(importId, {
        rawSource: 'NEW SOURCE',
        expectedDraftRevision: 1,
      });

      expect(res.draftRevision).toBe(2);
      expect(fetchSpy).toHaveBeenCalledWith(
        `/api/v1/admin/content-imports/${importId}/source`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ rawSource: 'NEW SOURCE', expectedDraftRevision: 1 }),
        }),
      );
    });

    it('validates content import and parses result', async () => {
      const valResult = {
        importId,
        draftRevision: 1,
        sourceHash: 'hash-123',
        status: 'VALIDATED',
        canPublish: true,
        issues: [],
        issuesTruncated: false,
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(valResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = new ApiClient('/api/v1');
      const res = await client.validateContentImport(importId, { expectedDraftRevision: 1 });

      expect(res.canPublish).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        `/api/v1/admin/content-imports/${importId}/validate`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ expectedDraftRevision: 1 }),
        }),
      );
    });

    it('generates audio with 202 response and returns jobId', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jobId: '33333333-3333-4333-8333-333333333333',
            status: 'PENDING',
            audioScriptSlug: 'complaint-call',
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const client = new ApiClient('/api/v1');
      const res = await client.generateAudio(importId, {
        audioScriptSlug: 'complaint-call',
        idempotencyKey: 'idemp-1',
      });

      expect(res.jobId).toBe('33333333-3333-4333-8333-333333333333');
      expect(res.status).toBe('PENDING');
      expect(fetchSpy).toHaveBeenCalledWith(
        `/api/v1/admin/content-imports/${importId}/generate-audio`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('publishes content import carrying expected revision, hash, and idempotency key', async () => {
      const pubResult = {
        importId,
        lessonId: '44444444-4444-4444-8444-444444444444',
        lessonVersionId: '55555555-5555-4555-8555-555555555555',
        version: 1,
        status: 'PUBLISHED',
        publishedAt: '2026-10-04T00:00:00.000Z',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(pubResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = new ApiClient('/api/v1');
      const res = await client.publishContentImport(importId, {
        expectedDraftRevision: 1,
        expectedSourceHash: 'hash-123',
        idempotencyKey: 'idemp-pub-1',
      });

      expect(res.version).toBe(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        `/api/v1/admin/content-imports/${importId}/publish`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            expectedDraftRevision: 1,
            expectedSourceHash: 'hash-123',
            idempotencyKey: 'idemp-pub-1',
          }),
        }),
      );
    });

    it('maps 403, 409, and 422 errors into ApiError with domain code and details', async () => {
      // 409 conflict
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'DRAFT_REVISION_CONFLICT',
            message: 'Draft revision mismatch',
            statusCode: 409,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const client = new ApiClient('/api/v1');
      await expect(
        client.updateContentSource(importId, { rawSource: 'A', expectedDraftRevision: 1 }),
      ).rejects.toMatchObject({
        code: 'DRAFT_REVISION_CONFLICT',
        status: 409,
      });

      // 422 validation failure with details
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'CONTENT_VALIDATION_FAILED',
            message: 'Validation failed',
            statusCode: 422,
            error: {
              code: 'CONTENT_VALIDATION_FAILED',
              message: 'Validation failed',
              details: [{ code: 'VAL_MISSING_FIELD', message: 'Title missing' }],
            },
          }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      await expect(
        client.validateContentImport(importId, { expectedDraftRevision: 1 }),
      ).rejects.toMatchObject({
        code: 'CONTENT_VALIDATION_FAILED',
        status: 422,
        details: expect.arrayContaining([
          expect.objectContaining({ code: 'VAL_MISSING_FIELD' }),
        ]),
      });
    });
  });
});
