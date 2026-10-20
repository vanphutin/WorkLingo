import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ieltsMockAttemptSchema, ieltsMockContentSchema, type IeltsMockAttemptDto } from '@worklingo/contracts';
import { scoreObjectiveAnswer } from '../domain/ielts-mock-scoring.js';

export const mockAttemptInclude = { mockTestVersion: true } as const;
export type MockAttemptRecord = Prisma.IeltsMockAttemptGetPayload<{ include: typeof mockAttemptInclude }>;
export type MockSection = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
export const mockSectionOrder: readonly MockSection[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
const minutes: Record<MockSection, number> = { LISTENING: 30, READING: 60, WRITING: 60, SPEAKING: 14 };
export const mockResponses = (value: Prisma.JsonValue | null): Record<string, string> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string> : {};
export const mockSubmitted = (value: Prisma.JsonValue): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
export function mockElapsedMilliseconds(attempt: { policyVersion: string; elapsedMs: number; pausedAt: Date | null; clockUpdatedAt: Date; status: string }, now: Date): number {
  if (attempt.policyVersion !== 'v2') return 0;
  return attempt.elapsedMs + (attempt.pausedAt || attempt.status !== 'IN_PROGRESS' ? 0 : Math.max(0, now.getTime() - attempt.clockUpdatedAt.getTime()));
}

export async function lockMockAttempt(tx: Prisma.TransactionClient, learnerId: string, id: string): Promise<MockAttemptRecord> {
  await tx.$queryRaw`SELECT "id" FROM "IeltsMockAttempt" WHERE "id" = ${id}::uuid AND "learnerId" = ${learnerId}::uuid FOR UPDATE`;
  const attempt = await tx.ieltsMockAttempt.findFirst({ where: { id, learnerId }, include: mockAttemptInclude });
  if (!attempt) throw new NotFoundException('IELTS mock attempt not found.');
  return attempt;
}

export async function advanceMockSection(tx: Prisma.TransactionClient, attempt: MockAttemptRecord, now: Date, automatic = false): Promise<MockAttemptRecord> {
  const section = attempt.currentSection as MockSection;
  const index = mockSectionOrder.indexOf(section);
  if (index < 0 || attempt.status !== 'IN_PROGRESS') throw new ConflictException({ code: 'IELTS_MOCK_REVISION_STALE' });
  if (section === 'SPEAKING' && attempt.policyVersion === 'v2' && !automatic) {
    const recordings = await tx.ieltsMockRecording.findMany({ where: { attemptId: attempt.id, deletedAt: null, retainUntil: { gt: now } }, select: { part: true } });
    if (![1, 2, 3].every(part => recordings.some(recording => recording.part === part))) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_SPEAKING_AUDIO_REQUIRED' });
  }
  const content = ieltsMockContentSchema.parse(attempt.mockTestVersion.content);
  const score: Record<string, Prisma.JsonValue> = attempt.objectiveScore && typeof attempt.objectiveScore === 'object' && !Array.isArray(attempt.objectiveScore) ? Object.fromEntries(Object.entries(attempt.objectiveScore).filter((entry): entry is [string, Prisma.JsonValue] => entry[1] !== undefined)) : {};
  if (section === 'LISTENING' || section === 'READING') {
    const source = section === 'LISTENING' ? content.listening : content.reading;
    const questions = 'parts' in source ? source.parts.flatMap(part => part.questions) : source.passages.flatMap(passage => passage.questions);
    const responses = mockResponses(attempt.responses);
    const rawScore = questions.filter(question => scoreObjectiveAnswer(responses[question.id] ?? '', question.answerPolicy)).length;
    score[section.toLowerCase()] = { rawScore, mockBand: source.conversion[rawScore]!.mockBand };
  }
  const final = index === mockSectionOrder.length - 1;
  const next = final ? 'COMPLETE' : mockSectionOrder[index + 1]!;
  const transitionAt = automatic ? attempt.sectionDeadlineAt : now;
  return tx.ieltsMockAttempt.update({ where: { id: attempt.id }, data: {
    submittedSections: [...new Set([...mockSubmitted(attempt.submittedSections), section])], objectiveScore: score,
    currentSection: next, status: final ? 'EVALUATION_PENDING' : 'IN_PROGRESS', submittedAt: final ? transitionAt : null,
    sectionStartedAt: transitionAt, sectionDeadlineAt: final ? transitionAt : new Date(transitionAt.getTime() + minutes[next as MockSection] * 60_000),
    elapsedMs: mockElapsedMilliseconds(attempt, transitionAt), clockUpdatedAt: transitionAt, pausedAt: null, revision: { increment: 1 },
  }, include: mockAttemptInclude });
}

export async function expireMockSections(tx: Prisma.TransactionClient, attempt: MockAttemptRecord, now: Date): Promise<MockAttemptRecord> {
  let current = attempt;
  while (current.policyVersion === 'v2' && current.mode === 'EXAM_SIMULATION' && current.status === 'IN_PROGRESS' && current.sectionDeadlineAt.getTime() <= now.getTime()) current = await advanceMockSection(tx, current, now, true);
  return current;
}

export function toMockAttemptDto(attempt: MockAttemptRecord, now: Date): IeltsMockAttemptDto {
  const content = ieltsMockContentSchema.parse(attempt.mockTestVersion.content);
  const safe = (question: (typeof content.listening.parts)[number]['questions'][number]) => ({ id: question.id, order: question.order, type: question.type, prompt: question.prompt, options: question.options, competencyTags: question.competencyTags });
  return ieltsMockAttemptSchema.parse({ policyVersion: attempt.policyVersion ?? 'legacy-v1', elapsedMs: mockElapsedMilliseconds(attempt, now), pausedAt: attempt.pausedAt?.toISOString() ?? null,
    id: attempt.id, mockTestVersionId: attempt.mockTestVersionId, mockTestVersion: attempt.mockTestVersion.version, title: content.title, mode: attempt.mode, status: attempt.status, currentSection: attempt.currentSection, revision: attempt.revision, responses: mockResponses(attempt.responses), submittedSections: mockSubmitted(attempt.submittedSections), sectionStartedAt: attempt.sectionStartedAt.toISOString(), sectionDeadlineAt: attempt.sectionDeadlineAt.toISOString(), startedAt: attempt.startedAt.toISOString(), submittedAt: attempt.submittedAt?.toISOString() ?? null,
    sectionContent: {
      listening: attempt.currentSection === 'LISTENING' ? content.listening.parts.map(part => ({ part: part.part, audioAssetId: part.audioAssetId ?? undefined, audioUrl: `/api/v1/me/ielts-mocks/attempts/${attempt.id}/audio/${part.audioAssetId}`, questions: part.questions.map(safe) })) : [],
      reading: attempt.currentSection === 'READING' ? content.reading.passages.map(passage => ({ section: passage.section, title: passage.title, passage: passage.passage, questions: passage.questions.map(safe) })) : [],
      writing: attempt.currentSection === 'WRITING' ? content.writing.tasks.map(({ task, title, prompt, minimumWords }) => ({ task, title, prompt, minimumWords })) : [],
      speaking: attempt.currentSection === 'SPEAKING' ? content.speaking.parts.map(({ part, title, prompts, preparationSeconds, responseSeconds }) => ({ part, title, prompts, preparationSeconds, responseSeconds })) : [],
    },
  });
}
