import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';

export interface CurriculumEligibilityResolution {
  readonly revisionId: string | null;
  readonly available: boolean;
  readonly reasons: readonly string[];
}

@Injectable()
export class CurriculumEligibilityService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ProgramContextService) private readonly programContext: ProgramContextService,
  ) {}

  async resolve(
    learnerId: string,
    missionId: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<CurriculumEligibilityResolution> {
    if (!transaction) {
      return this.database.$transaction((tx) => this.resolve(learnerId, missionId, tx), {
        isolationLevel: 'RepeatableRead',
      });
    }
    const context = await this.programContext.resolve(learnerId, transaction);
    const mission = await transaction.mission.findUnique({
      where: { id: missionId },
      include: {
        curriculumDefinition: { select: { id: true } },
        curriculumRevisions: {
          where: { status: 'PUBLISHED' }, orderBy: { revision: 'desc' }, take: 1,
          include: {
            lessons: { include: { lessonVersion: { select: { status: true } } } },
            prerequisites: { include: { prerequisiteRevision: { select: { status: true } } } },
          },
        },
        level: { include: { path: { select: { programId: true, status: true } } } },
      },
    });
    if (!mission) return { revisionId: null, available: false, reasons: ['mission_not_found'] };
    const hierarchyReasons = [
      ...(mission.level.path.programId !== context.programId ? ['mission_outside_active_program'] : []),
      ...(mission.status !== 'PUBLISHED' ? ['mission_unpublished'] : []),
      ...(mission.level.status !== 'PUBLISHED' ? ['level_unpublished'] : []),
      ...(mission.level.path.status !== 'PUBLISHED' ? ['path_unpublished'] : []),
    ];
    const revision = mission.curriculumRevisions[0];
    if (!revision) {
      return mission.curriculumDefinition
        ? { revisionId: null, available: false, reasons: [...hierarchyReasons, 'curriculum_not_published'] }
        : { revisionId: null, available: hierarchyReasons.length === 0, reasons: hierarchyReasons };
    }
    const reasons = [...hierarchyReasons];
    if (!revision.lessons.length) reasons.push('no_bound_lessons');
    if (revision.lessons.some((binding) => binding.lessonVersion.status !== 'PUBLISHED')) {
      reasons.push('bound_lesson_unavailable');
    }
    const prerequisiteIds = revision.prerequisites.map((item) => item.prerequisiteRevisionId);
    for (const prerequisite of revision.prerequisites) {
      if (prerequisite.prerequisiteRevision.status !== 'PUBLISHED') {
        reasons.push(`prerequisite_unavailable:${prerequisite.prerequisiteRevisionId}`);
      }
    }
    if (prerequisiteIds.length) {
      const completed = new Set((await transaction.curriculumCompletion.findMany({
        where: { enrollmentId: context.enrollmentId, curriculumRevisionId: { in: prerequisiteIds } },
        select: { curriculumRevisionId: true },
      })).map((item) => item.curriculumRevisionId));
      for (const id of prerequisiteIds) if (!completed.has(id)) reasons.push(`prerequisite_incomplete:${id}`);
    }
    return { revisionId: revision.id, available: reasons.length === 0, reasons };
  }
}
