import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminContentLifecycleClient } from './admin-content-lifecycle-client';

afterEach(() => vi.unstubAllGlobals());
describe('admin content lifecycle', () => {
  it.each(['topic', 'bridge', 'mock', 'lesson'] as const)('removes %s with revision and idempotency protection', async kind => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'item/one', action: 'archived' })));
    vi.stubGlobal('fetch', fetch);
    const input = { expectedRevision: 3, idempotencyKey: '11111111-1111-4111-8111-111111111111', expectedAction: 'archived' as const };
    expect(await adminContentLifecycleClient.remove(kind, 'item/one', input)).toEqual({ id: 'item/one', action: 'archived' });
    expect(fetch).toHaveBeenCalledWith(`/api/v1/admin/content-lifecycle/${kind}/item%2Fone/remove`, expect.objectContaining({ method: 'POST', credentials: 'include', body: JSON.stringify(input) }));
  });
  it('rejects malformed removal results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'one', action: 'published' }))));
    await expect(adminContentLifecycleClient.remove('topic', 'one', { expectedRevision: 1, idempotencyKey: crypto.randomUUID(), expectedAction: 'deleted' })).rejects.toThrow();
  });
});
