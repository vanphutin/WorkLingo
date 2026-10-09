import { afterEach, describe, expect, it, vi } from 'vitest';
import { masteryMap, memoryHealth, errorItem, progression, pendingAssessment, sessionId, assessmentId } from '../../features/mastery/test-fixtures';
import { ApiClient } from './api-client';

afterEach(() => vi.unstubAllGlobals());
const client = new ApiClient('/api/v1');
function respond(body: unknown) {
  const network = vi.fn().mockResolvedValue(Response.json(body));
  vi.stubGlobal('fetch', network);
  return network;
}

describe('learner evidence API', () => {
  it('preserves unassessed skills and a scored zero in the exact mastery-map response', async () => {
    respond(masteryMap);
    const map = await client.getMasteryMap();
    expect(map.items[0]?.skills.reading?.score).toBe(0);
    expect(map.items[0]?.skills.speaking).toBeNull();
    expect(map.reviewQueue[0]?.priorityReason).toBe('NEEDS_ATTENTION');
  });
  it('reads the existing per-skill and overall Memory Health shape', async () => {
    respond(memoryHealth);
    const health = await client.getMemoryHealth();
    expect(health.overall.health).toBe(0);
    expect(health.speaking.health).toBeNull();
    expect(health.reading.evaluatedBlocksCount).toBe(1);
  });
  it('requests server pagination and a skill filter with credentials', async () => {
    const network = respond({ items: [{ ...errorItem, skill: 'listening' }], total: 21, page: 2, limit: 20, totalPages: 2 });
    const errors = await client.getErrorBank({ skill: 'listening', page: 2, limit: 20 });
    expect(network).toHaveBeenCalledWith('/api/v1/me/error-bank?skill=listening&page=2&limit=20', expect.objectContaining({ credentials: 'include', method: 'GET' }));
    expect(errors.items[0]?.skill).toBe('listening');
    expect(errors.totalPages).toBe(2);
  });
  it('rejects malformed evidence instead of displaying a missing skill as zero', async () => {
    respond({ items: [{ ...masteryMap.items[0], skills: { reading: null } }], reviewQueue: [] });
    await expect(client.getMasteryMap()).rejects.toThrow();
  });
});

describe('checkpoint API', () => {
  it('accepts progression with no assessment yet', async () => {
    respond(progression);
    expect((await client.getProgression()).latestAssessment).toBeNull();
  });
  it.each(['pending_evaluation', 'reinforcement_required', 'passed', 'not_ready'])('parses the %s assessment without inventing pending scores', async (status) => {
    respond({ ...pendingAssessment, status });
    const result = await client.assessCheckpoint({ sessionId, clientAssessmentId: assessmentId });
    expect(result.status).toBe(status);
    expect(result.skills.speaking.score).toBeNull();
    expect(result.canAdvance).toBe(false);
  });
  it('posts only the source session and request UUID and uses the confirmation endpoint', async () => {
    const network = respond(pendingAssessment);
    await client.assessCheckpoint({ sessionId, clientAssessmentId: assessmentId });
    expect(network).toHaveBeenCalledWith('/api/v1/me/checkpoint-assessments', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ sessionId, clientAssessmentId: assessmentId }),
    }));
    network.mockResolvedValue(Response.json({ ...progression, currentLevelCode: 'FOUNDATION_2', nextLevelCode: null }));
    expect((await client.confirmCheckpoint(assessmentId)).currentLevelCode).toBe('FOUNDATION_2');
    expect(network).toHaveBeenLastCalledWith(`/api/v1/me/checkpoint-assessments/${assessmentId}/confirm`, expect.objectContaining({ method: 'POST' }));
  });
  it.each([
    { status: 'pending_evaluation', canAdvance: true, nextLevelCode: 'FOUNDATION_2' },
    { status: 'passed', canAdvance: true, nextLevelCode: null },
  ])('rejects an ineligible advancement response: %j', async (invalid) => {
    respond({ ...pendingAssessment, ...invalid });
    await expect(client.assessCheckpoint({ sessionId, clientAssessmentId: assessmentId })).rejects.toThrow();
  });
});

describe('Teacher AI learner API', () => {
  const activityId = '00000000-0000-4000-8000-000000000010';
  const learnerSessionId = '00000000-0000-4000-8000-000000000020';
  const attemptId = '00000000-0000-4000-8000-000000000030';
  const recordingId = '00000000-0000-4000-8000-000000000040';

  it('uploads recording bytes and versioned consent as multipart without forcing JSON headers', async () => {
    const network = respond({
      attemptId, recordingId, jobId: '00000000-0000-4000-8000-000000000050', status: 'processing',
    });

    await client.submitRecording({
      activityId, sessionId: learnerSessionId, clientAttemptId: attemptId,
      audio: new Blob(['audio'], { type: 'audio/webm' }), consentAccepted: true,
      consentPolicyVersion: 'recording-v1', consentScope: 'teacher-ai',
    });

    const [, options] = network.mock.calls[0] ?? [];
    expect(options?.body).toBeInstanceOf(FormData);
    expect((options?.headers as Record<string, string>)['content-type']).toBeUndefined();
  });

  it('accepts the recording delete endpoint no-content response', async () => {
    const network = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', network);

    await expect(client.deleteRecording(recordingId)).resolves.toBeUndefined();
    expect(network).toHaveBeenCalledWith(`/api/v1/recordings/${recordingId}`, expect.objectContaining({ method: 'DELETE' }));
  });

  it('builds listening audio URLs at the session-version boundary', () => {
    expect(client.getActivityAudioUrl(learnerSessionId, activityId)).toBe(
      `/api/v1/learning-sessions/${learnerSessionId}/activities/${activityId}/audio`,
    );
  });
});
