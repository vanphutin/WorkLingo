import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ieltsBridgeCatalogSchema,
  ieltsBridgeModuleContentSchema,
  ieltsBridgeProgressResultSchema,
  ieltsBridgeProgressSchema,
  ieltsBridgeProgressUpdateSchema,
  ieltsBridgeSessionSchema,
  learnerIeltsBridgeModuleSchema,
  type IeltsBridgeCatalogDto,
  type IeltsBridgeProgressDto,
  type IeltsBridgeProgressResult,
  type IeltsBridgeSessionDto,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { hasIeltsEarlyAccess } from '../../ielts-access/ielts-early-access.js';

type VersionRecord = {
  id: string; moduleId: string; version: number; title: string; content: Prisma.JsonValue; status: string;
};
type ProgressRecord = {
  id: string; learnerId: string; moduleId: string; moduleVersionId: string; currentStageIndex: number; revision: number;
  stageResults: Prisma.JsonValue; timedStageStartedAt: Date | null; timedStageDeadlineAt: Date | null;
  completedAt: Date | null; createdAt: Date; updatedAt: Date; moduleVersion: VersionRecord;
};
type InternalStageResult = {
  stageSlug: string; correct: boolean | null; timedOut: boolean; submittedAt: string; answer?: Prisma.JsonValue;
};

@Injectable()
export class IeltsBridgeLearnerService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async catalog(learnerId: string): Promise<IeltsBridgeCatalogDto> {
    const progress = await this.database.ieltsBridgeProgress.findMany({
      where: { learnerId }, include: { moduleVersion: true }, orderBy: { createdAt: 'asc' },
    });
    const canEnter = await this.hasCompletedOrientation(learnerId) || await hasIeltsEarlyAccess(this.database, learnerId);
    if (!canEnter && progress.length === 0) {
      return ieltsBridgeCatalogSchema.parse({
        eligible: false, lockedReason: 'ORIENTATION_REQUIRED', bridgeCompleted: false, modules: [],
      });
    }

