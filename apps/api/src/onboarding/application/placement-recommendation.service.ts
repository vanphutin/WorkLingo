import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  learningSkillSchema,
  type PlacementAttemptDto,
  type PlacementSkillResults,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import {
  recommendPlacement,
  WORKPLACE_PLACEMENT_V1_CANDIDATES,
} from '../domain/placement-policy.js';
import { OnboardingService } from './onboarding.service.js';
import { PlacementAttemptsService } from './placement-attempts.service.js';

@Injectable()
export class PlacementRecommendationService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(OnboardingService) private readonly onboarding: OnboardingService,
    @Inject(PlacementAttemptsService) private readonly attempts: PlacementAttemptsService,
  ) {}

  async refresh(learnerId: string, attemptId: string): Promise<PlacementAttemptDto> {
    const placement = await this.database.placementAttempt.findFirst({
      where: { id: attemptId, learnerId },
      include: {
        learningSession: {
          include: {
            attempts: { include: { activity: { select: { skills: true } } } },
          },
        },
      },
    });
    if (!placement) throw new NotFoundException('Placement attempt not found');
    if (placement.status === 'RECOMMENDED' || placement.status === 'CONFIRMED') {
      return this.attempts.getOwned(learnerId, attemptId);
    }

    const activityAttempts = placement.learningSession.attempts;
    const skillResults = Object.fromEntries(learningSkillSchema.options.map((skill) => {
      const relevant = activityAttempts.filter((attempt) => attempt.activity.skills.includes(skill));
      const evaluated = relevant.filter((attempt) =>
        attempt.evaluationStatus === 'EVALUATED' && attempt.score !== null,
      );
      if (evaluated.length > 0) {
        const score = evaluated.reduce((sum, attempt) => sum + attempt.score!, 0) / evaluated.length;
        return [skill, { evidenceCount: evaluated.length, score, status: 'evaluated' as const }];
      }
      const actionRequired = relevant.some((attempt) => attempt.evaluationStatus === 'EVALUATION_FAILED');
      return [skill, {
        evidenceCount: 0,
        score: null,
        status: actionRequired ? 'action_required' as const : 'pending' as const,
      }];
    })) as PlacementSkillResults;
    if (placement.learningSession.status !== 'COMPLETED') {
      await this.persistInterim(learnerId, attemptId, 'IN_PROGRESS', skillResults);
      return this.attempts.getOwned(learnerId, attemptId);
    }
    if (Object.values(skillResults).some((result) => result.status === 'action_required')) {
      await this.persistInterim(learnerId, attemptId, 'ACTION_REQUIRED', skillResults);
      return this.attempts.getOwned(learnerId, attemptId);
    }
    if (Object.values(skillResults).some((result) => result.status !== 'evaluated')) {
      await this.persistInterim(learnerId, attemptId, 'PROCESSING', skillResults);
      return this.attempts.getOwned(learnerId, attemptId);
    }

    const state = await this.onboarding.getState(learnerId);
    const candidates = WORKPLACE_PLACEMENT_V1_CANDIDATES.map((candidate) => ({
      ...candidate,
      available: state.eligibleLevels.some((level) =>
        level.code === candidate.levelCode && level.available,
      ),
    }));
    const recommendation = recommendPlacement({ candidates, skillResults });
    if (!recommendation.ready) {
      await this.persistInterim(learnerId, attemptId, 'ACTION_REQUIRED', skillResults);
      return this.attempts.getOwned(learnerId, attemptId);
    }

    await this.database.placementAttempt.updateMany({
      where: {
        id: attemptId,
        learnerId,
        status: { in: ['IN_PROGRESS', 'PROCESSING', 'ACTION_REQUIRED'] },
      },
      data: {
        explanation: recommendation.explanation as unknown as Prisma.InputJsonValue,
        policyVersion: 'workplace-placement-v1',
        recommendedLevelCode: recommendation.recommendedLevelCode,
        skillResults: skillResults as unknown as Prisma.InputJsonValue,
        status: 'RECOMMENDED',
      },
    });
    return this.attempts.getOwned(learnerId, attemptId);
  }

  private async persistInterim(
    learnerId: string,
    attemptId: string,
    status: 'IN_PROGRESS' | 'PROCESSING' | 'ACTION_REQUIRED',
    skillResults: PlacementSkillResults,
  ): Promise<void> {
    await this.database.placementAttempt.updateMany({
      where: { id: attemptId, learnerId, status: { notIn: ['RECOMMENDED', 'CONFIRMED'] } },
      data: { skillResults: skillResults as unknown as Prisma.InputJsonValue, status },
    });
  }
}
