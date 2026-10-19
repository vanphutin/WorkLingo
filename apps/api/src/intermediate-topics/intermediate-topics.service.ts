import { randomInt } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { parseLessonSource } from '@worklingo/content-format';
import { createTopicSessionSchema, learnerTopicSchema, sessionPlanSchema, type CreateTopicSession } from '@worklingo/contracts';
import { PrismaService } from '../common/database/prisma.service.js';
import { CurriculumService } from '../curriculum/application/curriculum.service.js';
import type { PublishedMission } from '../curriculum/domain/curriculum.types.js';
import { ProgramContextService } from '../learning-programs/application/program-context.service.js';
import { CurriculumEligibilityService } from '../curriculum-foundation/application/curriculum-eligibility.service.js';
import { SessionCreationService, learningSessionInclude, toLearningSessionDto } from '../learning-sessions/application/session-creation.service.js';
import { computeAvailableDurations } from '../learning-sessions/domain/session-planner.js';

@Injectable()
export class IntermediateTopicsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService,
    @Inject(CurriculumService) private readonly curriculum: CurriculumService,
    @Inject(ProgramContextService) private readonly context: ProgramContextService,
    @Inject(CurriculumEligibilityService) private readonly eligibility: CurriculumEligibilityService,
    @Inject(SessionCreationService) private readonly sessions: SessionCreationService) {}

  async list(learnerId: string) {
    return this.database.$transaction(async tx => {
      const available = await this.available(learnerId, tx);
      if (!available.length) return [];
      const versions = await tx.lessonVersion.findMany({ where: { id: { in: available.map(({ mission }) => mission.lessonVersion.id) } },
        select: { id: true, contentImports: { where: { status: 'PUBLISHED' }, take: 1, select: { rawSource: true } },
          lesson: { select: { topicGroup: { select: { id: true, name: true, nameEn: true, description: true } } } } } });
      const metadata = new Map(versions.map(version => [version.id, { group: version.lesson.topicGroup,
        level: version.contentImports?.[0] ? parseLessonSource(version.contentImports[0].rawSource).document.lesson?.level : undefined }]));
      return available.map(({ mission }) => {
        const { group, level } = metadata.get(mission.lessonVersion.id) ?? {};
        return learnerTopicSchema.parse({ id: mission.id, title: mission.title, lessonVersionId: mission.lessonVersion.id,
          durationMinutes: mission.lessonVersion.intermediateTopic!.durationMinutes,
          ...(level ? { level } : {}),
          ...(group ? { group: { id: group.id, name: group.name, ...(group.nameEn ? { nameEn: group.nameEn } : {}), description: group.description } } : {}) });
      });
    }, { isolationLevel: 'RepeatableRead' });
  }

  async create(learnerId: string, input: CreateTopicSession) {
    const parsed = createTopicSessionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid topic session request');
    const request = parsed.data;
    return this.database.$transaction(async tx => {
      // Serialize all session creation/program switching for this learner.
      await tx.$queryRaw`SELECT "userId" FROM "LearnerProfile" WHERE "userId" = ${learnerId}::uuid FOR UPDATE`;
      const existing = await tx.learningSession.findUnique({
        where: { learnerId_clientSessionId: { learnerId, clientSessionId: request.clientSessionId } }, include: learningSessionInclude,
      });
      const mode = request.topicId ? 'chosen' : 'random';
      if (existing) {
        const plan = sessionPlanSchema.parse(existing.planSnapshot);
        if (plan.kind !== 'topic' || plan.topicSelection !== mode || (request.topicId && existing.missionId !== request.topicId)) {
          throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Session UUID is already associated with another topic or selection mode.' });
        }
        return toLearningSessionDto(existing);
      }
      const available = await this.available(learnerId, tx);
      const selected = request.topicId ? available.find(t => t.mission.id === request.topicId)
        : available.length ? available[randomInt(available.length)] : undefined;
      if (!selected) throw new NotFoundException('No eligible Intermediate topic found');
      return this.sessions.create(tx, { learnerId, clientSessionId: request.clientSessionId, mission: selected.mission,
        curriculumRevisionId: selected.curriculumRevisionId, durationMinutes: selected.mission.lessonVersion.intermediateTopic!.durationMinutes,
        reviewItems: [], topicSelection: mode });
    }, { timeout: 15_000 });
  }

  private async available(learnerId: string, tx: Prisma.TransactionClient) {
    const context = await this.context.resolve(learnerId, tx);
    if (context.programSlug !== 'intermediate') return [];
    const missions = await this.curriculum.getPublishedMissionsForLevel(undefined, 'learning', tx, context.programId);
    const available: Array<{ mission: PublishedMission; curriculumRevisionId: string | null }> = [];
    for (const candidate of missions) {
      if (!candidate.lessonVersion.intermediateTopic) continue;
      const eligible = await this.eligibility.resolve(learnerId, candidate.id, tx);
      if (!eligible.available) continue;
      const mission = eligible.revisionId ? await this.curriculum.getPublishedMissionForRevision(eligible.revisionId, tx) : candidate;
      if (mission.id !== candidate.id || mission.purpose !== 'learning' ||
          !mission.lessonVersion.intermediateTopic || !computeAvailableDurations(mission).length) continue;
      if (available.some(item => item.mission.lessonVersion.id === mission.lessonVersion.id)) continue;
      available.push({ mission, curriculumRevisionId: eligible.revisionId });
    }
    return available;
  }
}
