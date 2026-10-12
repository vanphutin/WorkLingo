import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminAuditClient, AdminAuditClient } from './admin-audit-client';

describe('AdminAuditClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches audit events with filters and cursor pagination', async () => {
    const mockPage = {
      items: [
        {
          action: 'PUBLISH_PATH',
          actorDisplayName: 'Auditor One',
          actorId: '11111111-1111-4111-8111-111111111111',
          createdAt: new Date().toISOString(),
          id: '22222222-2222-4222-8222-222222222222',
          metadata: { ip: '127.0.0.1' },
          newState: { status: 'PUBLISHED' },
          oldState: { status: 'DRAFT' },
          resourceId: '33333333-3333-4333-8333-333333333333',
          resourceType: 'LearningPath',
        },
      ],
      nextCursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTExIn0=',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => mockPage,
      ok: true,
      status: 200,
    } as unknown as Response);

    const client = new AdminAuditClient('/api/v1');
    const result = await client.getEvents({
      action: 'PUBLISH_PATH',
      limit: 10,
      resourceType: 'LearningPath',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.actorDisplayName).toBe('Auditor One');
    expect(result.nextCursor).toBe('eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTExIn0=');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/audit-events?action=PUBLISH_PATH&limit=10&resourceType=LearningPath'),
      expect.objectContaining({ credentials: 'include', method: 'GET' }),
    );
  });

  it('handles default singleton client without filters', async () => {
    const mockPage = {
      items: [],
      nextCursor: null,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => mockPage,
      ok: true,
      status: 200,
    } as unknown as Response);

    const result = await adminAuditClient.getEvents();
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});
