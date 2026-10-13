import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  curriculumDefinitionInputSchema,
  curriculumRoadmapSchema,
  type CurriculumObjective,
  type CurriculumRoadmapDto,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
import { CurriculumEligibilityService } from './curriculum-eligibility.service.js';
import { evaluateObjectiveEvidence } from '../domain/objective-evidence-policy.js';

const POLICY_VERSION = 'curriculum-objective-v1';

@Injectable()
export class CurriculumProgressService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ProgramContextService) private readonly programContext: ProgramContextService,
    @Inject(CurriculumEligibilityService) private readonly eligibility: CurriculumEligibilityService,
  ) {}

  async projectSession(sessionId: string, transaction?: Prisma.TransactionClient): Promise<void> {
    if (!transaction) {
      await this.database.$transaction((tx) => this.projectSession(sessionId, tx), { timeout: 15_000 });
      return;
    }
    const session = await transaction.learningSession.findUnique({
      where: { id: sessionId },
      include: { curriculumRevision: { include: { mission: { include: { level: { include: { path: true } } } } } } },
    });
    if (!session?.curriculumRevision || session.status !== 'COMPLETED' ||
        session.curriculumRevision.missionId !== session.missionId) return;
    const enrollment = await transaction.learnerProgramEnrollment.findUnique({
      where: { learnerId_programId: {
        learnerId: session.learnerId, programId: session.curriculumRevision.mission.level.path.programId,
      } },
    });
    if (!enrollment) return;
    const progress = await this.readRevisionProgress(transaction, session.learnerId, session.curriculumRevisionId!);
    if (!progress.objectives.filter((objective) => objective.required).every((objective) => objective.completed)) return;
    await transaction.curriculumCompletion.upsert({
      where: { enrollmentId_curriculumRevisionId: { enrollmentId: enrollment.id, curriculumRevisionId: session.curriculumRevisionId! } },
      create: {
        enrollmentId: enrollment.id,
        curriculumRevisionId: session.curriculumRevisionId!,
        policyVersion: POLICY_VERSION,
        evidenceSnapshot: {
          objectiveEvidence: progress.evidence,
          sessionIds: progress.sessionIds,
        } as Prisma.InputJsonValue,
      },
      update: {},
    });
  }

  async getRoadmap(learnerId: string): Promise<CurriculumRoadmapDto> {
    return this.database.$transaction(async (tx) => {
      const context = await this.programContext.resolve(learnerId, tx);
      const revisions = await tx.curriculumRevision.findMany({
        where: { status: 'PUBLISHED', mission: { status: 'PUBLISHED', level: { status: 'PUBLISHED', path: { programId: context.programId, status: 'PUBLISHED' } } } },
        orderBy: [{ missionId: 'asc' }, { revision: 'desc' }],
        include: { mission: true },
        take: 1000,
      });
      const seenMissionIds = new Set<string>();
      const latest = revisions.filter((revision) => {
        if (seenMissionIds.has(revision.missionId)) return false;
        seenMissionIds.add(revision.missionId);
        return true;
      });
      const items = await Promise.all(latest.map(async (revision) => {
        const [availability, completion, activeSession, progress] = await Promise.all([
          this.eligibility.resolve(learnerId, revision.missionId, tx),
          tx.curriculumCompletion.findUnique({ where: { enrollmentId_curriculumRevisionId: {
            enrollmentId: context.enrollmentId, curriculumRevisionId: revision.id,
          } } }),
          tx.learningSession.findFirst({
            where: { learnerId, curriculumRevisionId: revision.id, status: { in: ['PLANNED', 'IN_PROGRESS', 'PAUSED'] } },
            orderBy: { createdAt: 'desc' }, select: { id: true },
          }),
          this.readRevisionProgress(tx, learnerId, revision.id),
        ]);
        const state = completion ? 'completed' : activeSession ? 'in_progress' : availability.available ? 'available' : 'locked';
        return {
          missionId: revision.missionId, revisionId: revision.id, title: revision.mission.title,
          state, unmetPrerequisites: availability.reasons, activeSessionId: activeSession?.id ?? null,
          reviewDue: progress.reviewDue,
          objectives: progress.objectives,
        } as const;
      }));
      return curriculumRoadmapSchema.parse({ programId: context.programId, enrollmentId: context.enrollmentId, items });
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }

  private async readRevisionProgress(transaction: Prisma.TransactionClient, learnerId: string, revisionId: string) {
    const revision = await transaction.curriculumRevision.findUniqueOrThrow({ where: { id: revisionId } });
    const definition = curriculumDefinitionInputSchema.parse(revision.snapshot);
    const sessions = await transaction.learningSession.findMany({
      where: { learnerId, curriculumRevisionId: revisionId, status: 'COMPLETED' },
      select: {
        id: true, lessonVersionId: true,
        attempts: { select: { id: true, evaluationStatus: true, score: true, activity: { select: { slug: true } } } },
      },
    });
    const attempts = sessions.flatMap((session) => session.attempts.map((attempt) => ({
      id: attempt.id, lessonVersionId: session.lessonVersionId, activitySlug: attempt.activity.slug,
      evaluationStatus: attempt.evaluationStatus, score: attempt.score,
    })));
    const blockSlugs = [...new Set(definition.objectives.flatMap((objective) =>
      objective.evidence.flatMap((evidence) => evidence.languageBlockSlugs)))];
    const masteryRecords = await transaction.masteryRecord.findMany({
      where: { learnerId, languageBlock: { slug: { in: blockSlugs } }, lastEvidenceAt: { not: null },
        events: { some: { learnerId, attempt: { learnerId, evaluationStatus: 'EVALUATED', score: { not: null } } } } },
      include: { languageBlock: { select: { slug: true } } },
    });
    const mastery = masteryRecords.map((record) => ({
      skill: record.skill, languageBlockSlug: record.languageBlock.slug, score: record.score,
    }));
    const evaluated = definition.objectives.map((objective: CurriculumObjective) => ({
      objective, result: evaluateObjectiveEvidence(objective, attempts, mastery),
    }));
    return {
      objectives: evaluated.map(({ objective, result }) => ({
        slug: objective.slug, statement: objective.statement, skills: objective.skills,
        required: objective.required, completed: result.completed,
      })),
      evidence: evaluated.map(({ objective, result }) => ({ slug: objective.slug, attemptIds: result.evidenceAttemptIds })),
      sessionIds: sessions.map((session) => session.id).sort(),
      reviewDue: masteryRecords.some((record) => record.nextReviewAt !== null && record.nextReviewAt <= new Date()),
    };
  }
}
