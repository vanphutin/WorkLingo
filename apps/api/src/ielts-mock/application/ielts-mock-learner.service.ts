import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ieltsMockAttemptSchema, ieltsMockCatalogSchema, ieltsMockContentSchema, ieltsMockReportSchema,
  saveIeltsMockResponsesSchema, startIeltsMockAttemptSchema, submitIeltsMockSectionSchema,
  type IeltsMockAttemptDto, type IeltsMockReportDto,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { scoreObjectiveAnswer } from '../domain/ielts-mock-scoring.js';

const attemptInclude = { mockTestVersion: true } as const;
type AttemptRecord = Prisma.IeltsMockAttemptGetPayload<{ include: typeof attemptInclude }>;
type Section = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
const sequence: readonly Section[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
const durations: Record<Section, number> = { LISTENING: 30, READING: 60, WRITING: 60, SPEAKING: 14 };

@Injectable()
export class IeltsMockLearnerService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService, @Inject(ObjectStorage) private readonly storage: ObjectStorage) {}

  async catalog(learnerId: string) {
    const journey = await this.database.ieltsBandJourney.findUnique({ where: { learnerId } });
    if (!journey) return ieltsMockCatalogSchema.parse({ eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED', mocks: [] });
    const [mocks, attempts] = await Promise.all([
      this.database.ieltsMockTest.findMany({ where: { status: 'PUBLISHED', currentPublishedVersionId: { not: null } }, include: { currentPublishedVersion: true }, orderBy: { updatedAt: 'desc' } }),
      this.database.ieltsMockAttempt.findMany({ where: { learnerId, status: 'IN_PROGRESS' }, select: { id: true, mockTestVersion: { select: { mockTestId: true } } } }),
    ]);
    if (!mocks.length) return ieltsMockCatalogSchema.parse({ eligible: false, lockedReason: 'MOCK_NOT_PUBLISHED', mocks: [] });
    return ieltsMockCatalogSchema.parse({ eligible: true, lockedReason: null, mocks: mocks.flatMap((mock) => {
      if (!mock.currentPublishedVersion) return [];
      const content = ieltsMockContentSchema.parse(mock.currentPublishedVersion.content);
      return [{ id: mock.id, title: content.title, variant: content.variant, version: mock.currentPublishedVersion.version, allowedModes: content.allowedModes, activeAttemptId: attempts.find((item) => item.mockTestVersion.mockTestId === mock.id)?.id ?? null }];
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
      if (!await tx.ieltsBandJourney.findUnique({ where: { learnerId } })) throw new ConflictException({ code: 'IELTS_BAND_PATHWAY_REQUIRED' });
      const mock = await tx.ieltsMockTest.findUnique({ where: { id: parsed.mockTestId }, include: { currentPublishedVersion: true } });
      if (!mock?.currentPublishedVersion || mock.status !== 'PUBLISHED') throw new ConflictException({ code: 'IELTS_MOCK_NOT_PUBLISHED' });
      const content = ieltsMockContentSchema.parse(mock.currentPublishedVersion.content);
      if (!content.allowedModes.includes(parsed.mode)) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_MODE_NOT_ALLOWED' });
      const now = new Date();
      const created = await tx.ieltsMockAttempt.create({ data: { learnerId, clientAttemptId: parsed.clientAttemptId, mockTestVersionId: mock.currentPublishedVersion.id, mode: parsed.mode, sectionStartedAt: now, sectionDeadlineAt: this.deadline(now, 'LISTENING') }, include: attemptInclude });
      return this.toDto(created);
    });
  }

  async get(learnerId: string, attemptId: string): Promise<IeltsMockAttemptDto> {
    const attempt = await this.database.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: attemptInclude });
    if (!attempt) throw new NotFoundException('IELTS mock attempt was not found.');
    if (attempt.status === 'IN_PROGRESS' && Date.now() > attempt.sectionDeadlineAt.getTime()) return this.submitSection(learnerId, attemptId, { expectedRevision: attempt.revision, section: attempt.currentSection });
    return this.toDto(attempt);
  }

  async saveResponses(learnerId: string, attemptId: string, input: unknown): Promise<IeltsMockAttemptDto> {
    const parsed = saveIeltsMockResponsesSchema.parse(input);
    return this.database.$transaction(async (tx) => {
      const attempt = await tx.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: attemptInclude });
      if (!attempt) throw new NotFoundException('IELTS mock attempt was not found.');
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
  }

  async submitSection(learnerId: string, attemptId: string, input: unknown): Promise<IeltsMockAttemptDto> {
    const parsed = submitIeltsMockSectionSchema.parse(input);
    return this.database.$transaction(async (tx) => {
      const attempt = await tx.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: attemptInclude });
      if (!attempt) throw new NotFoundException('IELTS mock attempt was not found.');
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

  async getAudio(learnerId: string, attemptId: string, assetId: string) {
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
      await tx.ieltsMockAttempt.update({ where: { id: attempt.id }, data: { audioPlayEvents: { ...plays, [assetId]: count + 1 } } });
      return ready;
    });
    return { body: await this.storage.read(artifact.storageKey), byteSize: artifact.byteSize, mimeType: artifact.mimeType };
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
  private toDto(attempt: AttemptRecord): IeltsMockAttemptDto {
    const content = ieltsMockContentSchema.parse(attempt.mockTestVersion.content);
    const safeQuestion = (question: (typeof content.listening.parts)[number]['questions'][number]) => ({ id: question.id, order: question.order, type: question.type, prompt: question.prompt, options: question.options, competencyTags: question.competencyTags });
    return ieltsMockAttemptSchema.parse({ id: attempt.id, mockTestVersionId: attempt.mockTestVersionId, mockTestVersion: attempt.mockTestVersion.version, title: content.title, mode: attempt.mode, status: attempt.status, currentSection: attempt.currentSection, revision: attempt.revision, responses: this.jsonRecord(attempt.responses), submittedSections: this.jsonStrings(attempt.submittedSections), sectionStartedAt: attempt.sectionStartedAt.toISOString(), sectionDeadlineAt: attempt.sectionDeadlineAt.toISOString(), startedAt: attempt.startedAt.toISOString(), submittedAt: attempt.submittedAt?.toISOString() ?? null,
      sectionContent: {
        listening: attempt.currentSection === 'LISTENING' ? content.listening.parts.map((part) => ({ part: part.part, audioUrl: `/api/v1/me/ielts-mocks/attempts/${attempt.id}/audio/${part.audioAssetId}`, questions: part.questions.map(safeQuestion) })) : [],
        reading: attempt.currentSection === 'READING' ? content.reading.passages.map((passage) => ({ section: passage.section, title: passage.title, passage: passage.passage, questions: passage.questions.map(safeQuestion) })) : [],
        writing: attempt.currentSection === 'WRITING' ? content.writing.tasks.map(({ task, title, prompt, minimumWords }) => ({ task, title, prompt, minimumWords })) : [],
        speaking: attempt.currentSection === 'SPEAKING' ? content.speaking.parts.map(({ part, title, prompts, preparationSeconds, responseSeconds }) => ({ part, title, prompts, preparationSeconds, responseSeconds })) : [],
      } });
  }
}
