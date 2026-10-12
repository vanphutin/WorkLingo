import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, CheckpointAssessment as AssessmentRecord } from '@prisma/client';
import { checkpointAssessmentSchema, type CheckpointAssessment, type CreateCheckpointAssessment, type ProgressionSummary } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
import { evaluateCheckpoint } from '../domain/checkpoint-policy.js';
import { availableNextLevel, checkpointSessionInclude, frozenActivities, readCheckpointEvidence } from './checkpoint-evidence.js';

@Injectable()
export class ProgressionService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ProgramContextService) private readonly programContext: ProgramContextService,
  ) {}

  async getSummary(learnerId: string): Promise<ProgressionSummary> {
    return this.database.$transaction(async (transaction) => {
      const context = await this.programContext.resolve(learnerId, transaction);
      const currentLevelCode = context.levelCode;
      const [eligibleSessionId, latest, nextLevelCode] = await Promise.all([
        this.findEligibleSessionId(transaction, learnerId, currentLevelCode, context.programId),
        transaction.checkpointAssessment.findFirst({
          where: { learnerId, levelCode: currentLevelCode }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        availableNextLevel(transaction, currentLevelCode, context.programId),
      ]);
      const prerequisites = await readCheckpointEvidence(transaction, learnerId, currentLevelCode, undefined, context.programId);
      const reasons = [
        ...(eligibleSessionId ? [] : ['no_valid_completed_session']),
        ...(prerequisites.allMissionsCompleted ? [] : ['incomplete_missions']),
        ...(prerequisites.curriculumReady ? [] : ['curriculum_unavailable']),
      ];
      return {
        currentLevelCode, nextLevelCode, eligibleSessionId, canAssess: eligibleSessionId !== null,
        reasons,
        latestAssessment: latest ? this.toAssessment(latest) : null,
      };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }

  private async findEligibleSessionId(transaction: Prisma.TransactionClient, learnerId: string, levelCode: string, programId: string): Promise<string | null> {
    let cursor: string | undefined;
    for (;;) {
      const sessions = await transaction.learningSession.findMany({
        where: {
          learnerId,
          status: 'COMPLETED',
          mission: { level: { code: levelCode, path: { programId } }, purpose: 'LEARNING' },
        },
        include: { mission: { include: { level: { include: { path: true } } } }, lessonVersion: true },
        orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 25,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const session of sessions) {
        try {
          frozenActivities({ ...session, attempts: [] });
          return session.id;
        } catch (error) {
          if (!(error instanceof ConflictException)) throw error;
        }
      }
      if (sessions.length < 25) return null;
      cursor = sessions[sessions.length - 1]!.id;
    }
  }

  async assess(learnerId: string, input: CreateCheckpointAssessment): Promise<CheckpointAssessment> {
    return this.database.$transaction(async (transaction) => {
      await this.lockProfile(transaction, learnerId);
      const context = await this.programContext.resolve(learnerId, transaction);
      const replay = await transaction.checkpointAssessment.findUnique({
        where: { learnerId_clientAssessmentId: { learnerId, clientAssessmentId: input.clientAssessmentId } },
      });
      if (replay && replay.sessionId !== input.sessionId.toLowerCase()) throw new ConflictException('Assessment UUID is already associated with another session');
      const session = await transaction.learningSession.findFirst({
        where: { id: input.sessionId, learnerId, mission: { purpose: 'LEARNING' } },
        include: checkpointSessionInclude,
      });
      if (!session) throw new NotFoundException('Learning session not found');
      if (session.mission.level.path.programId !== context.programId) throw this.contextMismatch();
      if (replay) return this.toAssessment(replay);
      if (session.status !== 'COMPLETED') throw new ConflictException('Complete the session before assessing');
      if (session.mission.level.id !== context.levelId) throw new ConflictException('Session is not at the learner current level');
      const evidence = await readCheckpointEvidence(transaction, learnerId, context.levelCode, session, context.programId);
      const decision = evaluateCheckpoint(evidence);
      const nextLevelCode = await availableNextLevel(transaction, context.levelCode, context.programId);
      const assessment = await transaction.checkpointAssessment.create({
        data: {
          learnerId, clientAssessmentId: input.clientAssessmentId, sessionId: session.id,
          lessonVersionId: session.lessonVersionId, levelCode: context.levelCode,
          policyVersion: 'workplace-checkpoint-v1', status: decision.status,
          skills: decision.skills as Prisma.InputJsonValue,
          reinforcement: decision.reinforcement as Prisma.InputJsonValue,
          evidenceSnapshot: { ...evidence, plan: session.planSnapshot, programId: context.programId, enrollmentId: context.enrollmentId, enrollmentRevision: context.revision } as unknown as Prisma.InputJsonValue,
          canAdvance: decision.status === 'passed' && nextLevelCode !== null, nextLevelCode,
        },
      });
      return this.toAssessment(assessment);
    }, { timeout: 15_000 });
  }

  async confirm(learnerId: string, assessmentId: string): Promise<ProgressionSummary> {
    await this.database.$transaction(async (transaction) => {
      await this.lockProfile(transaction, learnerId);
      const context = await this.programContext.resolve(learnerId, transaction);
      const record = await transaction.checkpointAssessment.findFirst({ where: { id: assessmentId, learnerId } });
      if (!record) throw new NotFoundException('Checkpoint assessment not found');
      const session = await transaction.learningSession.findFirst({
        where: { id: record.sessionId, learnerId }, include: { mission: { include: { level: { include: { path: true } } } } },
      });
      if (!session || session.mission.level.path.programId !== context.programId) throw this.contextMismatch();
      const confirmed = await transaction.progressionConfirmation.findUnique({ where: { assessmentId: record.id } });
      if (confirmed) return;
      const assessment = this.toAssessment(record);
      if (assessment.policyVersion !== 'workplace-checkpoint-v1' || assessment.status !== 'passed' ||
          !Object.values(assessment.skills).every((skill) => skill.passed && skill.pendingCount === 0 &&
            skill.evaluatedCount > 0 && skill.score !== null && skill.score >= skill.threshold)) {
        throw new ConflictException('All four skills must pass before confirmation');
      }
      const evidence = record.evidenceSnapshot;
      if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) ||
          evidence.allMissionsCompleted !== true || evidence.curriculumReady !== true) {
        throw new ConflictException('Checkpoint prerequisites were not met');
      }
      if (context.levelCode !== record.levelCode ||
          (typeof evidence.enrollmentRevision === 'number' && evidence.enrollmentRevision !== context.revision)) {
        throw new ConflictException('Learner enrollment changed after this assessment');
      }
      // The immutable decision must already pass. Live curriculum can add blockers,
      // but new attempts must never upgrade an old failed or pending snapshot.
      const prerequisites = await readCheckpointEvidence(transaction, learnerId, context.levelCode, undefined, context.programId);
      if (!prerequisites.curriculumReady || !prerequisites.allMissionsCompleted ||
          prerequisites.requiredBlocks.some((block) => block.score === null || block.score < 0.7)) {
        throw new ConflictException('Current curriculum prerequisites changed; complete required missions and scored Language Blocks before confirming');
      }
      const nextLevelCode = await availableNextLevel(transaction, context.levelCode, context.programId);
      if (nextLevelCode !== record.nextLevelCode) throw new ConflictException('Next-level availability changed; reassess before confirming');
      if (nextLevelCode !== null) {
        if (!assessment.canAdvance) throw new ConflictException('Assessment cannot advance');
        const next = await transaction.level.findUniqueOrThrow({ where: { code: nextLevelCode }, include: { path: true } });
        if (next.path.programId !== context.programId) throw this.contextMismatch();
        const update = await transaction.learnerProgramEnrollment.updateMany({
          where: { id: context.enrollmentId, learnerId, currentLevelId: context.levelId, revision: context.revision },
          data: { currentLevelId: next.id, revision: { increment: 1 } },
        });
        if (update.count !== 1) throw new ConflictException('Learner level changed while confirming');
        if (context.programSlug === 'intermediate') {
          await transaction.learnerProfile.update({ where: { userId: learnerId }, data: { currentLevelCode: nextLevelCode } });
        }
      }
      await transaction.progressionConfirmation.create({
        data: { learnerId, assessmentId: record.id, fromLevelCode: record.levelCode, toLevelCode: nextLevelCode },
      });
    }, { timeout: 15_000 });
    return this.getSummary(learnerId);
  }

  private async lockProfile(transaction: Prisma.TransactionClient, learnerId: string) {
    await transaction.learnerProfile.upsert({ where: { userId: learnerId }, create: { userId: learnerId }, update: {} });
    await transaction.$queryRaw`SELECT "userId" FROM "LearnerProfile" WHERE "userId" = ${learnerId}::uuid FOR UPDATE`;
    return transaction.learnerProfile.findUniqueOrThrow({ where: { userId: learnerId } });
  }

  private contextMismatch() {
    return new ConflictException({ code: 'PROGRAM_CONTEXT_MISMATCH', message: 'This assessment belongs to a different learning program.' });
  }

  private toAssessment(record: AssessmentRecord): CheckpointAssessment {
    return checkpointAssessmentSchema.parse({
      id: record.id, sessionId: record.sessionId, levelCode: record.levelCode, policyVersion: record.policyVersion,
      status: record.status, createdAt: record.createdAt.toISOString(), skills: record.skills,
      reinforcement: record.reinforcement, canAdvance: record.canAdvance, nextLevelCode: record.nextLevelCode,
    });
  }
}
