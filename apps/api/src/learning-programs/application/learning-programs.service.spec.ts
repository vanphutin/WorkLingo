import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { LearningProgramsService } from './learning-programs.service.js';

describe('LearningProgramsService', () => {
  const findMany = vi.fn();
  let service: LearningProgramsService;

  beforeEach(async () => {
    findMany.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        LearningProgramsService,
        {
          provide: PrismaService,
          useValue: { learningProgram: { findMany } },
        },
      ],
    }).compile();

    service = moduleRef.get(LearningProgramsService);
  });

  it('returns ordered catalog entries with published-only path and level counts', async () => {
    findMany.mockResolvedValue([
      {
        availabilityStatus: 'AVAILABLE',
        description: 'Workplace English.',
        iconKey: 'intermediate',
        learningGoal: 'Communicate at work.',
        name: 'Intermediate',
        paths: [{ levels: [{ id: 'level-1' }, { id: 'level-2' }] }],
        proficiencyLabel: 'B1-B2',
        slug: 'intermediate',
      },
      {
        availabilityStatus: 'COMING_SOON',
        description: 'Prepare for TOEIC.',
        iconKey: 'toeic',
        learningGoal: 'Improve listening and reading.',
        name: 'TOEIC',
        paths: [],
        proficiencyLabel: 'TOEIC-oriented',
        slug: 'toeic',
      },
    ]);

    await expect(service.listCatalog()).resolves.toEqual({
      programs: [
        {
          availabilityStatus: 'AVAILABLE',
          description: 'Workplace English.',
          destination: '/dashboard',
          iconKey: 'intermediate',
          isSelectable: true,
          learningGoal: 'Communicate at work.',
          name: 'Intermediate',
          proficiencyLabel: 'B1-B2',
          publishedLevelCount: 2,
          publishedPathCount: 1,
          slug: 'intermediate',
        },
        {
          availabilityStatus: 'COMING_SOON',
          description: 'Prepare for TOEIC.',
          destination: null,
          iconKey: 'toeic',
          isSelectable: false,
          learningGoal: 'Improve listening and reading.',
          name: 'TOEIC',
          proficiencyLabel: 'TOEIC-oriented',
          publishedLevelCount: 0,
          publishedPathCount: 0,
          slug: 'toeic',
        },
      ],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        where: { availabilityStatus: { not: 'DISABLED' } },
      }),
    );
  });

  it.each([
    ['database failure', new Error('postgres secret detail')],
    [
      'invalid persisted icon key',
      [
        {
          availabilityStatus: 'AVAILABLE',
          description: 'Invalid.',
          iconKey: 'unknown-icon',
          learningGoal: 'Invalid.',
          name: 'Invalid',
          paths: [],
          proficiencyLabel: 'Unknown',
          slug: 'invalid',
        },
      ],
    ],
  ])('maps %s to a safe catalog-unavailable response', async (_label, failure) => {
    if (failure instanceof Error) {
      findMany.mockRejectedValue(failure);
    } else {
      findMany.mockResolvedValue(failure);
    }

    try {
      await service.listCatalog();
      expect.unreachable('Expected listCatalog to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const response = (error as ServiceUnavailableException).getResponse();
      expect(response).toMatchObject({
        code: 'PROGRAM_CATALOG_UNAVAILABLE',
        message: 'Learning program catalog is temporarily unavailable.',
      });
      expect(JSON.stringify(response)).not.toContain('postgres secret detail');
    }
  });
});
