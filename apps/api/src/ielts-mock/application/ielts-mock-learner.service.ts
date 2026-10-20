import { ConflictException, Inject, Injectable, Optional, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import {
  ieltsMockCatalogSchema, ieltsMockContentSchema, ieltsMockReportSchema,
  saveIeltsMockResponsesSchema, startIeltsMockAttemptSchema, submitIeltsMockSectionSchema,
  type IeltsMockAttemptDto, type IeltsMockReportDto,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { canEnterIeltsV3 } from '../../ielts-flow/domain/ielts-flow-policy.js';
import { MockPlaybackService } from './mock-playback.service.js';
import { MockAttemptClock } from './mock-attempt-clock.js';
import { advanceMockSection, expireMockSections, lockMockAttempt, toMockAttemptDto } from './mock-attempt-state.js';
import { hasIeltsEarlyAccess } from '../../ielts-access/ielts-early-access.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { scoreObjectiveAnswer } from '../domain/ielts-mock-scoring.js';

const attemptInclude = { mockTestVersion: true } as const;
type AttemptRecord = Prisma.IeltsMockAttemptGetPayload<{ include: typeof attemptInclude }>;
type Section = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
const sequence: readonly Section[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
const durations: Record<Section, number> = { LISTENING: 30, READING: 60, WRITING: 60, SPEAKING: 14 };

@Injectable()
export class IeltsMockLearnerService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService, @Inject(ObjectStorage) private readonly storage: ObjectStorage, @Optional() @Inject(ConfigService) private readonly config?: ConfigService, @Optional() @Inject(MockAttemptClock) private readonly clock?: MockAttemptClock, @Optional() @Inject(MockPlaybackService) private readonly playback?: MockPlaybackService) {}

  async catalog(learnerId: string) {
    const v3 = this.config?.get('ieltsFlow') === 'v3';
    if (v3) await this.admitV3(this.database, learnerId);
    const journey = await this.database.ieltsBandJourney.findUnique({ where: { learnerId } });
    if (!v3 && !journey && !await hasIeltsEarlyAccess(this.database, learnerId)) return ieltsMockCatalogSchema.parse({ eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED', mocks: [] });
    const [mocks, attempts] = await Promise.all([
      this.database.ieltsMockTest.findMany({ where: { status: 'PUBLISHED', currentPublishedVersionId: { not: null } }, include: { currentPublishedVersion: true }, orderBy: { updatedAt: 'desc' } }),
      this.database.ieltsMockAttempt.findMany({ where: { learnerId, status: 'IN_PROGRESS' }, select: { id: true, mockTestVersion: { select: { mockTestId: true } } } }),
    ]);
    if (!mocks.length) return ieltsMockCatalogSchema.parse({ ...(v3 ? { flowVersion: 'v3' } : {}), eligible: false, lockedReason: 'MOCK_NOT_PUBLISHED', mocks: [] });
    return ieltsMockCatalogSchema.parse({ ...(v3 ? { flowVersion: 'v3' } : {}), eligible: true, lockedReason: null, mocks: mocks.flatMap((mock) => {
      if (!mock.currentPublishedVersion) return [];
      const content = ieltsMockContentSchema.parse(mock.currentPublishedVersion.content);
      if (!v3 && content.schemaVersion === 2) return [];
      return [{ id: mock.id, title: content.title, variant: content.variant, version: mock.currentPublishedVersion.version, allowedModes: v3 ? content.allowedModes.filter(mode => mode === 'PRACTICE' || (mode === 'EXAM_SIMULATION' && content.schemaVersion === 2 && content.qualification.qualifiedModes.includes('EXAM_SIMULATION'))) : content.allowedModes, activeAttemptId: attempts.find((item) => item.mockTestVersion.mockTestId === mock.id)?.id ?? null }];
    }) });
  }

  async start(learnerId: string, input: unknown): Promise<IeltsMockAttemptDto> {
    const parsed = startIeltsMockAttemptSchema.parse(input);
    return this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-mock-start:' + learnerId + ':' + parsed.clientAttemptId}))`;
      const existing = await tx.ieltsMockAttempt.findUnique({ where: { learnerId_clientAttemptId: { learnerId, clientAttemptId: parsed.clientAttemptId } }, include: attemptInclude });
      if (existing) {
        if (existing.mockTestVersion.mockTestId !== parsed.mockTestId || existing.mode !== parsed.mode) throw new ConflictException({ code: 'IELTS_MOCK_CLIENT_ATTEMPT_REUSED' });
        return this.toDto(existing);
      }
      const v3 = this.config?.get('ieltsFlow') === 'v3';
      if (v3) await this.admitV3(tx, learnerId);
      if (!v3 && !await tx.ieltsBandJourney.findUnique({ where: { learnerId } }) && !await hasIeltsEarlyAccess(tx, learnerId)) throw new ConflictException({ code: 'IELTS_BAND_PATHWAY_REQUIRED' });
      const mock = await tx.ieltsMockTest.findUnique({ where: { id: parsed.mockTestId }, include: { currentPublishedVersion: true } });
      if (!mock?.currentPublishedVersion || mock.status !== 'PUBLISHED') throw new ConflictException({ code: 'IELTS_MOCK_NOT_PUBLISHED' });
      const content = ieltsMockContentSchema.parse(mock.currentPublishedVersion.content);
      if (!v3 && content.schemaVersion === 2) throw new ConflictException({code:'IELTS_V3_NOT_AVAILABLE'});
      if (!content.allowedModes.some(mode => mode === parsed.mode)) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_MODE_NOT_ALLOWED' });
      if (v3 && (parsed.mode === 'LEARNING' || (parsed.mode === 'EXAM_SIMULATION' && (content.schemaVersion !== 2 || !content.qualification.qualifiedModes.includes('EXAM_SIMULATION'))))) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_MODE_NOT_QUALIFIED' });
      const now = this.clock?.now() ?? new Date();
      const created = await tx.ieltsMockAttempt.create({ data: { ...(v3 ? { policyVersion: 'v2', clockUpdatedAt: now, startedAt: now } : {}), learnerId, clientAttemptId: parsed.clientAttemptId, mockTestVersionId: mock.currentPublishedVersion.id, mode: parsed.mode, sectionStartedAt: now, sectionDeadlineAt: this.deadline(now, 'LISTENING') }, include: attemptInclude });
      return this.toDto(created);
    });
  }

  async get(learnerId: string, attemptId: string): Promise<IeltsMockAttemptDto> {
    const attempt = await this.database.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: attemptInclude });
    if (!attempt) throw new NotFoundException('IELTS mock attempt was not found.');
    if (attempt.policyVersion === 'v2' && this.clock) return this.clock.expireIfDue(learnerId, attemptId);
    if (attempt.status === 'IN_PROGRESS' && Date.now() > attempt.sectionDeadlineAt.getTime()) return this.submitSection(learnerId, attemptId, { expectedRevision: attempt.revision, section: attempt.currentSection });
    return this.toDto(attempt);
  }

  async saveResponses(learnerId: string, attemptId: string, input: unknown): Promise<IeltsMockAttemptDto> {
    const parsed = saveIeltsMockResponsesSchema.parse(input);
    const result = await this.database.$transaction(async (tx) => {
      const attempt = await tx.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: attemptInclude });
      if (!attempt) throw new NotFoundException('IELTS mock attempt was not found.');
      if (attempt.policyVersion === 'v2') {
        const locked = await lockMockAttempt(tx, learnerId, attemptId);
        const now = this.clock?.now() ?? new Date();
        const current = await expireMockSections(tx, locked, now);
        if (current.revision !== locked.revision) return { expired: true as const };
        this.requireWritable(current, parsed.expectedRevision);
        if (current.pausedAt) throw new ConflictException({ code: 'IELTS_MOCK_PAUSED' });
        const content = ieltsMockContentSchema.parse(current.mockTestVersion.content);
        const allowed = new Set(this.responseIds(content, current.currentSection as Section));
        if (Object.keys(parsed.responses).some(id => !allowed.has(id))) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_RESPONSE_NOT_IN_CURRENT_SECTION' });
        const updated = await tx.ieltsMockAttempt.update({ where: { id: current.id }, data: { responses: { ...this.jsonRecord(current.responses), ...parsed.responses }, revision: { increment: 1 } }, include: attemptInclude });
        return this.toDto(updated);
      }
      this.requireWritable(attempt, parsed.expectedRevision);
      if (Date.now() > attempt.sectionDeadlineAt.getTime()) throw new ConflictException({ code: 'IELTS_MOCK_SECTION_EXPIRED' });
      const content = ieltsMockContentSchema.parse(attempt.mockTestVersion.content);
      const allowed = new Set(this.responseIds(content, attempt.currentSection as Section));
      if (Object.keys(parsed.responses).some((id) => !allowed.has(id))) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_RESPONSE_NOT_IN_CURRENT_SECTION' });
      const responses = { ...this.jsonRecord(attempt.responses), ...parsed.responses };
      const updated = await tx.ieltsMockAttempt.updateMany({ where: { id: attempt.id, revision: parsed.expectedRevision }, data: { responses, revision: { increment: 1 } } });
      if (updated.count !== 1) this.stale();
      return this.toDto(await tx.ieltsMockAttempt.findUniqueOrThrow({ where: { id: attempt.id }, include: attemptInclude }));
    });
    if ('expired' in result) throw new ConflictException({ code: 'IELTS_MOCK_SECTION_EXPIRED' });
    return result;
  }

  async submitSection(learnerId: string, attemptId: string, input: unknown): Promise<IeltsMockAttemptDto> {
    const parsed = submitIeltsMockSectionSchema.parse(input);
    return this.database.$transaction(async (tx) => {
      const attempt = await tx.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: attemptInclude });
      if (!attempt) throw new NotFoundException('IELTS mock attempt was not found.');
      if (attempt.policyVersion === 'v2') {
        const locked = await lockMockAttempt(tx, learnerId, attemptId);
        const now = this.clock?.now() ?? new Date();
        const current = await expireMockSections(tx, locked, now);
        if (current.revision !== locked.revision) return this.toDto(current);
        this.requireWritable(current, parsed.expectedRevision);
        if (current.pausedAt) throw new ConflictException({ code: 'IELTS_MOCK_PAUSED' });
        if (current.currentSection !== parsed.section) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_SECTION_LOCKED' });
        return this.toDto(await advanceMockSection(tx, current, now));
      }
      this.requireWritable(attempt, parsed.expectedRevision);
      if (attempt.currentSection !== parsed.section) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_SECTION_LOCKED' });
      const content = ieltsMockContentSchema.parse(attempt.mockTestVersion.content);
      const submitted = [...this.jsonStrings(attempt.submittedSections), parsed.section];
      const currentIndex = sequence.indexOf(parsed.section); const final = currentIndex === sequence.length - 1; const now = new Date();
      const objective = { ...this.jsonRecord(attempt.objectiveScore) } as Record<string, unknown>;
      if (parsed.section === 'LISTENING' || parsed.section === 'READING') objective[parsed.section.toLowerCase()] = this.objective(content, parsed.section, this.jsonRecord(attempt.responses));
      const next = final ? 'COMPLETE' : sequence[currentIndex + 1]!;
      const updated = await tx.ieltsMockAttempt.updateMany({ where: { id: attempt.id, revision: parsed.expectedRevision }, data: {
        submittedSections: submitted, objectiveScore: objective as Prisma.InputJsonValue, currentSection: next,
        status: final ? 'EVALUATION_PENDING' : 'IN_PROGRESS', submittedAt: final ? now : null,
        sectionStartedAt: now, sectionDeadlineAt: final ? now : this.deadline(now, next as Section), revision: { increment: 1 },
      } });
      if (updated.count !== 1) this.stale();
      return this.toDto(await tx.ieltsMockAttempt.findUniqueOrThrow({ where: { id: attempt.id }, include: attemptInclude }));
    });
  }

  async report(learnerId: string, attemptId: string): Promise<IeltsMockReportDto> {
    const attempt = await this.database.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: attemptInclude });
    if (!attempt) throw new NotFoundException('IELTS mock attempt was not found.');
    if (attempt.reportSnapshot) return ieltsMockReportSchema.parse(attempt.reportSnapshot);
    if (attempt.status !== 'EVALUATION_PENDING') throw new ConflictException({ code: 'IELTS_MOCK_REPORT_NOT_READY' });
    const score = this.jsonRecord(attempt.objectiveScore) as Record<string, { rawScore?: number; mockBand?: number }>;
    return ieltsMockReportSchema.parse({ attemptId, status: 'EVALUATION_PENDING', scoringPolicyVersion: 1, disclosure: ieltsMockContentSchema.parse(attempt.mockTestVersion.content).disclosure,
      skills: { listening: { status: 'SCORED', rawScore: score.listening?.rawScore ?? 0, mockBand: score.listening?.mockBand ?? 0 }, reading: { status: 'SCORED', rawScore: score.reading?.rawScore ?? 0, mockBand: score.reading?.mockBand ?? 0 }, writing: { status: 'PENDING_EVALUATION', rawScore: null, mockBand: null }, speaking: { status: 'PENDING_EVALUATION', rawScore: null, mockBand: null } },
      overallMockBand: null, strengths: [], gaps: [], nextActions: ['Wait for teacher review of Writing and Speaking.'], completedAt: null });
  }

  async getAudio(learnerId: string, attemptId: string, assetId: string, leaseId?: string) {
    const pinned = await this.database.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId } });
    if (pinned?.policyVersion === 'v2') {
      if (!this.playback) throw new ConflictException({ code: 'IELTS_MOCK_AUDIO_LEASE_REQUIRED' });
      return { ...await this.playback.stream(learnerId, attemptId, assetId, leaseId), allowRange: true };
    }
    const artifact = await this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-mock-audio:' + attemptId + ':' + assetId}))`;
      const attempt = await tx.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: attemptInclude });
      if (!attempt || attempt.currentSection !== 'LISTENING') throw new NotFoundException('IELTS mock audio was not found.');
      const content = ieltsMockContentSchema.parse(attempt.mockTestVersion.content);
      if (!content.listening.parts.some((part) => part.audioAssetId === assetId)) throw new NotFoundException('IELTS mock audio was not found.');
      const ready = await tx.audioArtifact.findFirst({ where: { id: assetId, status: 'READY', adapterName: { not: 'fake-tts' } } });
      if (!ready) throw new NotFoundException('IELTS mock audio was not found.');
      const plays = this.jsonNumbers(attempt.audioPlayEvents); const count = plays[assetId] ?? 0;
      if (attempt.mode === 'EXAM_SIMULATION' && count >= 1) throw new ConflictException({ code: 'IELTS_MOCK_AUDIO_PLAY_LIMIT' });
      return { ...ready, mode: attempt.mode };
    });
    const body = await this.storage.read(artifact.storageKey);
    await this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-mock-audio:' + attemptId + ':' + assetId}))`;
      const attempt = await tx.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId } });
      if (!attempt) throw new NotFoundException('IELTS mock audio was not found.');
      const plays = this.jsonNumbers(attempt.audioPlayEvents); const count = plays[assetId] ?? 0;
      if (attempt.mode === 'EXAM_SIMULATION' && count >= 1) throw new ConflictException({ code: 'IELTS_MOCK_AUDIO_PLAY_LIMIT' });
      await tx.ieltsMockAttempt.update({ where: { id: attempt.id }, data: { audioPlayEvents: { ...plays, [assetId]: count + 1 } } });
    });
    return { body, byteSize: artifact.byteSize, mimeType: artifact.mimeType, allowRange: artifact.mode !== 'EXAM_SIMULATION' };
  }

  private requireWritable(attempt: AttemptRecord, revision: number) { if (attempt.status !== 'IN_PROGRESS' || attempt.revision !== revision) this.stale(); }
  private stale(): never { throw new ConflictException({ code: 'IELTS_MOCK_REVISION_STALE' }); }
  private deadline(now: Date, section: Section) { return new Date(now.getTime() + durations[section] * 60_000); }
  private jsonRecord(value: Prisma.JsonValue | null): Record<string, string> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string> : {}; }
  private jsonStrings(value: Prisma.JsonValue): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
  private jsonNumbers(value: Prisma.JsonValue): Record<string, number> { if (!value || typeof value !== 'object' || Array.isArray(value)) return {}; return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number')); }
  private responseIds(content: ReturnType<typeof ieltsMockContentSchema.parse>, section: Section): string[] {
    if (section === 'LISTENING') return content.listening.parts.flatMap((part) => part.questions.map((question) => question.id));
    if (section === 'READING') return content.reading.passages.flatMap((passage) => passage.questions.map((question) => question.id));
    if (section === 'WRITING') return content.writing.tasks.map((task) => `writing-${task.task}`);
    return content.speaking.parts.map((part) => `speaking-${part.part}`);
  }
  private objective(content: ReturnType<typeof ieltsMockContentSchema.parse>, section: 'LISTENING' | 'READING', responses: Record<string, string>) {
    const source = section === 'LISTENING' ? content.listening : content.reading;
    const questions = 'parts' in source ? source.parts.flatMap((part) => part.questions) : source.passages.flatMap((passage) => passage.questions);
    const rawScore = questions.filter((question) => scoreObjectiveAnswer(responses[question.id] ?? '', question.answerPolicy)).length;
    return { rawScore, mockBand: source.conversion[rawScore]!.mockBand };
  }
  private toDto(attempt: AttemptRecord): IeltsMockAttemptDto { return toMockAttemptDto(attempt, this.clock?.now() ?? new Date()); }

  private async admitV3(db: PrismaService | Prisma.TransactionClient, learnerId: string) {
    const [user, program] = await Promise.all([db.user.findUnique({ where: { id: learnerId }, include: { profile: true } }), db.learningProgram.findUnique({ where: { slug: 'ielts' } })]);
    if (!canEnterIeltsV3({ role: user?.role ?? '', status: user?.status ?? '', onboardingStatus: user?.profile?.onboardingStatus ?? '', programStatus: program?.availabilityStatus ?? '' })) throw new ConflictException({ code: 'IELTS_V3_NOT_AVAILABLE' });
  }
}
