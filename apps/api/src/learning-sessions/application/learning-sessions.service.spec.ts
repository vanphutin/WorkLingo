import { describe, expect, it, vi } from 'vitest';

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
});
