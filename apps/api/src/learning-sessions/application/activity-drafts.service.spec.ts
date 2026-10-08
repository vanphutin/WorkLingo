import type { PrismaService } from '../../common/database/prisma.service.js';
import { describe, expect, it, vi } from 'vitest';

import { ActivityDraftsService } from './activity-drafts.service.js';

const ids = {
  activity: '00000000-0000-4000-8000-000000000001',
  learner: '00000000-0000-4000-8000-000000000002',
  session: '00000000-0000-4000-8000-000000000003',
  version: '00000000-0000-4000-8000-000000000004',
};

describe('ActivityDraftsService', () => {
  it('creates revision one only for an owned writing activity', async () => {
    const draft = {
      id: 'draft-id', sessionId: ids.session, activityId: ids.activity,
      text: 'I will follow up.', revision: 1, updatedAt: new Date('2026-10-08T00:00:00Z'),
    };
    const create = vi.fn().mockResolvedValue(draft);
    const transaction = { activityDraft: { findUnique: vi.fn().mockResolvedValue(null), create } };
    const database = {
      learningSession: { findFirst: vi.fn().mockResolvedValue({ lessonVersionId: ids.version }) },
      activity: { findFirst: vi.fn().mockResolvedValue({ id: ids.activity }) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const service = new ActivityDraftsService(database, { retentionDays: 30 });

    await expect(service.save({
      activityId: ids.activity, expectedRevision: 0, learnerId: ids.learner,
      sessionId: ids.session, text: '  I will follow up.  ',
    })).resolves.toEqual({
      sessionId: ids.session, activityId: ids.activity, text: 'I will follow up.',
      revision: 1, updatedAt: '2026-10-08T00:00:00.000Z',
    });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      learnerId: ids.learner, revision: 1, text: 'I will follow up.',
    }) });
  });

  it('rejects a stale revision without overwriting the newest draft', async () => {
    const updateMany = vi.fn();
    const transaction = {
      activityDraft: {
        findUnique: vi.fn().mockResolvedValue({ id: 'draft-id', revision: 3 }), updateMany,
      },
    };
    const database = {
      learningSession: { findFirst: vi.fn().mockResolvedValue({ lessonVersionId: ids.version }) },
      activity: { findFirst: vi.fn().mockResolvedValue({ id: ids.activity }) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const service = new ActivityDraftsService(database, { retentionDays: 30 });

    await expect(service.save({
      activityId: ids.activity, expectedRevision: 2, learnerId: ids.learner,
      sessionId: ids.session, text: 'stale text',
    })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'DRAFT_REVISION_CONFLICT' }) });
    expect(updateMany).not.toHaveBeenCalled();
  });
});
