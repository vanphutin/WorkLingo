import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminIeltsOrientationClient } from './admin-ielts-orientation-client';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

describe('AdminIeltsOrientationClient', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });

  it('sends draft revisions and publish idempotency through typed endpoints', async () => {
    const client = new AdminIeltsOrientationClient('/api/v1');
    const baseSlide = { slug: 'welcome', title: 'Welcome', body: 'Body', transcript: 'Transcript', imageAssetId: null, audioAssetId: null, question: null };
    const draft = { title: 'IELTS', description: 'Intro', slides: [
      { ...baseSlide, id: '11111111-1111-4111-8111-111111111111' },
      { ...baseSlide, id: '22222222-2222-4222-8222-222222222222', slug: 'format' },
      { ...baseSlide, id: '33333333-3333-4333-8333-333333333333', slug: 'ready' },
    ] };
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ id: crypto.randomUUID(), slug: 'ielts-orientation', status: 'DRAFT', draftRevision: 2, draft, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }))
      .mockResolvedValueOnce(response({ orientationId: crypto.randomUUID(), orientationVersionId: crypto.randomUUID(), version: 1, publishedAt: new Date().toISOString() }, 201));
    await client.updateDraft({ expectedRevision: 1, content: draft });
    const key = crypto.randomUUID();
    await client.publish({ expectedRevision: 2, idempotencyKey: key });
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/admin/ielts-orientation/draft', expect.objectContaining({ method: 'PUT', credentials: 'include' }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/admin/ielts-orientation/publish', expect.objectContaining({ method: 'POST', credentials: 'include' }));
  });

  it('uploads orientation media as multipart data', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ id: crypto.randomUUID(), kind: 'AUDIO', fileName: 'intro.mp3', mimeType: 'audio/mpeg', byteSize: 3, createdAt: new Date().toISOString(), contentUrl: '/media' }, 201));
    const client = new AdminIeltsOrientationClient('/api/v1');
    await client.uploadMedia('AUDIO', new File(['abc'], 'intro.mp3', { type: 'audio/mpeg' }));
    expect(fetch).toHaveBeenCalledWith('/api/v1/admin/ielts-orientation/media', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }));
  });
});
