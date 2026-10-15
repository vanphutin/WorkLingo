import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  evaluateIeltsBandPathwaySchema, ieltsBandCurriculumContentSchema, ieltsBandPathwayAvailabilitySchema,
  ieltsBandPathwaySchema, startIeltsBandPathwaySchema, updateIeltsBandTargetSchema,
  type IeltsBandPathwayAvailabilityDto, type IeltsBandPathwayDto,
} from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { evaluateBandProgression } from '../domain/evaluate-band-progression.js';

const includeJourney = { curriculumVersion: true } as const;
type JourneyRecord = Prisma.IeltsBandJourneyGetPayload<{ include: typeof includeJourney }>;
type Snapshot = Pick<IeltsBandPathwayDto, 'proficiency' | 'practicePerformance' | 'unmetCriteria' | 'remediation' | 'recommendedPracticeFormats' | 'canAdvance'>;

@Injectable()
export class IeltsBandLearnerService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async availability(learnerId: string): Promise<IeltsBandPathwayAvailabilityDto> {
    const [bridge, curriculum, journey] = await Promise.all([
      this.bridgeComplete(learnerId),
      this.database.ieltsBandCurriculum.findFirst({ where: { status: 'PUBLISHED', currentPublishedVersionId: { not: null } } }),
      this.database.ieltsBandJourney.findUnique({ where: { learnerId }, include: includeJourney }),
    ]);
    return ieltsBandPathwayAvailabilitySchema.parse({
      eligible: bridge && !!curriculum,
      lockedReason: !bridge ? 'BRIDGE_REQUIRED' : !curriculum ? 'CURRICULUM_NOT_PUBLISHED' : null,
      targetBands: [3, 4, 5, 6, 7, 8, 9], journey: journey ? this.toDto(journey) : null,
    });
  }

  async get(learnerId: string): Promise<IeltsBandPathwayDto> {
    const journey = await this.database.ieltsBandJourney.findUnique({ where: { learnerId }, include: includeJourney });
    if (!journey) throw new NotFoundException('IELTS band pathway was not found.');
    return this.toDto(journey);
  }

  async start(learnerId: string, input: unknown): Promise<IeltsBandPathwayDto> {
    const parsed = startIeltsBandPathwaySchema.parse(input);
    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-band-start:' + learnerId}))`;
      const existing = await transaction.ieltsBandJourney.findUnique({ where: { learnerId }, include: includeJourney });
      if (existing) return this.toDto(existing);
      if (!await this.bridgeComplete(learnerId, transaction)) throw new ConflictException({ code: 'IELTS_BAND_PATHWAY_LOCKED', reason: 'BRIDGE_REQUIRED' });
      const curriculum = await transaction.ieltsBandCurriculum.findFirst({ where: { status: 'PUBLISHED', currentPublishedVersionId: { not: null } }, include: { currentPublishedVersion: true } });
      if (!curriculum?.currentPublishedVersion) throw new ConflictException({ code: 'IELTS_BAND_CURRICULUM_UNAVAILABLE' });
      const content = ieltsBandCurriculumContentSchema.parse(curriculum.currentPublishedVersion.content);
      const firstStage = content.stages[0]!;
      const snapshot = evaluateBandProgression({ stage: firstStage, completedSessions: 0, blocks: [] });
      const journey = await transaction.ieltsBandJourney.create({ data: {
        learnerId, clientJourneyId: parsed.clientJourneyId, curriculumVersionId: curriculum.currentPublishedVersion.id,
        currentStageCode: firstStage.code, targetBand: parsed.targetBand, evidenceSnapshot: snapshot as Prisma.InputJsonValue,
      }, include: includeJourney });
      return this.toDto(journey);
    });
  }

  async updateTarget(learnerId: string, input: unknown): Promise<IeltsBandPathwayDto> {
    const parsed = updateIeltsBandTargetSchema.parse(input);
    return this.database.$transaction(async (transaction) => {
      const journey = await transaction.ieltsBandJourney.findUnique({ where: { learnerId }, include: includeJourney });
      if (!journey) throw new NotFoundException('IELTS band pathway was not found.');
      if (journey.revision !== parsed.expectedRevision) throw new ConflictException({ code: 'IELTS_BAND_REVISION_STALE' });
      const content = ieltsBandCurriculumContentSchema.parse(journey.curriculumVersion.content);
      const stage = content.stages.find((item) => item.code === journey.currentStageCode)!;
      if (parsed.targetBand < stage.targetBand.to) throw new UnprocessableEntityException({ code: 'IELTS_TARGET_BELOW_CURRENT_STAGE' });
      const updated = await transaction.ieltsBandJourney.updateMany({ where: { id: journey.id, revision: parsed.expectedRevision }, data: { targetBand: parsed.targetBand, revision: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException({ code: 'IELTS_BAND_REVISION_STALE' });
      return this.toDto(await transaction.ieltsBandJourney.findUniqueOrThrow({ where: { id: journey.id }, include: includeJourney }));
    });
  }

  async evaluate(learnerId: string, input: unknown): Promise<IeltsBandPathwayDto> {
    const parsed = evaluateIeltsBandPathwaySchema.parse(input);
    return this.database.$transaction(async (transaction) => {
      const journey = await transaction.ieltsBandJourney.findUnique({ where: { learnerId }, include: includeJourney });
      if (!journey) throw new NotFoundException('IELTS band pathway was not found.');
      if (journey.completedAt || journey.revision !== parsed.expectedRevision) throw new ConflictException({ code: 'IELTS_BAND_REVISION_STALE' });
      const content = ieltsBandCurriculumContentSchema.parse(journey.curriculumVersion.content);
      const stageIndex = content.stages.findIndex((item) => item.code === journey.currentStageCode); const stage = content.stages[stageIndex]!;
      const sessions = await transaction.ieltsIntegratedSession.findMany({ where: { learnerId, completedAt: { not: null }, startedAt: { gte: journey.startedAt } }, include: { blocks: { select: { skill: true, result: true } } } });
      const blocks = sessions.flatMap((session) => session.blocks.map((block) => ({ skill: block.skill, correct: this.correct(block.result) })));
      const snapshot = evaluateBandProgression({ stage, completedSessions: sessions.length, blocks });
      const targetReached = stage.targetBand.to >= journey.targetBand;
      const finalStage = stageIndex === content.stages.length - 1;
      const completedAt = snapshot.canAdvance && (targetReached || finalStage) ? new Date() : null;
      const nextStageCode = snapshot.canAdvance && !completedAt ? content.stages[stageIndex + 1]!.code : stage.code;
      const updated = await transaction.ieltsBandJourney.updateMany({ where: { id: journey.id, revision: parsed.expectedRevision }, data: { currentStageCode: nextStageCode, evidenceSnapshot: snapshot as Prisma.InputJsonValue, completedAt, revision: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException({ code: 'IELTS_BAND_REVISION_STALE' });
      return this.toDto(await transaction.ieltsBandJourney.findUniqueOrThrow({ where: { id: journey.id }, include: includeJourney }));
    });
  }

  private async bridgeComplete(learnerId: string, database: PrismaService | Prisma.TransactionClient = this.database): Promise<boolean> {
    return (await database.ieltsBridgeProgress.count({ where: { learnerId, completedAt: { not: null }, moduleVersion: { required: true } } })) >= 4;
  }
  private correct(result: Prisma.JsonValue | null): boolean | null { return result && typeof result === 'object' && !Array.isArray(result) && typeof result.correct === 'boolean' ? result.correct : null; }
  private toDto(journey: JourneyRecord): IeltsBandPathwayDto {
    const content = ieltsBandCurriculumContentSchema.parse(journey.curriculumVersion.content);
    const stage = content.stages.find((item) => item.code === journey.currentStageCode);
    if (!stage) throw new ConflictException({ code: 'IELTS_BAND_STAGE_MISSING' });
    const snapshot = journey.evidenceSnapshot as unknown as Snapshot;
    return ieltsBandPathwaySchema.parse({ journeyId: journey.id, curriculumVersionId: journey.curriculumVersionId, curriculumVersion: journey.curriculumVersion.version, currentStageCode: stage.code, currentStageTitle: stage.title, targetBand: journey.targetBand, revision: journey.revision, startedAt: journey.startedAt.toISOString(), completedAt: journey.completedAt?.toISOString() ?? null, ...snapshot });
  }
}
