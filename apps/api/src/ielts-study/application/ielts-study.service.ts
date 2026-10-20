import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { parseIeltsTopicManifest } from '@worklingo/content-format';
import { ieltsTopicCatalogSchema, startIeltsTopicSessionSchema, type IeltsTopicCatalogDto } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import { canEnterIeltsV3 } from '../../ielts-flow/domain/ielts-flow-policy.js';
import { SessionCreationService, learningSessionInclude, toLearningSessionDto } from '../../learning-sessions/application/session-creation.service.js';
import type { LearningSessionDto } from '../../learning-sessions/application/learning-session.types.js';
import { MasteryService } from '../../mastery/application/mastery.service.js';
import { IeltsTopicAdminService } from './ielts-topic-admin.service.js';

@Injectable()
export class IeltsStudyService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(CurriculumService) private readonly curriculum: CurriculumService,
    @Inject(SessionCreationService) private readonly sessions: SessionCreationService,
    @Inject(MasteryService) private readonly mastery: MasteryService,
    @Inject(IeltsTopicAdminService) private readonly authoring: IeltsTopicAdminService,
  ) {}

  async catalog(learnerId: string): Promise<IeltsTopicCatalogDto> {
    return this.db.$transaction(async tx => {
      await this.admit(tx, learnerId);
      const topics = await tx.ieltsTopic.findMany({ where: { status: 'PUBLISHED', currentPublishedVersion: { status: 'PUBLISHED' } }, include: { currentPublishedVersion: true }, orderBy: { slug: 'asc' } });
      const result: IeltsTopicCatalogDto['topics'] = [];
      for (const topic of topics) {
        if (!topic.currentPublishedVersion) continue;
        const content = parseIeltsTopicManifest(topic.currentPublishedVersion.content);
        const packs: IeltsTopicCatalogDto['topics'][number]['packs'] = [];
        for (const pack of content.packs) {
          try {
            const qualified = await this.authoring.qualify(tx, { ...content, packs: [pack] });
            if (!qualified.canPublish) continue;
            const mission = await this.curriculum.getPublishedMissionForRevision(pack.curriculumRevisionId, tx);
            packs.push({ slug: pack.slug, difficulty: pack.difficulty, supportedDurations: qualified.supportedDurations, chunkCount: pack.focusChunkSlugs.length, sampleChunks: mission.lessonVersion.wordBanks.flatMap(bank => bank.languageBlocks).filter(chunk => pack.focusChunkSlugs.includes(chunk.slug)).slice(0, 3).map(chunk => ({ expression: chunk.canonicalForm, meaning: chunk.meaning, pronunciation: chunk.pronunciation, example: chunk.examples[0]! })), contexts: pack.contexts });
          } catch { /* Archived or unavailable packs never advertise a start. */ }
        }
        if (!packs.length) continue;
        const active = await tx.ieltsTopicSession.findFirst({ where: { topicVersion: { topicId: topic.id }, session: { learnerId, status: { in: ['PLANNED', 'IN_PROGRESS', 'PAUSED'] } } }, orderBy: { createdAt: 'desc' }, select: { sessionId: true } });
        result.push({ id: topic.id, topicVersionId: topic.currentPublishedVersion.id, title: content.title, description: content.description, packs, activeSessionId: active?.sessionId ?? null });
      }
      const completed = await tx.ieltsTopicSession.findMany({ where: { session: { learnerId, status: 'COMPLETED' } }, select: { topicVersion: { select: { topicId: true } } } });
      const next = result.find(topic => !completed.some(item => item.topicVersion.topicId === topic.id));
      return ieltsTopicCatalogSchema.parse({ topics: result, recommendations: next ? [{ topicVersionId: next.topicVersionId, reason: completed.length ? 'UNPRACTICED_TOPIC' : 'CHOOSE_YOUR_FIRST_TOPIC' }] : [] });
    }, { isolationLevel: 'RepeatableRead', timeout: 20_000 });
  }

  async start(learnerId: string, input: unknown): Promise<LearningSessionDto> {
    const parsed = startIeltsTopicSessionSchema.parse(input);
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'learning-session:' + learnerId + ':' + parsed.clientSessionId}))`;
      await tx.$queryRaw`SELECT "userId" FROM "LearnerProfile" WHERE "userId" = ${learnerId}::uuid FOR UPDATE`;
      const existing = await tx.learningSession.findUnique({ where: { learnerId_clientSessionId: { learnerId, clientSessionId: parsed.clientSessionId } }, include: learningSessionInclude });
      if (existing) {
        if (existing.ieltsTopicSession?.topicVersionId !== parsed.topicVersionId || existing.ieltsTopicSession.packSlug !== parsed.packSlug || existing.durationMinutes !== parsed.durationMinutes) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT' });
        return toLearningSessionDto(existing);
      }
      const program = await this.admit(tx, learnerId);
      const version = await tx.ieltsTopicVersion.findUnique({ where: { id: parsed.topicVersionId }, include: { topic: true } });
      if (!version || version.status !== 'PUBLISHED' || version.topic.status !== 'PUBLISHED' || version.topic.currentPublishedVersionId !== version.id) throw new ConflictException({ code: 'IELTS_TOPIC_NOT_PUBLISHED' });
      const content = parseIeltsTopicManifest(version.content);
      const pack = content.packs.find(pack => pack.slug === parsed.packSlug);
      if (!pack) throw new ConflictException({ code: 'IELTS_TOPIC_PACK_UNAVAILABLE' });
      const qualification = await this.authoring.qualify(tx, { ...content, packs: [pack] });
      if (!qualification.canPublish || !qualification.supportedDurations.includes(parsed.durationMinutes)) throw new ConflictException({ code: 'IELTS_TOPIC_DURATION_UNAVAILABLE' });
      const mission = await this.curriculum.getPublishedMissionForRevision(pack.curriculumRevisionId, tx);
      const storedMission = await tx.mission.findUniqueOrThrow({ where: { id: mission.id } });
      await tx.learnerProgramEnrollment.upsert({ where: { learnerId_programId: { learnerId, programId: program.id } }, create: { learnerId, programId: program.id, currentLevelId: storedMission.levelId }, update: {} });
      const review = await this.mastery.getReviewQueue(learnerId, { programId: program.id, languageBlockIds: mission.lessonVersion.wordBanks.flatMap(bank => bank.languageBlocks.map(chunk => chunk.id)) });
      const session = await this.sessions.create(tx, { clientSessionId: parsed.clientSessionId, curriculumRevisionId: pack.curriculumRevisionId, durationMinutes: parsed.durationMinutes, learnerId, mission, reviewItems: review, productivePairPerRespondBlock: true });
      await tx.ieltsTopicSession.create({ data: { sessionId: session.id, topicVersionId: version.id, packSlug: pack.slug } });
      return session;
    }, { timeout: 20_000 });
  }

  private async admit(tx: Prisma.TransactionClient, learnerId: string) {
    const [user, program] = await Promise.all([tx.user.findUnique({ where: { id: learnerId }, include: { profile: true } }), tx.learningProgram.findUnique({ where: { slug: 'ielts' } })]);
    if (!program || this.config.get('ieltsFlow') !== 'v3' || !canEnterIeltsV3({ role: user?.role ?? '', status: user?.status ?? '', onboardingStatus: user?.profile?.onboardingStatus ?? '', programStatus: program.availabilityStatus })) throw new ConflictException({ code: 'IELTS_V3_NOT_AVAILABLE' });
    return program;
  }
}
