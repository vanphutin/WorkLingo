import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { placementMissionFixture } from '@worklingo/test-fixtures';
import { describe, expect, it, vi } from 'vitest';

import { lessonSnapshotSchema, type PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import { SessionCreationService } from './session-creation.service.js';

const ids = {
  learner: '00000000-0000-4000-8000-000000000001',
  session: '00000000-0000-4000-8000-000000000002',
  mission: '00000000-0000-4000-8000-000000000003',
  version: '00000000-0000-4000-8000-000000000004',
  client: '00000000-0000-4000-8000-000000000005',
} as const;

function placementMission(): PublishedMission {
  const lessonVersion = lessonSnapshotSchema.parse({
    title: placementMissionFixture.lesson.title,
    contentBlocks: placementMissionFixture.lesson.contentBlocks.map((block, index) => ({
      ...block,
      id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
    })),
    wordBanks: placementMissionFixture.lesson.wordBanks.map((bank, bankIndex) => ({
      ...bank,
      id: `00000000-0000-4000-8000-${String(bankIndex + 20).padStart(12, '0')}`,
      languageBlocks: bank.languageBlocks.map((block, blockIndex) => ({
        ...block,
        id: `00000000-0000-4000-8000-${String(blockIndex + 30).padStart(12, '0')}`,
      })),
    })),
    activities: placementMissionFixture.lesson.activities.map((activity, index) => ({
      ...activity,
      id: `00000000-0000-4000-8000-${String(index + 40).padStart(12, '0')}`,
      order: index,
    })),
  });
  return {
    id: ids.mission,
    levelCode: placementMissionFixture.level.code,
    objective: placementMissionFixture.objective,
    purpose: 'placement',
    slug: placementMissionFixture.slug,
    title: placementMissionFixture.title,
    lessonVersion: {
      id: ids.version,
      version: placementMissionFixture.lesson.version,
      ...lessonVersion,
    },
  };
}

function storedSession(mission = placementMission()) {
  const now = new Date('2026-10-09T00:00:00.000Z');
  return {
    attempts: [],
    blocks: [
      { id: '00000000-0000-4000-8000-000000000101', activityIds: [mission.lessonVersion.activities[0]!.id], order: 1, status: 'AVAILABLE', targetMinutes: 15, type: 'readDecode' },
      { id: '00000000-0000-4000-8000-000000000102', activityIds: [mission.lessonVersion.activities[1]!.id], order: 2, status: 'AVAILABLE', targetMinutes: 15, type: 'listenReason' },
      { id: '00000000-0000-4000-8000-000000000103', activityIds: [mission.lessonVersion.activities[2]!.id, mission.lessonVersion.activities[3]!.id], order: 3, status: 'AVAILABLE', targetMinutes: 15, type: 'respond' },
    ],
    clientSessionId: ids.client,
    completedAt: null,
    createdAt: now,
    currentCheckpoint: 0,
    durationMinutes: 45,
    id: ids.session,
    learnerId: ids.learner,
    lessonVersionId: mission.lessonVersion.id,
    mission: { id: mission.id, purpose: 'PLACEMENT', title: mission.title },
    missionId: mission.id,
    planSnapshot: {
      blocks: [
        { activityIds: [mission.lessonVersion.activities[0]!.id], order: 1, skills: ['reading'], targetMinutes: 15, type: 'readDecode' },
        { activityIds: [mission.lessonVersion.activities[1]!.id], order: 2, skills: ['listening'], targetMinutes: 15, type: 'listenReason' },
        { activityIds: [mission.lessonVersion.activities[2]!.id, mission.lessonVersion.activities[3]!.id], order: 3, skills: ['speaking', 'writing'], targetMinutes: 15, type: 'respond' },
      ],
      durationMinutes: 45,
      lessonVersionId: mission.lessonVersion.id,
      missionId: mission.id,
    },
    startedAt: null,
    status: 'PLANNED',
    updatedAt: now,
  };
}

describe('SessionCreationService', () => {
  it('creates a mission-bound placement session through the supplied transaction', async () => {
    const mission = placementMission();
    const stored = storedSession(mission);
    const create = vi.fn().mockResolvedValue(stored);
    const transaction = {
      learningSession: {
        create,
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as Prisma.TransactionClient;

    const result = await new SessionCreationService().create(transaction, {
      clientSessionId: ids.client,
      durationMinutes: 45,
      learnerId: ids.learner,
      mission,
      reviewItems: [],
    });

    expect(result).toMatchObject({
      clientSessionId: ids.client,
      durationMinutes: 45,
      lessonVersionId: ids.version,
      purpose: 'placement',
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        learnerId: ids.learner,
        lessonVersionId: ids.version,
        missionId: ids.mission,
      }),
    }));
  });

  it('replays the same target but rejects a client session UUID bound to another target', async () => {
    const mission = placementMission();
    const sameTarget = storedSession(mission);
    const findUnique = vi.fn().mockResolvedValue(sameTarget);
    const transaction = {
      learningSession: { create: vi.fn(), findUnique },
    } as unknown as Prisma.TransactionClient;
    const service = new SessionCreationService();
    const input = {
      clientSessionId: ids.client,
      durationMinutes: 45,
      learnerId: ids.learner,
      mission,
      reviewItems: [],
    } as const;

    await expect(service.create(transaction, input)).resolves.toMatchObject({ id: ids.session });

    findUnique.mockResolvedValue({ ...sameTarget, missionId: '00000000-0000-4000-8000-000000000999' });
    await expect(service.create(transaction, input)).rejects.toBeInstanceOf(ConflictException);
  });
});
