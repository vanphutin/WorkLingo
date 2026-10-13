import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IeltsOrientationClient } from './ielts-orientation-client';

describe('IeltsOrientationClient', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  it('uses learner status, start and optimistic progress endpoints', async () => {
    const locked = { state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'], presentation: null, progress: null };
    const progress = { orientationVersionId: crypto.randomUUID(), currentSlideIndex: 0, revision: 1, answers: [], completedAt: null };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(locked)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...locked, state: 'in_progress', reasons: [], progress, presentation: null })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ progress: { ...progress, revision: 2 }, answerFeedback: null })));
    const client = new IeltsOrientationClient('/api/v1');
    await client.getStatus(); await client.start();
    await client.updateProgress({ orientationVersionId: progress.orientationVersionId, expectedRevision: 1, targetSlideIndex: 0, complete: false });
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/me/ielts-orientation', expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/me/ielts-orientation/start', expect.objectContaining({ method: 'POST' }));
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/v1/me/ielts-orientation/progress', expect.objectContaining({ method: 'PUT' }));
  });
});
