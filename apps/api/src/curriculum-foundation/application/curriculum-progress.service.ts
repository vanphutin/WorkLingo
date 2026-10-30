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
    const program = enrollment.curriculumRevisionIds?.length ? await transaction.learningProgram.findUnique({ where: { id: session.curriculumRevision.mission.level.path.programId } }) : null;
    const activityCompletion = program?.progressionPolicy === 'ACTIVITY_COMPLETION';
    if (activityCompletion && !enrollment.curriculumRevisionIds.includes(session.curriculumRevisionId!)) return;
    const progress = await this.readRevisionProgress(transaction, session.learnerId, session.curriculumRevisionId!, activityCompletion);
    if (!progress.objectives.filter((objective) => objective.required).every((objective) => objective.completed)) return;
    await transaction.curriculumCompletion.upsert({
      where: { enrollmentId_curriculumRevisionId: { enrollmentId: enrollment.id, curriculumRevisionId: session.curriculumRevisionId! } },
      create: {
        enrollmentId: enrollment.id,
        curriculumRevisionId: session.curriculumRevisionId!,
        policyVersion: activityCompletion ? 'curriculum-activity-completion-v1' : POLICY_VERSION,
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
      const enrollment = await tx.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: context.enrollmentId }, select: { curriculumRevisionIds: true } });
      const revisions = await tx.curriculumRevision.findMany({
        where: { ...(enrollment.curriculumRevisionIds.length ? { id: { in: enrollment.curriculumRevisionIds } } : { status: 'PUBLISHED' }), mission: { status: 'PUBLISHED', level: { status: 'PUBLISHED', path: { programId: context.programId, status: 'PUBLISHED' } } } },
        orderBy: enrollment.curriculumRevisionIds.length ? { revision: 'asc' } : [{ missionId: 'asc' }, { revision: 'desc' }],
        include: { mission: true },
        take: 1000,
      });
      const seenMissionIds = new Set<string>();
      const latest = enrollment.curriculumRevisionIds.length ? revisions : revisions.filter((revision) => {
        if (seenMissionIds.has(revision.missionId)) return false;
        seenMissionIds.add(revision.missionId);
        return true;
      });
      if (enrollment.curriculumRevisionIds.length) latest.sort((a,b) => enrollment.curriculumRevisionIds.indexOf(a.id) - enrollment.curriculumRevisionIds.indexOf(b.id));
      const program = await tx.learningProgram.findUnique({ where: { id: context.programId } });
      const activityCompletion = program?.progressionPolicy === 'ACTIVITY_COMPLETION';
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
          this.readRevisionProgress(tx, learnerId, revision.id, activityCompletion),
        ]);
        const state = enrollment.curriculumRevisionIds.length ? (activeSession ? 'in_progress' : !availability.available ? 'locked' : completion ? 'completed' : 'available') : (completion ? 'completed' : activeSession ? 'in_progress' : availability.available ? 'available' : 'locked');
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

  private planBinds(value: Prisma.JsonValue, lessonVersionId: string): boolean {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.lessonVersionId === lessonVersionId);
  }

  private planContains(value: Prisma.JsonValue, activityId: string): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.blocks)) return false;
    return value.blocks.some(block => block && typeof block === 'object' && !Array.isArray(block) && Array.isArray(block.activityIds) && block.activityIds.includes(activityId));
  }

  private async readRevisionProgress(transaction: Prisma.TransactionClient, learnerId: string, revisionId: string, activityCompletion = false) {
    const revision = await transaction.curriculumRevision.findUniqueOrThrow({ where: { id: revisionId }, include: { lessons: true } });
    const definition = curriculumDefinitionInputSchema.parse(revision.snapshot);
    const sessions = await transaction.learningSession.findMany({
      where: { learnerId, curriculumRevisionId: revisionId, status: 'COMPLETED' },
      select: {
        id: true, lessonVersionId: true, learnerId: true, status: true, planSnapshot: true, mission: { select: { purpose: true } },
        attempts: { select: { id: true, activityId: true, learnerId: true, sessionId: true, evaluationStatus: true, score: true, activity: { select: { slug: true, lessonVersionId: true } } } },
      },
    });
    const completedSessions = activityCompletion ? sessions.filter(session => session.learnerId === learnerId && session.status === 'COMPLETED' && this.planBinds(session.planSnapshot, session.lessonVersionId) && session.mission.purpose === 'LEARNING' && revision.lessons.some(lesson => lesson.lessonVersionId === session.lessonVersionId)) : sessions;
    const attempts = completedSessions.flatMap((session) => session.attempts.filter(attempt => !activityCompletion || (attempt.learnerId === learnerId && attempt.sessionId === session.id && attempt.activity.lessonVersionId === session.lessonVersionId && this.planContains(session.planSnapshot, attempt.activityId))).map((attempt) => ({
      id: attempt.id, lessonVersionId: session.lessonVersionId, activitySlug: attempt.activity.slug,
      evaluationStatus: attempt.evaluationStatus, score: attempt.score,
    })));
    const blockSlugs = [...new Set(definition.objectives.flatMap((objective) =>
      objective.evidence.flatMap((evidence) => evidence.languageBlockSlugs)))];
    const masteryRecords = activityCompletion ? [] : await transaction.masteryRecord.findMany({
      where: { learnerId, languageBlock: { slug: { in: blockSlugs } }, lastEvidenceAt: { not: null },
        events: { some: { learnerId, attempt: { learnerId, evaluationStatus: 'EVALUATED', score: { not: null } } } } },
      include: { languageBlock: { select: { slug: true } } },
    });
    const mastery = masteryRecords.map((record) => ({
      skill: record.skill, languageBlockSlug: record.languageBlock.slug, score: record.score,
    }));
    const evaluated = definition.objectives.map((objective: CurriculumObjective) => ({
      objective, result: activityCompletion ? {
        completed: objective.evidence.length > 0 && objective.evidence.every(mapping => attempts.some(attempt => attempt.lessonVersionId === mapping.lessonVersionId && attempt.activitySlug === mapping.activitySlug)),
        evidenceAttemptIds: attempts.filter(attempt => objective.evidence.some(mapping => attempt.lessonVersionId === mapping.lessonVersionId && attempt.activitySlug === mapping.activitySlug)).map(attempt => attempt.id).sort(),
      } : evaluateObjectiveEvidence(objective, attempts, mastery),
    }));
    return {
      objectives: evaluated.map(({ objective, result }) => ({
        slug: objective.slug, statement: objective.statement, skills: objective.skills,
        required: objective.required, completed: result.completed,
      })),
      evidence: evaluated.map(({ objective, result }) => ({ slug: objective.slug, attemptIds: result.evidenceAttemptIds })),
      sessionIds: completedSessions.map((session) => session.id).sort(),
      reviewDue: masteryRecords.some((record) => record.nextReviewAt !== null && record.nextReviewAt <= new Date()),
    };
  }
}
