import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';

export interface LearnerProgressDto {
  readonly activityAttempts: number;
  readonly completedActivities: number;
  readonly currentLevelCode: string | null;
  readonly sessions: {
    readonly completed: number;
    readonly inProgress: number;
    readonly paused: number;
    readonly planned: number;
  };
}

@Injectable()
export class ProgressService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ProgramContextService) private readonly programContext: ProgramContextService,
  ) {}

  async getProgress(learnerId: string): Promise<LearnerProgressDto> {
    return this.database.$transaction(async (transaction) => {
      const profile = await transaction.learnerProfile.findUnique({ where: { userId: learnerId }, select: { onboardingStatus: true } });
      if (profile?.onboardingStatus === 'PENDING') return {
        activityAttempts: 0, completedActivities: 0, currentLevelCode: null,
        sessions: { completed: 0, inProgress: 0, paused: 0, planned: 0 },
      };
      const context = await this.programContext.resolve(learnerId, transaction);
      const mission = { purpose: 'LEARNING' as const, level: { path: { programId: context.programId } } };
      const [sessionGroups, activityAttempts, completedActivities] = await Promise.all([
        transaction.learningSession.groupBy({
          by: ['status'], where: { learnerId, mission }, _count: { _all: true },
        }),
        transaction.activityAttempt.count({
          where: { learnerId, session: { mission } },
        }),
        transaction.activityAttempt.count({
          where: {
            learnerId,
            session: { mission },
            OR: [{ evaluationStatus: 'SUBMITTED' }, { evaluationStatus: 'EVALUATED', score: 1 }],
          },
        }),
      ]);
      const count = (status: 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED') =>
        sessionGroups.find((group) => group.status === status)?._count._all ?? 0;
      return {
        activityAttempts,
        completedActivities,
        currentLevelCode: context.levelCode,
        sessions: {
          completed: count('COMPLETED'),
          inProgress: count('IN_PROGRESS'),
          paused: count('PAUSED'),
          planned: count('PLANNED'),
        },
      };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
