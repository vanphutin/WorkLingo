import { isDeepStrictEqual } from 'node:util';

import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import type { MissionPurpose } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { lessonSnapshotSchema, type PublishedMission } from '../domain/curriculum.types.js';

@Injectable()
export class CurriculumService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async updateLessonVersion(id: string, input: { title: string }): Promise<void> {
    const validated = z.object({ title: z.string().trim().min(1).max(200) }).strict().safeParse(input);
    if (!validated.success) throw new BadRequestException('A non-empty lesson title is required');
    const version = await this.database.lessonVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException('Lesson version not found');
    if (version.status !== 'DRAFT') throw new ConflictException('Only draft lesson versions can be edited');
    const snapshot = lessonSnapshotSchema.parse(version.parsedContent);
    const result = await this.database.lessonVersion.updateMany({
      where: { id, status: 'DRAFT', updatedAt: version.updatedAt },
      data: {
        title: validated.data.title,
        parsedContent: { ...snapshot, title: validated.data.title } as Prisma.InputJsonValue,
      },
    });
    if (result.count !== 1) throw new ConflictException('Lesson version changed while editing');
  }

  async getPublishedMissionForLevel(levelCode: string): Promise<PublishedMission> {
    const missions = await this.getPublishedMissionsForLevel(levelCode);
    if (!missions[0]) throw new NotFoundException('No published mission for this level');
    return missions[0];
  }

  async getPublishedMissionForRevision(
    revisionId: string,
    database: Pick<Prisma.TransactionClient, 'curriculumRevision'> = this.database,
  ): Promise<PublishedMission> {
    const revision = await database.curriculumRevision.findUnique({
      where: { id: revisionId },
      include: {
        mission: { include: { level: { select: { code: true } } } },
        lessons: {
          orderBy: { order: 'asc' },
          take: 1,
          include: {
            lessonVersion: {
              include: {
                activities: { orderBy: { order: 'asc' } },
                contentBlocks: { orderBy: { order: 'asc' } },
                wordBanks: { select: { wordBankId: true } },
              },
            },
          },
        },
      },
    });
    const version = revision?.lessons[0]?.lessonVersion;
    if (!revision || revision.status !== 'PUBLISHED' || !version || version.status !== 'PUBLISHED') {
      throw new ConflictException('Published curriculum revision binding is unavailable');
    }
    return this.toPublishedMission(revision.mission, revision.mission.level.code, version);
  }

  async getPublishedMissionsForLevel(
    levelCode: string | undefined,
    purpose: MissionPurpose = 'learning',
    database: Pick<Prisma.TransactionClient, 'mission'> = this.database,
    programId?: string,
  ): Promise<PublishedMission[]> {
    const missions = await database.mission.findMany({
      where: {
        purpose: purpose === 'learning' ? 'LEARNING' : 'PLACEMENT',
        status: 'PUBLISHED',
        level: {
          ...(levelCode ? { code: levelCode } : {}),
          ...(purpose === 'learning' ? { status: 'PUBLISHED' } : {}),
          path: { status: 'PUBLISHED', ...(programId ? { programId } : {}) },
        },
        lessons: {
          some: {
            lesson: {
              OR: [
                { currentPublishedVersion: { status: 'PUBLISHED' } },
                { versions: { some: { status: 'PUBLISHED' } } },
              ],
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: {
        level: { select: { code: true } },
        lessons: {
          where: {
            lesson: {
              OR: [
                { currentPublishedVersion: { status: 'PUBLISHED' } },
                { versions: { some: { status: 'PUBLISHED' } } },
              ],
            },
          },
          orderBy: { order: 'asc' },
          take: 1,
          include: {
            lesson: {
              include: {
                currentPublishedVersion: {
                  include: {
                    activities: { orderBy: { order: 'asc' } },
                    contentBlocks: { orderBy: { order: 'asc' } },
                    wordBanks: { select: { wordBankId: true } },
                  },
                },
                versions: {
                  where: { status: 'PUBLISHED' },
                  orderBy: { version: 'desc' },
                  take: 1,
                  include: {
                    activities: { orderBy: { order: 'asc' } },
                    contentBlocks: { orderBy: { order: 'asc' } },
                    wordBanks: { select: { wordBankId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    return missions.map((mission) => {
      const lesson = mission.lessons[0]?.lesson;
      const candidate = lesson?.currentPublishedVersion?.status === 'PUBLISHED'
        ? lesson.currentPublishedVersion
        : lesson?.versions[0];
      const version = candidate?.status === 'PUBLISHED' ? candidate : undefined;
      if (!mission || !version) throw new NotFoundException('No published mission for this level');
      return this.toPublishedMission(mission, levelCode ?? mission.level.code, version);
    });
  }

  private toPublishedMission(
    mission: { id: string; slug: string; title: string; objective: string; purpose: 'LEARNING' | 'PLACEMENT' },
    levelCode: string,
    version: {
      id: string; version: number; title: string; parsedContent: Prisma.JsonValue;
      activities: Array<{ id: string; slug: string; order: number; activityType: string; learningBlock: string; skills: string[]; contentReferences: string[]; languageBlockReferences: string[]; payload: Prisma.JsonValue }>;
      contentBlocks: Array<{ id: string; slug: string; type: string; text: string; metadata: Prisma.JsonValue }>;
      wordBanks: Array<{ wordBankId: string }>;
    },
  ): PublishedMission {
      const parsed = lessonSnapshotSchema.safeParse(version.parsedContent);
      if (!parsed.success) throw new ConflictException('Published lesson snapshot is invalid');
      const snapshot = parsed.data;
      const activities = version.activities.map((activity) => ({
        id: activity.id, slug: activity.slug, order: activity.order,
        activityType: activity.activityType, learningBlock: activity.learningBlock,
        skills: activity.skills, contentReferences: activity.contentReferences,
        languageBlockReferences: activity.languageBlockReferences, payload: activity.payload,
      }));
      const contentMatches = version.contentBlocks.length === snapshot.contentBlocks.length &&
        snapshot.contentBlocks.every((block, order) => {
          const stored = version.contentBlocks[order];
          return stored?.id === block.id && stored.slug === block.slug &&
            stored.type === block.type && stored.text === block.text &&
            isDeepStrictEqual(stored.metadata, block.audio ? { audio: block.audio } : {});
        });
      const banksMatch = isDeepStrictEqual(
        version.wordBanks.map((bank) => bank.wordBankId).sort(),
        snapshot.wordBanks.map((bank) => bank.id).sort(),
      );
      if (version.title !== snapshot.title || !contentMatches || !banksMatch ||
          !isDeepStrictEqual(activities, snapshot.activities)) {
        throw new ConflictException('Published lesson snapshot does not match its version records');
      }
      return {
        id: mission.id, slug: mission.slug, title: mission.title, objective: mission.objective, levelCode,
        purpose: mission.purpose === 'LEARNING' ? 'learning' : 'placement',
        lessonVersion: { ...snapshot, id: version.id, version: version.version },
      };
  }

  async getPublishedPlacementMission(
    database: Pick<Prisma.TransactionClient, 'mission'> = this.database,
  ): Promise<PublishedMission> {
    const missions = await this.getPublishedMissionsForLevel('FOUNDATION_1', 'placement', database);
    if (!missions[0]) throw new NotFoundException('No published placement mission');
    return missions[0];
  }
}
