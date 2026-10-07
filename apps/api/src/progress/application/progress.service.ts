import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

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
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async getProgress(learnerId: string): Promise<LearnerProgressDto> {
    const [sessionGroups, activityAttempts, completedActivities, profile] = await Promise.all([
      this.database.learningSession.groupBy({
        by: ['status'], where: { learnerId }, _count: { _all: true },
      }),
      this.database.activityAttempt.count({ where: { learnerId } }),
      this.database.activityAttempt.count({
        where: {
          learnerId,
          OR: [{ evaluationStatus: 'SUBMITTED' }, { evaluationStatus: 'EVALUATED', score: 1 }],
        },
      }),
      this.database.learnerProfile.findUnique({
        where: { userId: learnerId },
        select: { currentLevelCode: true },
      }),
    ]);
    const count = (status: 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED') =>
      sessionGroups.find((group) => group.status === status)?._count._all ?? 0;
    return {
      activityAttempts,
      completedActivities,
      currentLevelCode: profile?.currentLevelCode ?? 'FOUNDATION_1',
      sessions: {
        completed: count('COMPLETED'),
        inProgress: count('IN_PROGRESS'),
        paused: count('PAUSED'),
        planned: count('PLANNED'),
      },
    };
  }
}
