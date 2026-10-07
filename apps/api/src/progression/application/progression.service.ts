import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, CheckpointAssessment as AssessmentRecord } from '@prisma/client';
import { checkpointAssessmentSchema, type CheckpointAssessment, type CreateCheckpointAssessment, type ProgressionSummary } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { evaluateCheckpoint } from '../domain/checkpoint-policy.js';
import { availableNextLevel, checkpointSessionInclude, frozenActivities, readCheckpointEvidence } from './checkpoint-evidence.js';

@Injectable()
export class ProgressionService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async getSummary(learnerId: string): Promise<ProgressionSummary> {
    const profile = await this.database.learnerProfile.findUnique({ where: { userId: learnerId } });
    const currentLevelCode = profile?.currentLevelCode ?? 'FOUNDATION_1';
    const [eligibleSessionId, latest, nextLevelCode] = await Promise.all([
      this.findEligibleSessionId(learnerId, currentLevelCode),
      this.database.checkpointAssessment.findFirst({
        where: { learnerId, levelCode: currentLevelCode }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      availableNextLevel(this.database, currentLevelCode),
    ]);
    const prerequisites = await readCheckpointEvidence(this.database, learnerId, currentLevelCode);
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
  }

  private async findEligibleSessionId(learnerId: string, levelCode: string): Promise<string | null> {
    let cursor: string | undefined;
    for (;;) {
      const sessions = await this.database.learningSession.findMany({
        where: { learnerId, status: 'COMPLETED', mission: { level: { code: levelCode } } },
        include: { mission: { include: { level: true } }, lessonVersion: true },
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
      const profile = await this.lockProfile(transaction, learnerId);
      const replay = await transaction.checkpointAssessment.findUnique({
        where: { learnerId_clientAssessmentId: { learnerId, clientAssessmentId: input.clientAssessmentId } },
      });
      if (replay) {
        if (replay.sessionId !== input.sessionId.toLowerCase()) throw new ConflictException('Assessment UUID is already associated with another session');
        return this.toAssessment(replay);
      }
      const session = await transaction.learningSession.findFirst({
        where: { id: input.sessionId, learnerId }, include: checkpointSessionInclude,
      });
      if (!session) throw new NotFoundException('Learning session not found');
      if (session.status !== 'COMPLETED') throw new ConflictException('Complete the session before assessing');
      if (session.mission.level.code !== profile.currentLevelCode) throw new ConflictException('Session is not at the learner current level');
      const evidence = await readCheckpointEvidence(transaction, learnerId, profile.currentLevelCode, session);
      const decision = evaluateCheckpoint(evidence);
      const nextLevelCode = await availableNextLevel(transaction, profile.currentLevelCode);
      const assessment = await transaction.checkpointAssessment.create({
        data: {
          learnerId, clientAssessmentId: input.clientAssessmentId, sessionId: session.id,
          lessonVersionId: session.lessonVersionId, levelCode: profile.currentLevelCode,
          policyVersion: 'workplace-checkpoint-v1', status: decision.status,
          skills: decision.skills as Prisma.InputJsonValue,
          reinforcement: decision.reinforcement as Prisma.InputJsonValue,
          evidenceSnapshot: { ...evidence, plan: session.planSnapshot } as unknown as Prisma.InputJsonValue,
          canAdvance: decision.status === 'passed' && nextLevelCode !== null, nextLevelCode,
        },
      });
      return this.toAssessment(assessment);
    }, { timeout: 15_000 });
  }

  async confirm(learnerId: string, assessmentId: string): Promise<ProgressionSummary> {
    await this.database.$transaction(async (transaction) => {
      const profile = await this.lockProfile(transaction, learnerId);
      const record = await transaction.checkpointAssessment.findFirst({ where: { id: assessmentId, learnerId } });
      if (!record) throw new NotFoundException('Checkpoint assessment not found');
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
      if (profile.currentLevelCode !== record.levelCode) throw new ConflictException('Learner level changed after this assessment');
      // The immutable decision must already pass. Live curriculum can add blockers,
      // but new attempts must never upgrade an old failed or pending snapshot.
      const prerequisites = await readCheckpointEvidence(transaction, learnerId, profile.currentLevelCode);
      if (!prerequisites.curriculumReady || !prerequisites.allMissionsCompleted ||
          prerequisites.requiredBlocks.some((block) => block.score === null || block.score < 0.7)) {
        throw new ConflictException('Current curriculum prerequisites changed; complete required missions and scored Language Blocks before confirming');
      }
      const nextLevelCode = await availableNextLevel(transaction, profile.currentLevelCode);
      if (nextLevelCode !== record.nextLevelCode) throw new ConflictException('Next-level availability changed; reassess before confirming');
      if (nextLevelCode !== null) {
        if (!assessment.canAdvance) throw new ConflictException('Assessment cannot advance');
        const update = await transaction.learnerProfile.updateMany({
          where: { userId: learnerId, currentLevelCode: record.levelCode }, data: { currentLevelCode: nextLevelCode },
        });
        if (update.count !== 1) throw new ConflictException('Learner level changed while confirming');
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

  private toAssessment(record: AssessmentRecord): CheckpointAssessment {
    return checkpointAssessmentSchema.parse({
      id: record.id, sessionId: record.sessionId, levelCode: record.levelCode, policyVersion: record.policyVersion,
      status: record.status, createdAt: record.createdAt.toISOString(), skills: record.skills,
      reinforcement: record.reinforcement, canAdvance: record.canAdvance, nextLevelCode: record.nextLevelCode,
    });
  }
}
