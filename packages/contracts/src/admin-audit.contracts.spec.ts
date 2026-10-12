import { describe, expect, it } from 'vitest';
import {
  adminAuditFilterSchema,
  adminAuditPageSchema,
  adminAuditEventSchema,
} from './admin-audit.contracts';

describe('Admin Audit Contracts', () => {
  it('validates AdminAuditFilterInput with default limit 25 and cap 100', () => {
    const empty = {};
    const parsedDefault = adminAuditFilterSchema.parse(empty);
    expect(parsedDefault.limit).toBe(25);

    const withLimit = adminAuditFilterSchema.parse({ limit: '50' });
    expect(withLimit.limit).toBe(50);

    expect(() => adminAuditFilterSchema.parse({ limit: 0 })).toThrow();
    expect(() => adminAuditFilterSchema.parse({ limit: 101 })).toThrow();
  });

  it('validates AdminAuditFilterInput with valid ISO from/to and filters', () => {
    const valid = {
      action: 'CURRICULUM_PATH_PUBLISHED',
      actorId: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      cursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTExVDE5OjAwOjAwWiIsImlkIjoiYWJjIn0=',
      from: '2026-10-01T00:00:00.000Z',
      limit: 20,
      resourceId: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
      resourceType: 'LearningPath',
      to: '2026-10-12T00:00:00.000Z',
    };
    expect(adminAuditFilterSchema.parse(valid)).toEqual(valid);

    expect(() => adminAuditFilterSchema.parse({ from: 'invalid-date' })).toThrow();
  });

  it('validates AdminAuditEventDto and AdminAuditPageDto structure', () => {
    const event = {
      action: 'CURRICULUM_PATH_PUBLISHED',
      actorDisplayName: 'Admin User',
      actorId: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      createdAt: '2026-10-11T20:00:00.000Z',
      id: 'c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f',
      metadata: { expectedRevision: 1 },
      newState: { revision: 2, status: 'PUBLISHED' },
      oldState: { revision: 1, status: 'DRAFT' },
      resourceId: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
      resourceType: 'LearningPath',
    };

    expect(adminAuditEventSchema.parse(event)).toEqual(event);

    const page = {
      items: [event],
      nextCursor: 'next-page-cursor-token',
    };
    expect(adminAuditPageSchema.parse(page)).toEqual(page);
  });
});
