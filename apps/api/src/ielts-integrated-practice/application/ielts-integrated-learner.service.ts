import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ieltsBridgeModuleContentSchema, ieltsIntegratedAvailabilitySchema, ieltsIntegratedProfileContentSchema,
  ieltsIntegratedProgressResultSchema, ieltsIntegratedSessionSchema, startIeltsIntegratedSessionSchema,
  updateIeltsIntegratedProgressSchema, type IeltsIntegratedAvailabilityDto, type IeltsIntegratedProgressResult,
  type IeltsIntegratedSessionDto, type LearnerIeltsBridgeTask, type LearningSkill, learningSkillSchema,
} from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { planIntegratedSession } from '../domain/integrated-session-planner.js';

const includeSession = { profileVersion: true, blocks: { include: { moduleVersion: true }, orderBy: { order: 'asc' as const } } };
type SessionRecord = Prisma.IeltsIntegratedSessionGetPayload<{ include: typeof includeSession }>;

@Injectable()
export class IeltsIntegratedLearnerService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async availability(learnerId: string): Promise<IeltsIntegratedAvailabilityDto> {
    const [bridge, profiles, active] = await Promise.all([
      this.bridgeComplete(learnerId),
      this.database.ieltsIntegratedProfile.findMany({ where: { status: 'PUBLISHED', currentPublishedVersionId: { not: null } }, orderBy: { durationMinutes: 'asc' } }),
      this.database.ieltsIntegratedSession.findFirst({ where: { learnerId, completedAt: null }, orderBy: { startedAt: 'desc' } }),
    ]);
    return ieltsIntegratedAvailabilitySchema.parse({ eligible: bridge && profiles.length === 4, lockedReason: !bridge ? 'BRIDGE_REQUIRED' : profiles.length !== 4 ? 'PROFILES_NOT_PUBLISHED' : null, durations: profiles.map((profile) => profile.durationMinutes), difficulties: ['foundation', 'developing', 'competent', 'advanced'], activeSessionId: active?.id ?? null });
  }

  async start(learnerId: string, input: unknown): Promise<IeltsIntegratedSessionDto> {
    const parsed = startIeltsIntegratedSessionSchema.parse(input);
    return this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-integrated-start:' + learnerId + ':' + parsed.clientSessionId}))`;
      const existing = await tx.ieltsIntegratedSession.findUnique({ where: { learnerId_clientSessionId: { learnerId, clientSessionId: parsed.clientSessionId } }, include: includeSession });
      if (existing) return this.toDto(existing);
      if (!await this.bridgeComplete(learnerId, tx)) throw new ConflictException({ code: 'IELTS_INTEGRATED_LOCKED', reason: 'BRIDGE_REQUIRED' });
      const profile = await tx.ieltsIntegratedProfile.findUnique({ where: { durationMinutes: parsed.durationMinutes }, include: { currentPublishedVersion: true } });
      if (!profile?.currentPublishedVersion || profile.status !== 'PUBLISHED') throw new ConflictException({ code: 'IELTS_INTEGRATED_PROFILE_UNAVAILABLE' });
      const modules = await tx.ieltsBridgeModule.findMany({ where: { status: 'PUBLISHED', currentPublishedVersionId: { not: null } }, include: { currentPublishedVersion: true } });
      const candidates = modules.flatMap((module) => module.currentPublishedVersion ? [{ id: module.currentPublishedVersion.id, skill: ieltsBridgeModuleContentSchema.parse(module.currentPublishedVersion.content).skill, questionType: ieltsBridgeModuleContentSchema.parse(module.currentPublishedVersion.content).questionType }] : []);
      const recentBlocks = await tx.ieltsIntegratedSessionBlock.findMany({
        where: { session: { learnerId }, completedAt: { not: null } },
        select: { skill: true, questionType: true, result: true }, orderBy: { completedAt: 'desc' }, take: 12,
      });
      const dueReviewSkills = new Set<LearningSkill>(recentBlocks.filter((block) => {
        const result = block.result as { correct?: boolean } | null;
        return result?.correct === false;
      }).map((block) => learningSkillSchema.parse(block.skill)));
      const plan = planIntegratedSession({
        profileVersionId: profile.currentPublishedVersion.id,
        profile: ieltsIntegratedProfileContentSchema.parse(profile.currentPublishedVersion.content),
        difficulty: parsed.difficulty, versions: candidates, dueReviewSkills,
        recentQuestionTypes: new Set(recentBlocks.map((block) => block.questionType)),
      });
      const startedAt = new Date();
      const created = await tx.ieltsIntegratedSession.create({ data: { learnerId, clientSessionId: parsed.clientSessionId, profileVersionId: profile.currentPublishedVersion.id, durationMinutes: parsed.durationMinutes, difficulty: parsed.difficulty, planSnapshot: plan as unknown as Prisma.InputJsonValue, startedAt, blocks: { create: plan.blocks.map((block) => ({ moduleVersionId: block.moduleVersionId, order: block.order, skill: block.skill, targetMinutes: block.targetMinutes, questionType: block.questionType, mode: block.mode, startedAt: block.order === 1 ? startedAt : null })) } }, include: includeSession });
      return this.toDto(created);
    });
  }
  async get(learnerId: string, sessionId: string) {
    const session = await this.database.ieltsIntegratedSession.findFirst({ where: { id: sessionId, learnerId }, include: includeSession });
    if (!session) throw new NotFoundException('IELTS integrated session was not found.');
    return this.toDto(session);
  }
  async update(learnerId: string, sessionId: string, input: unknown): Promise<IeltsIntegratedProgressResult> {
    const parsed = updateIeltsIntegratedProgressSchema.parse(input);
    return this.database.$transaction(async (tx) => {
      const session = await tx.ieltsIntegratedSession.findFirst({ where: { id: sessionId, learnerId }, include: includeSession });
      if (!session) throw new NotFoundException('IELTS integrated session was not found.');
      if (session.completedAt || session.revision !== parsed.expectedRevision) throw new ConflictException({ code: 'IELTS_INTEGRATED_REVISION_STALE' });
      if (session.currentBlockIndex !== parsed.blockIndex) throw new UnprocessableEntityException({ code: 'IELTS_INTEGRATED_BLOCK_LOCKED' });
      const block = session.blocks[parsed.blockIndex]!; const stage = this.practiceStage(block.moduleVersion.content);
      const correct = this.evaluate(stage.task, parsed.answer); const now = new Date(); const last = parsed.blockIndex === 3;
      await tx.ieltsIntegratedSessionBlock.update({ where: { id: block.id }, data: { result: { correct, timedOut: false } as Prisma.InputJsonValue, completedAt: now } });
      if (!last) await tx.ieltsIntegratedSessionBlock.update({ where: { id: session.blocks[parsed.blockIndex + 1]!.id }, data: { startedAt: now } });
      const updatedCount = await tx.ieltsIntegratedSession.updateMany({ where: { id: session.id, revision: parsed.expectedRevision }, data: { currentBlockIndex: last ? 3 : parsed.blockIndex + 1, completedAt: last ? now : null, revision: { increment: 1 } } });
      if (updatedCount.count !== 1) throw new ConflictException({ code: 'IELTS_INTEGRATED_REVISION_STALE' });
      const updated = await tx.ieltsIntegratedSession.findUniqueOrThrow({ where: { id: session.id }, include: includeSession });
      return ieltsIntegratedProgressResultSchema.parse({ session: this.toDto(updated), feedbackMessage: stage.feedback ? (correct === false ? stage.feedback.incorrect : stage.feedback.correct) : null, nextStep: last ? 'Review your four-skill evidence and continue targeted practice.' : null });
    });
  }
  private async bridgeComplete(learnerId: string, db: PrismaService | Prisma.TransactionClient = this.database) { return (await db.ieltsBridgeProgress.count({ where: { learnerId, completedAt: { not: null }, moduleVersion: { required: true } } })) >= 4; }
  private practiceStage(content: Prisma.JsonValue) { const parsed = ieltsBridgeModuleContentSchema.parse(content); return parsed.stages.find((stage) => stage.type === 'timed_practice')!; }
  private safeTask(task: ReturnType<typeof this.practiceStage>['task']): LearnerIeltsBridgeTask { if (task.kind === 'single_choice' || task.kind === 'multi_choice') return { kind: task.kind, prompt: task.prompt, options: task.options }; if (task.kind === 'short_text') return { kind: task.kind, prompt: task.prompt, minWords: task.minWords }; if (task.kind === 'spoken_response') return { kind: task.kind, prompt: task.prompt, preparationSeconds: task.preparationSeconds, responseSeconds: task.responseSeconds }; return task; }
  private evaluate(task: ReturnType<typeof this.practiceStage>['task'], answer: unknown): boolean | null { if (task.kind === 'instruction') return null; if (answer === undefined) throw new UnprocessableEntityException({ code: 'IELTS_INTEGRATED_ANSWER_REQUIRED' }); if (task.kind === 'single_choice') return answer === task.answerIndex; if (task.kind === 'multi_choice') return Array.isArray(answer) && [...answer].sort().join(',') === [...task.answerIndexes].sort().join(','); if (typeof answer !== 'string' || !answer.trim()) throw new UnprocessableEntityException({ code: 'IELTS_INTEGRATED_ANSWER_INVALID' }); return null; }
  private toDto(session: SessionRecord): IeltsIntegratedSessionDto { const plan = session.planSnapshot; return ieltsIntegratedSessionSchema.parse({ id: session.id, plan, currentBlockIndex: session.currentBlockIndex, revision: session.revision, startedAt: session.startedAt.toISOString(), completedAt: session.completedAt?.toISOString() ?? null, blocks: session.blocks.map((block) => { const stage = this.practiceStage(block.moduleVersion.content); const result = block.result as { correct?: boolean; timedOut?: boolean } | null; return { order: block.order, skill: block.skill, targetMinutes: block.targetMinutes, moduleVersionId: block.moduleVersionId, questionType: block.questionType, mode: block.mode, title: stage.title, instruction: stage.instruction, task: this.safeTask(stage.task), startedAt: block.startedAt?.toISOString() ?? null, completedAt: block.completedAt?.toISOString() ?? null, correct: result?.correct ?? null, timedOut: result?.timedOut ?? null }; }) }); }
}
