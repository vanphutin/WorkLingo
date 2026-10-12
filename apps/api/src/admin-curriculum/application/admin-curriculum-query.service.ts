import { Inject, Injectable } from '@nestjs/common';
import type {
  AdminCurriculumTreeDto,
  AdminLearningPathItemDto,
  AdminLessonSummaryDto,
  AdminLevelItemDto,
  AdminMissionItemDto,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { findPlayableLevels } from '../../curriculum/domain/playable-level-policy.js';
import { computeAvailableDurations } from '../../learning-sessions/domain/session-planner.js';
import { findArchiveBlockers } from '../domain/curriculum-mutation-policy.js';

const PROGRAM_OPTION_SELECT = {
  availabilityStatus: true,
  id: true,
  name: true,
  slug: true,
} as const;

@Injectable()
export class AdminCurriculumQueryService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async getTree(): Promise<AdminCurriculumTreeDto> {
    const [programs, rawPaths] = await Promise.all([
      this.database.learningProgram.findMany({
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: PROGRAM_OPTION_SELECT,
        where: { availabilityStatus: { not: 'DISABLED' } },
      }),
      this.database.learningPath.findMany({
        include: {
          levels: {
            include: {
              missions: {
                include: {
                  lessons: {
                    include: {
                      lesson: {
                        include: {
                          currentPublishedVersion: {
                            include: {
                              activities: true,
                              audioArtifacts: true,
                            },
                          },
                        },
                      },
                    },
                    orderBy: { order: 'asc' },
                  },
                },
                orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
            program: { select: PROGRAM_OPTION_SELECT },
          },
          orderBy: { createdAt: 'asc' },
        }),
    ]);

    const paths: AdminLearningPathItemDto[] = rawPaths.map((path) => {
      const publishedLevels = path.levels.filter((l) => l.status === 'PUBLISHED');
      const pathArchiveBlockers = findArchiveBlockers({
        publishedChildCount: publishedLevels.length,
        resourceType: 'PATH',
        status: path.status,
      }).map((b) => b.code);

      const levels: AdminLevelItemDto[] = path.levels.map((level) => {
        const publishedMissions = level.missions.filter((m) => m.status === 'PUBLISHED');
        const levelArchiveBlockers = findArchiveBlockers({
          publishedChildCount: publishedMissions.length,
          resourceType: 'LEVEL',
          status: level.status,
        }).map((b) => b.code);

        // Calculate level playability using canonical policy
        const playableCandidate = {
          cefrReference: level.cefrReference,
          code: level.code,
          missions: publishedMissions.map((m) => {
            const firstPublishedLesson = m.lessons.find((l) => l.lesson.currentPublishedVersion);
            return {
              lessonVersion: {
                activities: (firstPublishedLesson?.lesson.currentPublishedVersion
                  ?.activities as unknown as Parameters<
                  typeof computeAvailableDurations
                >[0]['lessonVersion']['activities']) ?? [],
              },
              purpose: m.purpose.toLowerCase() as 'learning' | 'placement',
            };
          }),
          name: level.name,
        };

        const playableResult = findPlayableLevels({ levels: [playableCandidate] })[0]!;
        const isLevelPlayable = level.status === 'PUBLISHED' && playableResult.available;
        const levelPlayabilityReasons = level.status === 'PUBLISHED'
          ? [playableResult.reason]
          : [`Level is in ${level.status} status`];

        const missions: AdminMissionItemDto[] = level.missions.map((mission) => {
          const missionArchiveBlockers = findArchiveBlockers({
            publishedChildCount: 0,
            resourceType: 'MISSION',
            status: mission.status,
          }).map((b) => b.code);

          const lessons: AdminLessonSummaryDto[] = mission.lessons.map((ml) => ({
            currentPublishedVersionId: ml.lesson.currentPublishedVersionId,
            currentPublishedVersionNumber: ml.lesson.currentPublishedVersion?.version ?? null,
            hasAudio: Boolean(ml.lesson.currentPublishedVersion?.audioArtifacts?.length),
            id: ml.lessonId,
            order: ml.order,
            slug: ml.lesson.slug,
            title: ml.lesson.currentPublishedVersion?.title ?? null,
          }));

          let isMissionPlayable = false;
          let missionReasons: string[] = [];

          if (mission.status === 'PUBLISHED') {
            const firstLesson = mission.lessons.find((l) => l.lesson.currentPublishedVersion);
            if (firstLesson?.lesson.currentPublishedVersion) {
              const durations = computeAvailableDurations({
                lessonVersion: {
                  activities: firstLesson.lesson.currentPublishedVersion
                    .activities as unknown as Parameters<
                    typeof computeAvailableDurations
                  >[0]['lessonVersion']['activities'],
                },
              });
              isMissionPlayable = durations.includes(60);
              missionReasons = [
                isMissionPlayable
                  ? 'A published 60-minute four-skill session is available.'
                  : 'Published learning content cannot form a canonical 60-minute four-skill session.',
              ];
            } else {
              missionReasons = ['No published lessons attached to published mission.'];
            }
          } else {
            missionReasons = [`Mission is in ${mission.status} status`];
          }

          return {
            archiveBlockers: missionArchiveBlockers,
            id: mission.id,
            isPlayable: isMissionPlayable,
            lessons,
            levelId: mission.levelId,
            objective: mission.objective,
            order: mission.order,
            playabilityReasons: missionReasons,
            purpose: mission.purpose,
            revision: mission.revision,
            slug: mission.slug,
            status: mission.status,
            title: mission.title,
          };
        });

        return {
          archiveBlockers: levelArchiveBlockers,
          cefrReference: level.cefrReference,
          code: level.code,
          id: level.id,
          isPlayable: isLevelPlayable,
          missions,
          name: level.name,
          order: level.order,
          pathId: level.pathId,
          playabilityReasons: levelPlayabilityReasons,
          revision: level.revision,
          status: level.status,
        };
      });

      return {
        archiveBlockers: pathArchiveBlockers,
        id: path.id,
        levels,
        name: path.name,
        program: path.program,
        revision: path.revision,
        slug: path.slug,
        status: path.status,
      };
    });

    return { paths, programs };
  }
}
