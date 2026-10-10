import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PlacementAttempt, Prisma } from '@prisma/client';
import {
  placementAttemptSchema,
  type CreatePlacementAttemptInput,
  type PlacementAttemptDto,
  type PlacementSkillResults,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import { SessionCreationService } from '../../learning-sessions/application/session-creation.service.js';

const initialSkillResults: PlacementSkillResults = {
  listening: { evidenceCount: 0, score: null, status: 'pending' },
  reading: { evidenceCount: 0, score: null, status: 'pending' },
  speaking: { evidenceCount: 0, score: null, status: 'pending' },
  writing: { evidenceCount: 0, score: null, status: 'pending' },
};

@Injectable()
export class PlacementAttemptsService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(CurriculumService) private readonly curriculum: CurriculumService,
    @Inject(SessionCreationService) private readonly sessionCreation: SessionCreationService,
  ) {}

  async create(
    learnerId: string,
    input: CreatePlacementAttemptInput,
  ): Promise<PlacementAttemptDto> {
    const replay = await this.database.placementAttempt.findUnique({
      where: {
        learnerId_clientAttemptId: {
          clientAttemptId: input.clientAttemptId,
          learnerId,
        },
      },
    });
    if (replay) return this.toDto(replay);

    return this.database.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "userId"
        FROM "LearnerProfile"
        WHERE "userId" = ${learnerId}::uuid
        FOR UPDATE
      `;
      const profile = await transaction.learnerProfile.findUnique({
        where: { userId: learnerId },
        include: { user: true },
      });
      if (!profile) throw new NotFoundException('Learner profile not found');
      if (profile.user.role !== 'LEARNER') throw new ForbiddenException('Learner onboarding is required');

      const lockedReplay = await transaction.placementAttempt.findUnique({
        where: {
          learnerId_clientAttemptId: {
            clientAttemptId: input.clientAttemptId,
            learnerId,
          },
        },
      });
      if (lockedReplay) return this.toDto(lockedReplay);
      if (profile.onboardingStatus === 'COMPLETE') {
        throw new ConflictException({
          code: 'ONBOARDING_ALREADY_COMPLETE',
          message: 'Learner onboarding is already complete',
          statusCode: 409,
        });
      }

      const active = await transaction.placementAttempt.findFirst({
        where: { learnerId, status: { not: 'CONFIRMED' } },
        orderBy: { updatedAt: 'desc' },
      });
      if (active) {
        throw new ConflictException({
          attemptId: active.id,
          code: 'PLACEMENT_ATTEMPT_ACTIVE',
          message: 'Resume the existing placement attempt',
          statusCode: 409,
        });
      }

      const mission = await this.curriculum.getPublishedPlacementMission(transaction);
      const session = await this.sessionCreation.create(transaction, {
        clientSessionId: input.clientAttemptId,
        durationMinutes: 45,
        learnerId,
        mission,
        reviewItems: [],
      });
      const attempt = await transaction.placementAttempt.create({
        data: {
          clientAttemptId: input.clientAttemptId,
          learnerId,
          learningSessionId: session.id,
          lessonVersionId: session.lessonVersionId,
          policyVersion: 'workplace-placement-v1',
          skillResults: initialSkillResults as unknown as Prisma.InputJsonValue,
        },
      });
      return this.toDto(attempt);
    }, { timeout: 15_000 });
  }

  async getOwned(learnerId: string, id: string): Promise<PlacementAttemptDto> {
    const attempt = await this.database.placementAttempt.findFirst({ where: { id, learnerId } });
    if (!attempt) throw new NotFoundException('Placement attempt not found');
    return this.toDto(attempt);
  }

  private toDto(attempt: PlacementAttempt): PlacementAttemptDto {
    const nextAction = attempt.status === 'IN_PROGRESS'
      ? 'continue_assessment'
      : attempt.status === 'PROCESSING'
        ? 'wait_for_evaluation'
        : attempt.status === 'ACTION_REQUIRED'
          ? 'retry_evaluation'
          : attempt.status === 'RECOMMENDED'
            ? 'review_recommendation'
            : 'open_dashboard';
    return placementAttemptSchema.parse({
      clientAttemptId: attempt.clientAttemptId,
      confirmedAt: attempt.confirmedAt?.toISOString() ?? null,
      createdAt: attempt.createdAt.toISOString(),
      explanation: attempt.explanation,
      id: attempt.id,
      learningSessionId: attempt.learningSessionId,
      lessonVersionId: attempt.lessonVersionId,
      nextAction,
      policyVersion: attempt.policyVersion,
      recommendedLevelCode: attempt.recommendedLevelCode,
      retryableAttemptIds: [],
      skillResults: attempt.skillResults,
      status: attempt.status,
      updatedAt: attempt.updatedAt.toISOString(),
    });
  }
}
