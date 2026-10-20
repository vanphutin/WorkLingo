import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminIeltsMockClient } from './admin-ielts-mock-client';
afterEach(() => vi.unstubAllGlobals());
it('creates an independent mock draft and parses the admin resource response', async () => {
  const dto = { id: '11111111-1111-4111-8111-111111111111', slug: 'new-paper', status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], updatedAt: '2026-10-18T00:00:00.000Z' };
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(dto)));
  vi.stubGlobal('fetch', fetch);
  const input = { idempotencyKey: crypto.randomUUID(), content: INITIAL_IELTS_ACADEMIC_MOCK };
  expect(await new AdminIeltsMockClient('/api/v1').create(input)).toEqual(dto);
  expect(fetch).toHaveBeenCalledWith('/api/v1/admin/ielts-mocks', expect.objectContaining({ method: 'POST', credentials: 'include', body: JSON.stringify(input) }));
});
