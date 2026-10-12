import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCurriculumQueryService } from './admin-curriculum-query.service.js';
import type { PrismaService } from '../../common/database/prisma.service.js';

interface MockPrisma {
  learningProgram: {
    findMany: ReturnType<typeof vi.fn>;
  };
  learningPath: {
    findMany: ReturnType<typeof vi.fn>;
  };
}

describe('AdminCurriculumQueryService Unit Tests', () => {
  let service: AdminCurriculumQueryService;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = {
      learningProgram: {
        findMany: vi.fn(),
      },
      learningPath: {
        findMany: vi.fn(),
      },
    };
    service = new AdminCurriculumQueryService(mockPrisma as unknown as PrismaService);
  });

  it('builds a hierarchical curriculum tree with playability and archive blockers', async () => {
    const intermediateProgram = {
      availabilityStatus: 'AVAILABLE',
      id: '10000000-0000-4000-8000-000000000002',
      name: 'Intermediate',
      slug: 'intermediate',
    };
    mockPrisma.learningProgram.findMany.mockResolvedValue([intermediateProgram]);
    mockPrisma.learningPath.findMany.mockResolvedValue([
      {
        id: 'path-1',
        levels: [
          {
            cefrReference: 'A1',
            code: 'A1_FOUNDATION',
            id: 'level-1',
            missions: [
              {
                id: 'mission-1',
                lessons: [
                  {
                    lesson: {
                      currentPublishedVersion: {
                        activities: [
                          { id: 'act-1', learningBlock: 'activate', skills: ['reading'] },
                          { id: 'act-2', learningBlock: 'readDecode', skills: ['listening'] },
                          { id: 'act-3', learningBlock: 'listenReason', skills: ['speaking'] },
                          { id: 'act-4', learningBlock: 'respond', skills: ['writing'] },
                        ],
                        audioArtifacts: [{ id: 'audio-1' }],
                        id: 'v-1',
                        title: 'Lesson 1 Title',
                        version: 1,
                      },
                      currentPublishedVersionId: 'v-1',
                      id: 'lesson-1',
                      slug: 'lesson-1',
                    },
                    lessonId: 'lesson-1',
                    missionId: 'mission-1',
                    order: 1,
                  },
                ],
                levelId: 'level-1',
                objective: 'Greetings',
                order: 1,
                purpose: 'LEARNING',
                revision: 1,
                slug: 'm1',
                status: 'PUBLISHED',
                title: 'Mission 1',
              },
            ],
            name: 'Foundation Level',
            order: 1,
            pathId: 'path-1',
            revision: 1,
            status: 'PUBLISHED',
          },
        ],
        name: 'Workplace English',
        program: intermediateProgram,
        revision: 1,
        slug: 'workplace-english',
        status: 'PUBLISHED',
      },
    ]);

    const result = await service.getTree();

    expect(result.paths).toHaveLength(1);
    expect(result.programs).toEqual([intermediateProgram]);
    const path = result.paths[0]!;
    expect(path.name).toBe('Workplace English');
    expect(path.program).toEqual(intermediateProgram);
    expect(path.archiveBlockers).toContain('HAS_PUBLISHED_LEVELS');

    const level = path.levels[0]!;
    expect(level.code).toBe('A1_FOUNDATION');
    expect(level.isPlayable).toBe(true);
    expect(level.archiveBlockers).toContain('HAS_PUBLISHED_MISSIONS');

    const mission = level.missions[0]!;
    expect(mission.isPlayable).toBe(true);
    expect(mission.lessons).toHaveLength(1);
    expect(mission.lessons[0]!.hasAudio).toBe(true);
    expect(mission.lessons[0]!.currentPublishedVersionNumber).toBe(1);
  });
});
