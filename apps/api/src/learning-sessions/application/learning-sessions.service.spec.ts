import { describe, expect, it, vi } from 'vitest';
import { foundationMissionFixture } from '@worklingo/test-fixtures';

import type { PrismaService } from '../../common/database/prisma.service.js';
import type { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import type { MasteryService } from '../../mastery/application/mastery.service.js';
import { LearningSessionsService } from './learning-sessions.service.js';

describe('LearningSessionsService state transitions', () => {
  it('does not overwrite a session that completed after a stale pause read', async () => {
    const sessionId = '018f06f6-4f68-7a72-9411-4bf894341234';
    const learnerId = '018f06f6-4f68-7a72-9411-4bf894345678';
    const findFirst = vi.fn()
      .mockResolvedValueOnce({ id: sessionId, learnerId, status: 'IN_PROGRESS' })
      .mockResolvedValueOnce({ id: sessionId, learnerId, status: 'COMPLETED' });
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const database = { learningSession: { findFirst, updateMany } } as unknown as PrismaService;
    const service = new LearningSessionsService(database, {} as CurriculumService, {} as MasteryService);

    await expect(service.pauseSession(learnerId, sessionId)).rejects.toMatchObject({
      response: { code: 'INVALID_STATE_TRANSITION' },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: sessionId, learnerId, status: 'IN_PROGRESS' },
      data: { status: 'PAUSED' },
    });
  });

  it('rejects unsupported session durations with 422 and typed code', async () => {
    const service = new LearningSessionsService({} as PrismaService, {} as CurriculumService, {} as MasteryService);
    await expect(
      service.createSession('learner-id', 30, '018f06f6-4f68-7a72-9411-4bf894341234'),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_SESSION_DURATION' },
      status: 422,
    });
  });

  it('passes reviewQueue into planner and handles insufficient content with 422', async () => {
    const learnerId = '018f06f6-4f68-7a72-9411-4bf894345678';
    const database = {
      learningSession: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    const fixture = foundationMissionFixture;
    const curriculum = {
      getPublishedMissionForLevel: vi.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000200',
        slug: fixture.slug,
        title: fixture.title,
        objective: fixture.objective,
        levelCode: fixture.level.code,
        lessonVersion: {
          id: '00000000-0000-4000-8000-000000000201',
          version: 1,
          title: fixture.lesson.title,
          contentBlocks: fixture.lesson.contentBlocks.map((b, i) => ({ ...b, id: `00000000-0000-4000-8000-${(i + 1).toString().padStart(12, '0')}` })),
          wordBanks: fixture.lesson.wordBanks.map((wb) => ({
            ...wb,
            id: '00000000-0000-4000-8000-000000000010',
            languageBlocks: wb.languageBlocks.map((lb, i) => ({ ...lb, id: `00000000-0000-4000-8000-${(i + 20).toString().padStart(12, '0')}` })),
          })),
          activities: fixture.lesson.activities.map((a, i) => ({ ...a, order: i, id: `00000000-0000-4000-8000-${(i + 100).toString().padStart(12, '0')}` })),
        },
      }),
    } as unknown as CurriculumService;
    const getReviewQueue = vi.fn().mockResolvedValue([]);
    const mastery = { getReviewQueue } as unknown as MasteryService;

    const service = new LearningSessionsService(database, curriculum, mastery);

    await expect(
      service.createSession(learnerId, 90, '018f06f6-4f68-7a72-9411-4bf894341234'),
    ).rejects.toMatchObject({
      response: {
        code: 'INSUFFICIENT_CONTENT_FOR_DURATION',
        availableDurations: [45, 60],
      },
      status: 422,
    });
    expect(getReviewQueue).toHaveBeenCalledWith(learnerId);
  });
});
