import { describe, expect, it, vi } from 'vitest';
import { IeltsIntegratedClient } from './ielts-integrated-client';

describe('IeltsIntegratedClient', () => {
  it('uses owner-scoped integrated practice routes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);
    const client = new IeltsIntegratedClient('/api/v1');
    await Promise.allSettled([client.availability(), client.start({ clientSessionId: crypto.randomUUID(), durationMinutes: 60, difficulty: 'foundation' }), client.get('session-id'), client.update('session-id', { expectedRevision: 1, blockIndex: 0 })]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/v1/me/ielts-integrated/availability', '/api/v1/me/ielts-integrated/sessions', '/api/v1/me/ielts-integrated/sessions/session-id', '/api/v1/me/ielts-integrated/sessions/session-id/progress']);
  });
});