    const currentModules = canEnter ? await this.database.ieltsBridgeModule.findMany({
      where: { status: 'PUBLISHED', currentPublishedVersionId: { not: null } },
      include: { currentPublishedVersion: true }, orderBy: { slug: 'asc' },
    }) : [];
    const progressByModule = new Map(progress.map((item) => [item.moduleId, item]));
    const versions = new Map<string, { moduleId: string; version: VersionRecord; progress: ProgressRecord | null }>();
    for (const module of currentModules) {
      if (module.currentPublishedVersion) versions.set(module.id, {
        moduleId: module.id, version: module.currentPublishedVersion, progress: progressByModule.get(module.id) ?? null,
      });
    }
    for (const item of progress) versions.set(item.moduleId, { moduleId: item.moduleId, version: item.moduleVersion, progress: item });
    const modules = [...versions.values()].map(({ moduleId, version, progress: item }) => {
      const content = ieltsBridgeModuleContentSchema.parse(version.content);
      return {
        moduleId, moduleVersionId: version.id, title: content.title, description: content.description,
        skill: content.skill, questionType: content.questionType, required: content.required,
        progress: item ? this.toProgress(item) : null,
      };
    });
    const required = modules.filter((module) => module.required);
    return ieltsBridgeCatalogSchema.parse({
      eligible: canEnter, lockedReason: canEnter ? null : 'ORIENTATION_REQUIRED',
      bridgeCompleted: required.length >= 4 && required.every((module) => module.progress?.completedAt != null), modules,
    });
  }

  async start(learnerId: string, moduleId: string): Promise<IeltsBridgeSessionDto> {
    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-bridge-start:' + learnerId + ':' + moduleId}))`;
      const existing = await transaction.ieltsBridgeProgress.findUnique({
        where: { learnerId_moduleId: { learnerId, moduleId } }, include: { moduleVersion: true },
      });
      if (existing) return this.toSession(existing);
      if (!await this.hasCompletedOrientation(learnerId, transaction) && !await hasIeltsEarlyAccess(transaction, learnerId)) {
        throw new ConflictException({ code: 'IELTS_BRIDGE_LOCKED', reason: 'ORIENTATION_REQUIRED' });
      }
      const module = await transaction.ieltsBridgeModule.findUnique({
        where: { id: moduleId }, include: { currentPublishedVersion: true },
      });
      if (!module?.currentPublishedVersion || module.status !== 'PUBLISHED') {
        throw new NotFoundException('Published IELTS Bridge module was not found.');
      }
      const created = await transaction.ieltsBridgeProgress.create({ data: {
        learnerId, moduleId, moduleVersionId: module.currentPublishedVersion.id,
      }, include: { moduleVersion: true } });
      return this.toSession(created);
    });
  }

  async getSession(learnerId: string, moduleId: string): Promise<IeltsBridgeSessionDto> {
    const progress = await this.database.ieltsBridgeProgress.findUnique({
      where: { learnerId_moduleId: { learnerId, moduleId } }, include: { moduleVersion: true },
    });
    if (!progress) throw new NotFoundException('IELTS Bridge progress was not found.');
    return this.toSession(progress);
  }

  async updateProgress(learnerId: string, moduleId: string, input: unknown): Promise<IeltsBridgeProgressResult> {
    const parsed = ieltsBridgeProgressUpdateSchema.parse(input);
    return this.database.$transaction(async (transaction) => {
      const initial = await transaction.ieltsBridgeProgress.findUnique({
        where: { learnerId_moduleId: { learnerId, moduleId } }, include: { moduleVersion: true },
      });
      if (!initial) throw new NotFoundException('IELTS Bridge progress was not found.');
      await transaction.$queryRaw`SELECT "id" FROM "IeltsBridgeProgress" WHERE "id" = ${initial.id}::uuid FOR UPDATE`;
      const progress = await transaction.ieltsBridgeProgress.findUnique({
        where: { learnerId_moduleId: { learnerId, moduleId } }, include: { moduleVersion: true },
      });
      if (!progress) throw new NotFoundException('IELTS Bridge progress was not found.');
      if (progress.completedAt) throw new ConflictException({ code: 'IELTS_BRIDGE_ALREADY_COMPLETED' });
      if (progress.revision !== parsed.expectedRevision) throw new ConflictException({ code: 'IELTS_BRIDGE_REVISION_STALE' });
      if (progress.currentStageIndex !== parsed.stageIndex) {
        throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_STAGE_LOCKED' });
      }

      const content = ieltsBridgeModuleContentSchema.parse(progress.moduleVersion.content);
      const stage = content.stages[parsed.stageIndex];
      if (!stage) throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_STAGE_INVALID' });
      const now = new Date();
      if (parsed.startTimer) {
        if (stage.type !== 'timed_practice' || stage.timeLimitSeconds === null || parsed.completeStage) {
          throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_TIMER_INVALID' });
        }
        if (progress.timedStageStartedAt) throw new ConflictException({ code: 'IELTS_BRIDGE_TIMER_ALREADY_STARTED' });
        const deadline = new Date(now.getTime() + stage.timeLimitSeconds * 1000);
        const updated = await transaction.ieltsBridgeProgress.updateMany({
          where: { id: progress.id, revision: parsed.expectedRevision },
          data: { timedStageStartedAt: now, timedStageDeadlineAt: deadline, revision: { increment: 1 } },
        });
        if (updated.count !== 1) throw new ConflictException({ code: 'IELTS_BRIDGE_REVISION_STALE' });
        return ieltsBridgeProgressResultSchema.parse({
          progress: this.toProgress({ ...progress, revision: progress.revision + 1, timedStageStartedAt: now, timedStageDeadlineAt: deadline }),
          feedbackMessage: null,
        });
      }
      if (!parsed.completeStage) throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_STAGE_ACTION_REQUIRED' });
      if (stage.type === 'timed_practice' && !progress.timedStageStartedAt) {
        throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_TIMER_REQUIRED' });
      }

      const results = this.parseStageResults(progress.stageResults);
      if (results.some((item) => item.stageSlug === stage.slug)) {
        throw new ConflictException({ code: 'IELTS_BRIDGE_STAGE_ALREADY_SUBMITTED' });
      }
      const correct = this.evaluate(stage.task, parsed.answer);
      const timedOut = stage.type === 'timed_practice' && !!progress.timedStageDeadlineAt && now > progress.timedStageDeadlineAt;
      const result: InternalStageResult = {
        stageSlug: stage.slug, correct, timedOut, submittedAt: now.toISOString(),
        ...(stage.task.kind === 'instruction' ? {} : { answer: parsed.answer as Prisma.JsonValue }),
      };
      const stageResults = [...results, result];
      const lastStage = parsed.stageIndex === content.stages.length - 1;
      const completedAt = lastStage ? now : null;
      const currentStageIndex = lastStage ? parsed.stageIndex : parsed.stageIndex + 1;
      const updated = await transaction.ieltsBridgeProgress.updateMany({
        where: { id: progress.id, revision: parsed.expectedRevision },
        data: { currentStageIndex, stageResults: stageResults as Prisma.InputJsonValue, completedAt, revision: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException({ code: 'IELTS_BRIDGE_REVISION_STALE' });
      const feedbackMessage = stage.feedback
        ? (correct === false ? stage.feedback.incorrect : stage.feedback.correct)
        : null;
      return ieltsBridgeProgressResultSchema.parse({
        progress: this.toProgress({ ...progress, currentStageIndex, stageResults, completedAt, revision: progress.revision + 1 }),
        feedbackMessage,
      });
    });
  }

  private async hasCompletedOrientation(
    learnerId: string,
    database: PrismaService | Prisma.TransactionClient = this.database,
  ): Promise<boolean> {
    return !!await database.orientationProgress.findFirst({ where: { learnerId, completedAt: { not: null } } });
  }

  private toSession(progress: ProgressRecord): IeltsBridgeSessionDto {
    return ieltsBridgeSessionSchema.parse({ module: this.toLearnerModule(progress.moduleVersion), progress: this.toProgress(progress) });
  }

  private toLearnerModule(version: VersionRecord) {
    const content = ieltsBridgeModuleContentSchema.parse(version.content);
    return learnerIeltsBridgeModuleSchema.parse({
      id: version.id, moduleId: version.moduleId, version: version.version,
      title: content.title, description: content.description, skill: content.skill, questionType: content.questionType,
      stages: content.stages.map((stage) => ({
        slug: stage.slug, type: stage.type, title: stage.title, instruction: stage.instruction,
        strategySteps: stage.strategySteps, timeLimitSeconds: stage.timeLimitSeconds, feedback: null,
        task: this.toLearnerTask(stage.task),
      })),
    });
  }

  private toLearnerTask(task: ReturnType<typeof ieltsBridgeModuleContentSchema.parse>['stages'][number]['task']) {
    if (task.kind === 'single_choice') return { kind: task.kind, prompt: task.prompt, options: task.options };
    if (task.kind === 'multi_choice') return { kind: task.kind, prompt: task.prompt, options: task.options };
    if (task.kind === 'short_text') return { kind: task.kind, prompt: task.prompt, minWords: task.minWords };
    if (task.kind === 'spoken_response') return {
      kind: task.kind, prompt: task.prompt, preparationSeconds: task.preparationSeconds, responseSeconds: task.responseSeconds,
    };
    return task;
  }

  private toProgress(progress: Omit<ProgressRecord, 'moduleVersion'> & { moduleVersion?: VersionRecord }): IeltsBridgeProgressDto {
    return ieltsBridgeProgressSchema.parse({
      moduleId: progress.moduleId, moduleVersionId: progress.moduleVersionId,
      currentStageIndex: progress.currentStageIndex, revision: progress.revision,
      startedAt: progress.createdAt.toISOString(), completedAt: progress.completedAt?.toISOString() ?? null,
      timedStageStartedAt: progress.timedStageStartedAt?.toISOString() ?? null,
      timedStageDeadlineAt: progress.timedStageDeadlineAt?.toISOString() ?? null,
      stageResults: this.parseStageResults(progress.stageResults).map(({ answer: _answer, ...result }) => result),
    });
  }

  private parseStageResults(value: Prisma.JsonValue | InternalStageResult[]): InternalStageResult[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid IELTS Bridge stage result.');
      const record = item as Record<string, unknown>;
      return {
        stageSlug: String(record.stageSlug), correct: typeof record.correct === 'boolean' ? record.correct : null,
        timedOut: record.timedOut === true, submittedAt: String(record.submittedAt),
        ...('answer' in record ? { answer: record.answer as Prisma.JsonValue } : {}),
      };
    });
  }

  private evaluate(task: ReturnType<typeof ieltsBridgeModuleContentSchema.parse>['stages'][number]['task'], answer: unknown): boolean | null {
    if (task.kind === 'instruction') {
      if (answer !== undefined) throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_ANSWER_UNEXPECTED' });
      return null;
    }
    if (answer === undefined) throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_ANSWER_REQUIRED' });
    if (task.kind === 'single_choice') {
      if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) >= task.options.length) {
        throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_ANSWER_INVALID' });
      }
      return answer === task.answerIndex;
    }
    if (task.kind === 'multi_choice') {
      if (!Array.isArray(answer) || answer.some((item) => !Number.isInteger(item))) {
        throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_ANSWER_INVALID' });
      }
      return [...answer].sort().join(',') === [...task.answerIndexes].sort().join(',');
    }
    if (typeof answer !== 'string' || answer.trim().length === 0) {
      throw new UnprocessableEntityException({ code: 'IELTS_BRIDGE_ANSWER_INVALID' });
    }
    return null;
  }
}
