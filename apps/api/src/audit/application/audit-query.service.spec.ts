import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditQueryService } from './audit-query.service.js';
import type { PrismaService } from '../../common/database/prisma.service.js';

interface MockPrisma {
  auditLog: {
    findMany: ReturnType<typeof vi.fn>;
  };
}

describe('AuditQueryService Unit Tests', () => {
  let service: AuditQueryService;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        findMany: vi.fn(),
      },
    };
    service = new AuditQueryService(mockPrisma as unknown as PrismaService);
  });

  it('queries audit logs with actor display name and opaque cursor pagination', async () => {
    const fakeEvents = [
      {
        action: 'CREATE_PATH',
        actor: { displayName: 'Admin One', email: 'secret@email.com' },
        actorId: '11111111-1111-4111-8111-111111111111',
        createdAt: new Date('2026-10-11T10:00:00Z'),
        id: 'ev-1',
        metadata: { pathId: 'p-1', password: 'forbidden' },
        newState: { name: 'Path 1' },
        oldState: null,
        resourceId: 'p-1',
        resourceType: 'LearningPath',
      },
      {
        action: 'UPDATE_PATH',
        actor: { displayName: 'Admin One', email: 'secret@email.com' },
        actorId: '11111111-1111-4111-8111-111111111111',
        createdAt: new Date('2026-10-11T09:00:00Z'),
        id: 'ev-2',
        metadata: { pathId: 'p-1' },
        newState: { name: 'Path 1 Updated' },
        oldState: { name: 'Path 1' },
        resourceId: 'p-1',
        resourceType: 'LearningPath',
      },
    ];

    mockPrisma.auditLog.findMany.mockResolvedValue(fakeEvents);

    const result = await service.list({ limit: 1 });

    expect(result.items).toHaveLength(1);
    const item = result.items[0]!;
    expect(item.id).toBe('ev-1');
    expect(item.actorDisplayName).toBe('Admin One');
    expect((item as unknown as Record<string, unknown>).email).toBeUndefined();
    expect(item.metadata).not.toHaveProperty('password');
    expect(result.nextCursor).toBeDefined();
    expect(typeof result.nextCursor).toBe('string');
  });
});
