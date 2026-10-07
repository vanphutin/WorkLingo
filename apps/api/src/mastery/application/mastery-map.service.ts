import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service.js';
import { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import { MasteryService } from './mastery.service.js';
import type { MasteryMapResponseDto } from '../dto/mastery-map-response.dto.js';

@Injectable()
export class MasteryMapService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(CurriculumService) private readonly curriculum: CurriculumService,
    @Inject(MasteryService) private readonly mastery: MasteryService,
  ) {}

  async getMap(learnerId: string): Promise<MasteryMapResponseDto> {
    const profile = await this.database.learnerProfile.findUnique({ where: { userId: learnerId } });
    const missions = await this.curriculum.getPublishedMissionsForLevel(profile?.currentLevelCode ?? 'FOUNDATION_1');
    const [records, queue] = await Promise.all([
      this.mastery.getMasteryRecords(learnerId), this.mastery.getReviewQueue(learnerId),
    ]);
    const blocks = new Map(missions.flatMap((mission) => mission.lessonVersion.wordBanks
      .flatMap((bank) => bank.languageBlocks.map((block) => [block.id, block] as const))));
    return {
      items: [...blocks.values()].map((block) => {
        const skill = (name: 'reading' | 'listening' | 'speaking' | 'writing') => {
          const record = records.find((r) => r.languageBlockId === block.id && r.skill === name && r.lastEvidenceAt !== null);
          return record ? {
            state: record.state, score: record.score, confidence: record.confidence,
            nextReviewAt: record.nextReviewAt?.toISOString() ?? null,
            lastEvidenceAt: record.lastEvidenceAt!.toISOString(),
          } : null;
        };
        return {
          languageBlockId: block.id, slug: block.slug, canonicalForm: block.canonicalForm, meaning: block.meaning,
          skills: { reading: skill('reading'), listening: skill('listening'), speaking: skill('speaking'), writing: skill('writing') },
        };
      }),
      reviewQueue: queue.filter((item) => blocks.has(item.languageBlockId)).map((item) => ({
        languageBlockId: item.languageBlockId, skill: item.skill, priorityReason: item.priorityReason,
        nextReviewAt: item.nextReviewAt?.toISOString() ?? null,
      })),
    };
  }
}
