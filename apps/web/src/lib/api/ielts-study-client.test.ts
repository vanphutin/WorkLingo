import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-client';
import { ieltsStudyClient } from './ielts-study-client';
afterEach(() => vi.unstubAllGlobals());
describe('IELTS study HTTP client', () => {
  it('validates learner-safe topic payloads from the real request boundary', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ topics: [], recommendations: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await ieltsStudyClient.catalog()).toEqual({ topics: [], recommendations: [] });
    expect(fetch.mock.calls[0]![0]).toContain('/me/ielts-study/topics');
    expect(fetch.mock.calls[0]![1]).toMatchObject({ credentials: 'include' });
  });
  it('preserves server error codes so retries do not hide version conflicts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'IDEMPOTENCY_CONFLICT', message: 'UUID targets another topic', details: [] } }), { status: 409 })));
    await expect(ieltsStudyClient.catalog()).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', status: 409 });
  });
  it('rejects unsupported duration and client curriculum overrides before making a request', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const base = { clientSessionId: crypto.randomUUID(), topicVersionId: crypto.randomUUID(), packSlug: 'ielts-education', durationMinutes: 60 };
    await expect(ieltsStudyClient.start(base as never)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports offline requests as retryable network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(ieltsStudyClient.catalog()).rejects.toBeInstanceOf(ApiError);
  });
});
