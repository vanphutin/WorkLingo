import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyzeLessonSource } from '@worklingo/content-format';
import { buildBeginnerDraftSnapshot } from '../../curriculum-foundation/application/foundation-validation.js';
import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { placementMissionFixture } from '@worklingo/test-fixtures';
import { describe, expect, it, vi } from 'vitest';

import { lessonSnapshotSchema, type PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import { SessionCreationService } from './session-creation.service.js';

const beginnerSources = ['mg01-l1', 'mg01-l2', 'mg01-l3', 'mg01-l4', 'mg02-l1', 'mg02-l2', 'mg02-l3', 'mg02-l4'];

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
    curriculumRevisionId: null,
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
      curriculumRevisionId: null,
      durationMinutes: 45,
      learnerId: ids.learner,
      mission,
      reviewItems: [],
    });

    expect(result).toMatchObject({
      clientSessionId: ids.client,
      curriculumRevisionId: null,
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

describe('Beginner session persistence boundary', () => {
  it.each(beginnerSources)('persists every exact source activity in its plan and blocks: %s', async (source) => {
    const mission = beginnerMission(source);
    const create = vi.fn().mockImplementation(async ({ data }) => ({ ...storedSession(mission), ...data, blocks: data.blocks.create.map((block: object, index: number) => ({ ...block, id: ids.session, status: 'AVAILABLE', order: index + 1 })) }));
    const transaction = { learningSession: { create, findUnique: vi.fn().mockResolvedValue(null) } } as unknown as Prisma.TransactionClient;
    const result = await new SessionCreationService().create(transaction, { clientSessionId: ids.client, durationMinutes: 45, learnerId: ids.learner, mission, reviewItems: [] });
    expect(result.plan.blocks.map(block => block.activityIds.length)).toEqual([3, 3, 2]);
    expect(result.blocks.flatMap(block => block.activityIds)).toEqual(mission.lessonVersion.activities.map(activity => activity.id));
    expect(result.lessonVersionId).toBe(mission.lessonVersion.id);
  });
  it('rejects invalid snapshots and mismatched duration before writing', async () => {
    const create = vi.fn();
    const transaction = { learningSession: { create, findUnique: vi.fn().mockResolvedValue(null) } } as unknown as Prisma.TransactionClient;
    const mission = beginnerMission();
    const input = { clientSessionId: ids.client, durationMinutes: 60, learnerId: ids.learner, mission, reviewItems: [] };
    await expect(new SessionCreationService().create(transaction, input)).rejects.toThrow();
    mission.lessonVersion.activities.pop();
    await expect(new SessionCreationService().create(transaction, { ...input, durationMinutes: 45 })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});


function beginnerMission(source = beginnerSources[0]!): PublishedMission {
  const draft = analyzeLessonSource(readFileSync(resolve(process.cwd(), '../../content/beginner/pilot', source + '.lesson.txt'), 'utf8')).normalizedDraft;
  if (!draft) throw new Error('Invalid source fixture');
  return { id: '00000000-0000-4000-8000-000000000200', slug: source, title: source, objective: source, purpose: 'learning', levelCode: 'MG_F0', lessonVersion: { ...buildBeginnerDraftSnapshot(draft), id: '00000000-0000-4000-8000-000000000202', version: 2 } };
}
