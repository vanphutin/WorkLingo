import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma, EvaluationRun } from '@prisma/client';
import {
  assessmentResultSchema,
  programVersionInputSchema,
  sessionPlanSchema,
  type AssessmentResult,
} from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { LanguageEvaluationPort } from '../../ai-gateway/domain/language-evaluation.port.js';
import {
  ASSESSMENT_POLICY_VERSION,
  ASSESSMENT_PROMPT_VERSION,
  assessmentHash,
  resolveAssessmentContext,
  type AssessmentContext,
} from '../domain/assessment-context.js';
import {
  runAssessment,
  type AssessmentEvaluator,
} from '../domain/assessment-orchestrator.js';
import {
  aggregateAssessment,
  projectLearnerAssessment,
} from '../domain/assessment-scoring.js';
import { projectAssessmentMastery } from '../domain/assessment-mastery.js';
import { resolveListeningAudioBinding } from '../../learning-sessions/domain/listening-audio-binding.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';

export const ASSESSMENT_OPTIONS = Symbol('ASSESSMENT_OPTIONS');
export interface AssessmentOptions {
  readonly enabled: boolean;
  readonly privacyVerified?: boolean;
  readonly leaseMs?: number;
  readonly synthetic?: boolean;
}
const terminal = new Set([
  'SCORED',
  'NEEDS_REVIEW',
  'NOT_SCORABLE',
  'FAILED',
  'CANCELLED',
]);
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
@Injectable()
export class AssessmentHistoryService {
  private readonly active = new Map<string, AbortController>();
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(LanguageEvaluationPort)
    private readonly language: LanguageEvaluationPort,
    @Inject(ASSESSMENT_OPTIONS) private readonly options: AssessmentOptions,
  ) {}

  private async contextFor(
    learnerId: string,
    attemptId: string,
    requireSource = true,
  ) {
    const attempt = await this.database.activityAttempt.findFirst({
      where: { id: attemptId, learnerId },
      include: {
        activity: true,
        recording: true,
        session: {
          include: {
            lessonVersion: true,
            mission: { include: { level: { include: { path: true } } } },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Assessment attempt not found');
    const plan = sessionPlanSchema.parse(attempt.session.planSnapshot);
    if (
      plan.lessonVersionId !== attempt.session.lessonVersionId ||
      plan.missionId !== attempt.session.missionId ||
      !plan.blocks.some((b) => b.activityIds.includes(attempt.activityId))
    )
      throw new ConflictException('ASSESSMENT_SESSION_PIN_MISMATCH');
    const pinned = plan.programVersionId ?? null;
    if (pinned) {
      if (!plan.programEnrollmentId)
        throw new ConflictException('ASSESSMENT_ENROLLMENT_PIN_REQUIRED');
      const enrollment = await this.database.learnerProgramEnrollment.findFirst(
        {
          where: { id: plan.programEnrollmentId, learnerId },
          include: { programVersion: true },
        },
      );
      if (
        !enrollment ||
        enrollment.programVersionId !== pinned ||
        enrollment.programId !== attempt.session.mission.level.path.programId ||
        enrollment.programVersion?.id !== pinned
      )
        throw new ConflictException('ASSESSMENT_ENROLLMENT_PIN_MISMATCH');
      const snapshot = programVersionInputSchema.parse(
        enrollment.programVersion.snapshot,
      );
      const binding = snapshot.curriculumBindings.find(
        (b) =>
          b.curriculumRevisionId === attempt.session.curriculumRevisionId &&
          b.missionId === attempt.session.missionId,
      );
      if (
        !binding?.lessons.some(
          (l) =>
            l.lessonVersionId === attempt.session.lessonVersionId &&
            l.activityIds.includes(attempt.activityId),
        )
      )
        throw new ConflictException('ASSESSMENT_RELEASE_BINDING_MISMATCH');
    } else if (plan.programEnrollmentId)
      throw new ConflictException('ASSESSMENT_VERSION_PIN_REQUIRED');
    const context = resolveAssessmentContext(attempt, pinned);
    if (requireSource && context.skill === 'listening') {
      const audio = await resolveListeningAudioBinding(
        this.database,
        attempt.session.lessonVersionId,
        activitySchema.parse(attempt.activity),
        { allowSynthetic: this.options.synthetic === true },
      );
      context.privateContext.audioIdentity = {
        artifactId: audio.artifactId,
        checksum: audio.checksum,
        scriptHash: audio.scriptHash,
        synthetic: audio.synthetic,
      };
      context.sources = { ...context.sources, transcript: audio.scriptText };
    }
    if (context.skill === 'speaking' && attempt.recording) {
      const rec = attempt.recording;
      if (
        requireSource &&
        (rec.deletedAt ||
          rec.deletionRequestedAt ||
          (rec.retentionUntil && rec.retentionUntil.getTime() < Date.now()))
      )
        throw new UnprocessableEntityException(
          'ASSESSMENT_RECORDING_UNAVAILABLE',
        );
      if (rec.transcript) {
        context.sources = { ...context.sources, submission: rec.transcript };
      }
      const metrics = rec.speechMetrics as {
        assessmentEvidence?: {
          audioChecksum?: string;
          durationMs?: number;
          verified?: boolean;
          synthetic?: boolean;
          dimensions?: string[];
        };
      } | null;
      const acoustic = metrics?.assessmentEvidence;
      if (
        acoustic?.verified &&
        !acoustic.synthetic &&
        acoustic.audioChecksum === rec.checksum &&
        typeof acoustic.durationMs === 'number'
      )
        context.sources = {
          ...context.sources,
          acoustic: {
            checksum: rec.checksum,
            durationMs: acoustic.durationMs,
            verified: true,
            dimensions: acoustic.dimensions ?? [],
          },
        };
      context.privateContext.audioIdentity = {
        recordingId: rec.id,
        checksum: rec.checksum,
        metrics: rec.speechMetrics,
      };
    }
    context.contextHash = assessmentHash({
      base: context.contextHash,
      audioIdentity: context.privateContext.audioIdentity,
    });
    context.inputHash = assessmentHash({
      submission: context.sources.submission,
      contextHash: context.contextHash,
    });
    return { attempt, context };
  }
  private result(
    row: EvaluationRun,
    context?: AssessmentContext,
  ): AssessmentResult {
    if (row.result) return assessmentResultSchema.parse(row.result);
    if (!context) throw new ConflictException('ASSESSMENT_RESULT_UNAVAILABLE');
    return assessmentResultSchema.parse({
      schemaVersion: 'assessment/1',
      id: row.id,
      submissionId: row.attemptId,
      learnerId: context.learnerId,
      programVersionId: context.programVersionId,
      lessonVersionId: context.lessonVersionId,
      activityId: context.activityId,
      skill: context.skill,
      rubricId: context.rubric.id,
      rubricVersion: context.rubric.version,
      policyVersion: ASSESSMENT_POLICY_VERSION,
      promptVersion: ASSESSMENT_PROMPT_VERSION,
      inputHash: row.inputHash,
      contextHash: row.contextHash,
      status: row.status,
      criteria: [],
      totalScore: null,
      maximumScore: 100,
      evidence: [],
      feedback: 'Assessment is pending.',
      confidence: 'UNKNOWN',
      corrections: [],
      providers: [],
      previousEvaluationId: row.previousRunId,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    });
  }
  private safe(result: AssessmentResult, context?: AssessmentContext) {
    const payload = context?.privateContext.payload;
    const phrases: string[] = [];
    if (payload && 'questions' in payload) {
      for (const q of payload.questions) {
        if (q.answerIndex >= 0 && q.options[q.answerIndex])
          phrases.push(q.options[q.answerIndex]!);
        phrases.push(...(q.acceptedAnswers ?? []));
      }
    }
    if (payload && 'sampleAnswer' in payload)
      phrases.push(payload.sampleAnswer);
    if (context?.skill === 'listening' && context.sources.transcript)
      phrases.push(
        ...context.sources.transcript
          .split(/[.!?\n]+/u)
          .map((x) => x.trim())
          .filter(Boolean),
      );
    return assessmentResultSchema.parse(
      projectLearnerAssessment(result, phrases),
    );
  }
  async history(learnerId: string, attemptId: string, admin = false) {
    const { context } = await this.contextFor(learnerId, attemptId, false);
    const rows = await this.database.evaluationRun.findMany({
      where: { attemptId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      items: rows.map((row) =>
        admin
          ? this.result(row, context)
          : this.safe(this.result(row, context), context),
      ),
      ...(admin
        ? {
            audit: rows.map((row) => ({
              id: row.id,
              status: row.status,
              generation: row.generation,
              audit: row.audit,
            })),
          }
        : {}),
    };
  }
  async mastery(learnerId: string) {
    const rows = await this.database.evaluationRun.findMany({
      where: { attempt: { learnerId } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const seen=new Set<string>();
    const results = rows
      .filter(row=>{if(seen.has(row.attemptId))return false;seen.add(row.attemptId);return true;})
      .map((r) => assessmentResultSchema.safeParse(r.result))
      .filter((r): r is { success: true; data: AssessmentResult } => r.success)
      .map((r) => r.data);
    return projectAssessmentMastery(results);
  }
  async requestAssessment(
    learnerId: string,
    attemptId: string,
    key: string,
    previousId?: string,
  ) {
    const { attempt, context } = await this.contextFor(learnerId, attemptId);
    const admitted = await this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${attemptId}))`;
      const existing = await tx.evaluationRun.findUnique({
        where: { attemptId_requestKey: { attemptId, requestKey: key } },
      });
      if (existing) {
        if (
          existing.inputHash !== context.inputHash ||
          existing.contextHash !== context.contextHash ||
          (previousId && existing.previousRunId !== previousId)
        )
          throw new ConflictException('ASSESSMENT_IDEMPOTENCY_CONFLICT');
        if (
          terminal.has(existing.status) ||
          (existing.leaseUntil && existing.leaseUntil.getTime() > Date.now())
        )
          return { row: existing, execute: false };
        const row = await tx.evaluationRun.update({
          where: { id: existing.id },
          data: {
            generation: { increment: 1 },
            status: 'EVALUATING',
            leaseUntil: new Date(Date.now() + (this.options.leaseMs ?? 60000)),
          },
        });
        return { row, execute: true };
      }
      const prior = previousId
        ? await tx.evaluationRun.findFirst({
            where: { id: previousId, attemptId },
          })
        : await tx.evaluationRun.findFirst({
            where: { attemptId, status: { in: [...terminal] } },
            orderBy: { createdAt: 'desc' },
          });
      if (previousId && (!prior || !terminal.has(prior.status)))
        throw new ConflictException('ASSESSMENT_PREVIOUS_RUN_INVALID');
      const row = await tx.evaluationRun.create({
        data: {
          attemptId,
          requestKey: key,
          previousRunId: prior?.id ?? null,
          inputHash: context.inputHash,
          contextHash: context.contextHash,
          status: 'EVALUATING',
          leaseUntil: new Date(Date.now() + (this.options.leaseMs ?? 60000)),
          audit: json({
            policy: ASSESSMENT_POLICY_VERSION,
            prompt: ASSESSMENT_PROMPT_VERSION,
            privateContext: context.privateContext,
          }),
        },
      });
      return { row, execute: true };
    });
    if (!admitted.execute)
      return this.safe(this.result(admitted.row, context), context);
    const controller = new AbortController();
    this.active.set(admitted.row.id, controller);
    const deadline = setTimeout(
      () => controller.abort(),
      this.options.leaseMs ?? 60000,
    );
    try {
      const adapter =
        this.options.enabled &&
        this.options.privacyVerified &&
        this.language.assess
          ? { assess: this.language.assess.bind(this.language) }
          : undefined;
      const output = await runAssessment(
        context,
        adapter as AssessmentEvaluator | undefined,
        adapter as AssessmentEvaluator | undefined,
        controller.signal,
      );
      const { decisions, ...publicOutput } = output;
      // Generate learner prose in a separate stateless call that cannot see private reference data.
      // Failure never changes the scoring decision; the learner projector supplies safe templates.
      if (adapter && output.providers.some((p) => p.role === 'primary')) {
        try {
          const feedback = await adapter.assess(
            { context, role: 'feedback' },
            controller.signal,
          );
          aggregateAssessment(
            context.rubric,
            feedback.verdict,
            feedback.verdict.evidence,
            { submission: context.sources.submission },
          );
          publicOutput.feedback = feedback.verdict.summary;
          publicOutput.corrections = feedback.verdict.corrections;
          publicOutput.criteria = publicOutput.criteria.map((c) => ({
            ...c,
            feedback: feedback.verdict.criteria.find((f) => f.id === c.id)!
              .feedback,
          }));
          publicOutput.providers.push({
            ...feedback.metadata,
            role: 'feedback',
          });
        } catch {
          if (controller.signal.aborted)
            throw new Error('ASSESSMENT_CANCELLED');
        }
      }
      const completedAt = new Date();
      const result = assessmentResultSchema.parse({
        ...this.result(admitted.row, context),
        ...publicOutput,
        ...(this.options.synthetic
          ? {
              providers: publicOutput.providers.map((p) => ({
                ...p,
                synthetic: true,
              })),
            }
          : {}),
        completedAt: completedAt.toISOString(),
      });
      // Fenced CAS prevents a stale/recovered worker from winning after cancellation or lease takeover.
      const saved = await this.database.$transaction(async (tx) => {
        if (attempt.recording) {
          // Recording deletion uses UPDATE on this same row. Hold the row lock through
          // the fenced result write so committed deletion cannot be missed by MVCC.
          await tx.$queryRaw`SELECT "id" FROM "Recording" WHERE "id"=${attempt.recording.id}::uuid FOR UPDATE`;
          const rec = await tx.recording.findUnique({
            where: { id: attempt.recording.id },
          });
          if (
            !rec ||
            rec.deletedAt ||
            rec.deletionRequestedAt ||
            (rec.retentionUntil && rec.retentionUntil.getTime() <= Date.now())
          )
            throw new Error('ASSESSMENT_RECORDING_UNAVAILABLE');
        }
        return tx.evaluationRun.updateMany({
          where: {
            id: admitted.row.id,
            generation: admitted.row.generation,
            status: 'EVALUATING',
          },
          data: {
            status: result.status,
            result: json(result),
            audit: json({ privateContext: context.privateContext, decisions }),
            completedAt,
            leaseUntil: null,
          },
        });
      });
      if (!saved.count) {
        const latest = await this.database.evaluationRun.findUniqueOrThrow({
          where: { id: admitted.row.id },
        });
        return this.safe(this.result(latest, context), context);
      }
      return this.safe(result, context);
    } catch (error) {
      const completedAt = new Date();
      const result = assessmentResultSchema.parse({
        ...this.result(admitted.row, context),
        status: controller.signal.aborted ? 'CANCELLED' : 'FAILED',
        feedback: controller.signal.aborted
          ? 'Assessment was cancelled or timed out.'
          : 'Assessment could not be completed safely. No score was assigned.',
        completedAt: completedAt.toISOString(),
      });
      await this.database.evaluationRun.updateMany({
        where: {
          id: admitted.row.id,
          generation: admitted.row.generation,
          status: 'EVALUATING',
        },
        data: {
          status: result.status,
          result: json(result),
          completedAt,
          leaseUntil: null,
          audit: json({
            errorCode:
              error instanceof Error && /^[A-Z_]+$/u.test(error.message)
                ? error.message
                : 'ASSESSMENT_PROVIDER_FAILURE',
          }),
        },
      });
      const latest = await this.database.evaluationRun.findUniqueOrThrow({
        where: { id: admitted.row.id },
      });
      return this.safe(this.result(latest, context), context);
    } finally {
      clearTimeout(deadline);
      this.active.delete(admitted.row.id);
    }
  }
  async cancel(learnerId: string, runId: string) {
    const row = await this.database.evaluationRun.findFirst({
      where: { id: runId, attempt: { learnerId } },
    });
    if (!row) throw new NotFoundException('Assessment not found');
    const { context } = await this.contextFor(learnerId, row.attemptId, false);
    if (terminal.has(row.status))
      return this.safe(this.result(row, context), context);
    this.active.get(runId)?.abort();
    const completedAt = new Date();
    const result = assessmentResultSchema.parse({
      ...this.result(row, context),
      status: 'CANCELLED',
      feedback: 'Assessment cancelled.',
      completedAt: completedAt.toISOString(),
    });
    await this.database.evaluationRun.updateMany({
      where: {
        id: runId,
        generation: row.generation,
        status: { notIn: [...terminal] },
      },
      data: {
        status: 'CANCELLED',
        generation: { increment: 1 },
        result: json(result),
        completedAt,
        leaseUntil: null,
      },
    });
    return this.safe(
      this.result(
        await this.database.evaluationRun.findUniqueOrThrow({
          where: { id: runId },
        }),
        context,
      ),
      context,
    );
  }
}
