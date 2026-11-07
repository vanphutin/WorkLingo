import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { LearningProgramsService } from './learning-programs.service.js';
import { ieltsBetaFixture } from './__fixtures__/ielts-beta.js';

describe('LearningProgramsService', () => {
  const findMany = vi.fn();
  let fixture: ReturnType<typeof ieltsBetaFixture>;
  let service: LearningProgramsService;

  beforeEach(async () => {
    findMany.mockReset();
    fixture = ieltsBetaFixture();
    const moduleRef = await Test.createTestingModule({
      providers: [
        LearningProgramsService,
        {
          provide: PrismaService,
          useValue: { ...fixture.database, learningProgram: { findMany },
            $transaction: (callback: (tx: unknown) => unknown) => callback({ ...fixture.database, learningProgram: { findMany } }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(LearningProgramsService);
  });

  it('opens only an authored published Beginner release with exact valid snapshot pins', async () => {
    const snapshot = {title:'Beginner',description:'Practice',objectives:['Introduce yourself','Ask for help'],estimatedMinutes:45,difficulty:'A0',policy:{version:1,sequential:{stages:true,units:true,lessons:true},completion:{requiredActivityRatio:1},mastery:{required:false,threshold:0.8,minimumQualifiedAttempts:1},retry:{maxAttempts:3,cooldownMinutes:0},remediation:{enabled:true,afterAttempts:2},review:{scheduleVersion:'program-review-v1',intervalsDays:[1],requiredForReadiness:false}},curriculumBindings:[{curriculumRevisionId:'00000000-0000-4000-8000-000000000001',pathId:'00000000-0000-4000-8000-000000000002',levelId:'00000000-0000-4000-8000-000000000003',missionId:'00000000-0000-4000-8000-000000000004',order:1,title:'Unit',objectives:['Practice'],required:true,prerequisiteRevisionIds:[],lessons:[{lessonVersionId:'00000000-0000-4000-8000-000000000005',order:1,title:'Lesson',objectives:['Practice'],estimatedMinutes:45,difficulty:'A0',activityIds:['00000000-0000-4000-8000-000000000006'],vocabularyRefs:[],resourceRefs:[]}]}]};
    const release={id:'00000000-0000-4000-8000-000000000007',version:1,status:'PUBLISHED',source:'AUTHORED',snapshot,curriculumRevisionIds:[snapshot.curriculumBindings[0]!.curriculumRevisionId]};
    const row={...fixture.program,slug:'beginner',availabilityStatus:'BETA',progressionPolicy:'ACTIVITY_COMPLETION',curriculumRevisionIds:release.curriculumRevisionIds,versions:[release]};
    findMany.mockResolvedValue([row]);
    expect((await service.listCatalog()).programs[0]).toMatchObject({isSelectable:true,destination:'/dashboard',learningGoal:'Introduce yourself',currentRelease:{objectives:['Introduce yourself','Ask for help']}});
    for (const versions of [[],[{...release,status:'APPROVED'}],[{...release,source:'LEGACY_PIN_BACKFILL'}],[{...release,curriculumRevisionIds:['wrong']} ]]) {
      findMany.mockResolvedValue([{...row,versions}]);
      expect((await service.listCatalog()).programs[0]!.isSelectable).toBe(false);
    }
  });

  it.each(['BETA', 'AVAILABLE'])('opens guided IELTS entry for a complete published chain with status %s', async (availabilityStatus) => {
    findMany.mockResolvedValue([{ ...fixture.program, availabilityStatus }]);
    const catalog = await service.listCatalog();
    const { paths: _paths, ...metadata } = fixture.program;
    expect(catalog.programs[0]).toEqual({ ...metadata, availabilityStatus,
      destination: '/ielts', isSelectable: true, publishedLevelCount: 0, publishedPathCount: 0,
    });
  });

  it.each(['IN_DEVELOPMENT', 'COMING_SOON'])('keeps %s IELTS locked without scanning content', async (availabilityStatus) => {
    findMany.mockResolvedValue([{ ...fixture.program, availabilityStatus }]);
    expect((await service.listCatalog()).programs[0]).toMatchObject({ destination: null, isSelectable: false });
    expect(fixture.database.ieltsOrientation.findUnique).not.toHaveBeenCalled();
  });

  it('relocks Beta entry when current mock audio disappears', async () => {
    findMany.mockResolvedValue([fixture.program]);
    expect((await service.listCatalog()).programs[0]?.destination).toBe('/ielts');
    fixture.audio.pop();
    expect((await service.listCatalog()).programs[0]).toMatchObject({ destination: null, isSelectable: false });
  });

  it('does not expose generic IELTS path or level counts even for stray rows', async () => {
    findMany.mockResolvedValue([{ ...fixture.program, paths: [{ levels: [{ id: 'stray' }] }] }]);
    expect((await service.listCatalog()).programs[0]).toMatchObject({
      destination: '/ielts', publishedPathCount: 0, publishedLevelCount: 0,
    });
  });

  it('maps readiness query failures to the safe catalog-unavailable response', async () => {
    findMany.mockResolvedValue([fixture.program]);
    fixture.database.audioArtifact.findMany.mockRejectedValue(new Error('private database details'));
    await expect(service.listCatalog()).rejects.toThrow(ServiceUnavailableException);
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
