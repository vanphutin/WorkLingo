import { afterEach, describe, expect, it, vi } from 'vitest';

import { CurriculumFoundationClient } from './curriculum-foundation-client';

const missionId = '11111111-1111-4111-8111-111111111111';
const definition = {
  category: 'grammar' as const,
  objectives: [{
    slug: 'request-details', statement: 'Understand and clarify a request.',
    skills: ['reading' as const], required: true,
    evidence: [{ lessonVersionId: '22222222-2222-4222-8222-222222222222', activitySlug: 'read-request', languageBlockSlugs: ['could-you'] }],
  }],
  prerequisiteRevisionIds: [],
};

describe('CurriculumFoundationClient', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

  it('sends revision-aware save, validation, publish, and archive commands', async () => {
    const draft = { missionId, revision: 1, status: 'DRAFT', definition, publishedRevisions: [] };
    const published = { id: '33333333-3333-4333-8333-333333333333', missionId, revision: 1, status: 'PUBLISHED', ...definition };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => draft })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...draft, status: 'VALIDATED' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => published })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...published, status: 'ARCHIVED' }) });
    const client = new CurriculumFoundationClient('/api/v1');
    await client.saveDraft(missionId, { definition, expectedRevision: null, idempotencyKey: crypto.randomUUID() });
    await client.validateDraft(missionId, { expectedRevision: 1, idempotencyKey: crypto.randomUUID() });
    await client.publishDraft(missionId, { expectedRevision: 1, idempotencyKey: crypto.randomUUID() });
    await client.archiveRevision(published.id, { expectedRevision: 1, idempotencyKey: crypto.randomUUID() });
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, `/api/v1/admin/curriculum/missions/${missionId}/foundation`, expect.objectContaining({ method: 'PUT', credentials: 'include' }));
    expect(globalThis.fetch).toHaveBeenNthCalledWith(3, `/api/v1/admin/curriculum/missions/${missionId}/foundation/publish`, expect.objectContaining({ method: 'POST' }));
  });

  it('rejects malformed success payloads and exposes conflict status', async () => {
    const client = new CurriculumFoundationClient('/api/v1');
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ missionId }) });
    await expect(client.getDraft(missionId)).rejects.toThrow();
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ code: 'STALE_REVISION', message: 'Refresh required' }) });
    await expect(client.getDraft(missionId)).rejects.toMatchObject({ code: 'STALE_REVISION', status: 409 });
  });
});
