import { isDeepStrictEqual } from 'node:util';

import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

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
    const mission = await this.database.mission.findFirst({
      where: {
        status: 'PUBLISHED', level: { code: levelCode, path: { status: 'PUBLISHED' } },
        lessons: { some: { lesson: { versions: { some: { status: 'PUBLISHED' } } } } },
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: {
        lessons: {
          where: { lesson: { versions: { some: { status: 'PUBLISHED' } } } },
          orderBy: { order: 'asc' }, take: 1,
          include: {
            lesson: {
              include: {
                versions: {
                  where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' }, take: 1,
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
    const version = mission?.lessons[0]?.lesson.versions[0];
    if (!mission || !version) throw new NotFoundException('No published mission for this level');
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
      lessonVersion: { ...snapshot, id: version.id, version: version.version },
    };
  }
}
