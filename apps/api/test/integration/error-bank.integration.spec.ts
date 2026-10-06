import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TestClock } from '../../src/mastery/domain/clock.port.js';
import { MasteryService } from '../../src/mastery/application/mastery.service.js';
import type { PrismaService } from '../../src/common/database/prisma.service.js';

describe('Error Bank & Memory Health Domain & Service Integration', () => {
  const schemaName = `error_bank_int_test_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;
  let masteryService: MasteryService;
  let clock: TestClock;

  let learner1Id: string;
  let learner2Id: string;
  let languageBlockId: string;
  let lessonId: string;
  let lessonVersionId: string;
  let activityId: string;
  let activitySlug: string;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve(
      'prisma/build/index.js',
    );
    const migration = spawnSync(
      process.execPath,
      [cli, 'migrate', 'deploy'],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        encoding: 'utf8',
        timeout: 45_000,
      },
    );
    if (migration.status !== 0) {
      throw new Error(migration.stderr || migration.stdout);
    }

    database = new PrismaClient({ datasourceUrl: url.toString() });
    await database.$connect();

    clock = new TestClock(new Date('2026-10-06T12:00:00Z'));
    masteryService = new MasteryService(database as unknown as PrismaService, clock);

    // Create learners
    const u1 = await database.user.create({
      data: {
        email: `learner1_${randomUUID()}@example.test`,
        displayName: 'Learner One',
        passwordHash: 'dummy',
      },
    });
    learner1Id = u1.id;

    const u2 = await database.user.create({
      data: {
        email: `learner2_${randomUUID()}@example.test`,
        displayName: 'Learner Two',
        passwordHash: 'dummy',
      },
    });
    learner2Id = u2.id;

    // Create WordBank & LanguageBlock
    const wb = await database.wordBank.create({
      data: {
        slug: `wb_${randomUUID()}`,
        name: 'Workplace Introductions',
      },
    });

    const lb = await database.languageBlock.create({
      data: {
        slug: 'my-name-is',
        canonicalForm: 'My name is ...',
        meaning: 'Ten toi la ...',
        pronunciation: '/mai neim iz/',
        collocations: ['first name'],
        grammarPattern: 'My name + is + name',
        examples: ['My name is An.'],
        commonErrors: ['My name An.'],
        cefrLevel: 'Pre-A1',
        transferContexts: ['introducing yourself'],
        wordBankId: wb.id,
      },
    });
    languageBlockId = lb.id;

    // Create Curriculum & Lesson
    const pathObj = await database.learningPath.create({
      data: { slug: `path_${randomUUID()}`, name: 'English for Work' },
    });
    const levelObj = await database.level.create({
      data: {
        code: `F1_${randomUUID().slice(0, 8)}`,
        name: 'Foundation 1',
        cefrReference: 'Pre-A1',
        pathId: pathObj.id,
        order: 1,
      },
    });
    await database.mission.create({
      data: {
        slug: `mission_${randomUUID()}`,
        title: 'Mission 1',
        objective: 'Test Objective',
        levelId: levelObj.id,
        order: 1,
      },
    });

    const lessonObj = await database.lesson.create({
      data: {
        slug: 'first-day-introductions',
      },
    });
    lessonId = lessonObj.id;

    const lv = await database.lessonVersion.create({
      data: {
        lessonId: lessonObj.id,
        version: 1,
        title: 'Version 1',
        status: 'DRAFT',
        sourceHash: 'hash-v1',
        parsedContent: {},
      },
    });
    lessonVersionId = lv.id;

    activitySlug = 'greeting-activity';
    const act = await database.activity.create({
      data: {
        lessonVersionId: lv.id,
        slug: activitySlug,
        activityType: 'reading',
        learningBlock: 'activate',
        order: 1,
        skills: ['reading'],
        contentReferences: [],
        languageBlockReferences: ['my-name-is'],
        payload: { prompt: 'Identify the greeting' },
      },
    });
    activityId = act.id;
  });

  afterAll(async () => {
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminDb.$disconnect();
  });

  async function createSessionAndAttempt(
    learnerId: string,
    score: number | null,
    status: 'SUBMITTED' | 'EVALUATED',
    versionId = lessonVersionId,
    sessionActivityId = activityId,
  ) {
    const session = await database.learningSession.create({
      data: {
        learnerId,
        clientSessionId: randomUUID(),
        missionId: (await database.mission.findFirstOrThrow()).id,
        lessonVersionId: versionId,
        durationMinutes: 60,
        planSnapshot: {},
        status: 'IN_PROGRESS',
      },
    });

    const attempt = await database.activityAttempt.create({
      data: {
        learnerId,
        sessionId: session.id,
        activityId: sessionActivityId,
        clientAttemptId: randomUUID(),
        rawResponse: { answer: 'wrong answer' },
        evaluationStatus: status,
        score,
      },
    });

    return { session, attempt };
  }

  it('creates ErrorBankEntry atomically when attempt is evaluated with score < 0.7', async () => {
    const { attempt } = await createSessionAndAttempt(learner1Id, 0.4, 'EVALUATED');

    const results = await masteryService.recordAttemptEvaluation({
      attemptId: attempt.id,
      learnerId: learner1Id,
      lessonVersionId,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.4,
      evaluationStatus: 'EVALUATED',
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.eventType).toBe('INCORRECT_ATTEMPT');

    const errorEntry = await database.errorBankEntry.findUnique({
      where: { masteryEventId: results[0]!.id },
    });
    expect(errorEntry).toBeDefined();
    expect(errorEntry?.learnerId).toBe(learner1Id);
    expect(errorEntry?.languageBlockId).toBe(languageBlockId);
    expect(errorEntry?.skill).toBe('reading');
    expect(errorEntry?.errorType).toBe('ACTIVITY_INCORRECT');
    expect(errorEntry?.evidenceGranularity).toBe('ACTIVITY');
    expect(errorEntry?.contextKey).toBe(`${lessonId}:${activitySlug}`);
    expect(errorEntry?.activityId).toBe(activityId);
    expect(errorEntry?.activitySlug).toBe(activitySlug);

    const event = await database.masteryEvent.findUniqueOrThrow({
      where: { id: results[0]!.id },
    });
    expect(errorEntry?.occurredAt).toEqual(event.createdAt);
  });

  it('derives error context from the stored attempt, not caller-supplied metadata', async () => {
    const { attempt } = await createSessionAndAttempt(learner1Id, 0.4, 'EVALUATED');

    const results = await masteryService.recordAttemptEvaluation({
      attemptId: attempt.id,
      learnerId: learner1Id,
      lessonVersionId,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.4,
      evaluationStatus: 'EVALUATED',
      metadata: { activitySlug: 'incorrect-caller-slug' },
    });

    const entry = await database.errorBankEntry.findUniqueOrThrow({
      where: { masteryEventId: results[0]!.id },
    });
    expect(entry.activitySlug).toBe(activitySlug);
    expect(entry.contextKey).toBe(`${lessonId}:${activitySlug}`);
  });

  it('rejects a score that differs from the evaluated attempt without writing evidence', async () => {
    const { attempt } = await createSessionAndAttempt(learner1Id, 0.4, 'EVALUATED');

    await expect(masteryService.recordAttemptEvaluation({
      attemptId: attempt.id,
      learnerId: learner1Id,
      lessonVersionId,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.2,
      evaluationStatus: 'EVALUATED',
    })).rejects.toThrow('Evaluated attempt context does not match mastery evidence');

    expect(await database.masteryEvent.count({ where: { attemptId: attempt.id } })).toBe(0);
    expect(await database.errorBankEntry.count({
      where: { masteryEvent: { attemptId: attempt.id } },
    })).toBe(0);
  });

  it('rolls back ErrorBankEntry atomically if transaction fails', async () => {
    const { attempt } = await createSessionAndAttempt(learner1Id, 0.3, 'EVALUATED');

    await expect(
      database.$transaction(async (tx) => {
        await masteryService.recordAttemptEvaluation({
          attemptId: attempt.id,
          learnerId: learner1Id,
          lessonVersionId,
          skills: ['reading'],
          languageBlockSlugs: ['my-name-is'],
          score: 0.3,
          evaluationStatus: 'EVALUATED',
          tx,
        });
        // Intentionally throw inside transaction
        throw new Error('Simulated transactional failure');
      }),
    ).rejects.toThrow('Simulated transactional failure');

    const attemptEvents = await database.masteryEvent.findMany({
      where: { attemptId: attempt.id },
    });
    expect(attemptEvents).toHaveLength(0);

    const errorEntries = await database.errorBankEntry.findMany({
      where: { masteryEvent: { attemptId: attempt.id } },
    });
    expect(errorEntries).toHaveLength(0);
  });

  it('never creates ErrorBankEntry for SUBMITTED attempts or score === null or score >= 0.7', async () => {
    // 1. SUBMITTED attempt
    const { attempt: submittedAttempt } = await createSessionAndAttempt(learner1Id, null, 'SUBMITTED');
    const res1 = await masteryService.recordAttemptEvaluation({
      attemptId: submittedAttempt.id,
      learnerId: learner1Id,
      lessonVersionId,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: null,
      evaluationStatus: 'SUBMITTED',
    });
    expect(res1).toHaveLength(0);

    // 2. Score >= 0.7 (Correct recall)
    const { attempt: correctAttempt } = await createSessionAndAttempt(learner1Id, 0.85, 'EVALUATED');
    const res2 = await masteryService.recordAttemptEvaluation({
      attemptId: correctAttempt.id,
      learnerId: learner1Id,
      lessonVersionId,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.85,
      evaluationStatus: 'EVALUATED',
    });
    expect(res2).toHaveLength(1);
    expect(res2[0]?.eventType).toBe('CORRECT_RECALL');

    const entryForCorrect = await database.errorBankEntry.findUnique({
      where: { masteryEventId: res2[0]!.id },
    });
    expect(entryForCorrect).toBeNull();
  });

  it('aggregates grouped error bank entries with stable sort and correct counts', async () => {
    const groupedLearner = await database.user.create({
      data: {
        email: `grouped_${randomUUID()}@example.test`,
        displayName: 'Grouped Learner',
        passwordHash: 'dummy',
      },
    });
    const { attempt: firstAttempt } = await createSessionAndAttempt(groupedLearner.id, 0.4, 'EVALUATED');
    await masteryService.recordAttemptEvaluation({
      attemptId: firstAttempt.id,
      learnerId: groupedLearner.id,
      lessonVersionId,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.4,
      evaluationStatus: 'EVALUATED',
    });

    clock.advance(3600_000);
    const { attempt: secondAttempt } = await createSessionAndAttempt(groupedLearner.id, 0.2, 'EVALUATED');
    await masteryService.recordAttemptEvaluation({
      attemptId: secondAttempt.id,
      learnerId: groupedLearner.id,
      lessonVersionId,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.2,
      evaluationStatus: 'EVALUATED',
    });

    const grouped = await masteryService.getErrorBank(groupedLearner.id, { skill: 'reading' });
    expect(grouped.total).toBe(1);
    expect(grouped.items).toHaveLength(1);

    const item = grouped.items[0]!;
    expect(item.languageBlockSlug).toBe('my-name-is');
    expect(item.canonicalForm).toBe('My name is ...');
    expect(item.occurrenceCount).toBe(2);
    expect(item.contextKey).toBe(`${lessonId}:${activitySlug}`);
    expect(new Date(item.firstOccurredAt).getTime()).toBeLessThan(new Date(item.lastOccurredAt).getTime());
  });

  it('records only one error for concurrent retries of the same attempt', async () => {
    const learner = await database.user.create({
      data: {
        email: `retry_${randomUUID()}@example.test`,
        displayName: 'Retry Learner',
        passwordHash: 'dummy',
      },
    });
    const { attempt } = await createSessionAndAttempt(learner.id, 0.2, 'EVALUATED');
    const input = {
      attemptId: attempt.id,
      learnerId: learner.id,
      lessonVersionId,
      skills: ['reading'] as const,
      languageBlockSlugs: ['my-name-is'],
      score: 0.2,
      evaluationStatus: 'EVALUATED',
    };

    const [first, second] = await Promise.all([
      masteryService.recordAttemptEvaluation({ ...input, skills: [...input.skills] }),
      masteryService.recordAttemptEvaluation({ ...input, skills: [...input.skills] }),
    ]);

    expect(first.length + second.length).toBe(1);
    expect(await database.masteryEvent.count({ where: { attemptId: attempt.id } })).toBe(1);
    expect(await database.errorBankEntry.count({ where: { learnerId: learner.id } })).toBe(1);
  });

  it('keeps old session evidence on version 1 and groups the same activity across versions', async () => {
    const learner = await database.user.create({
      data: {
        email: `version_${randomUUID()}@example.test`,
        displayName: 'Version Learner',
        passwordHash: 'dummy',
      },
    });
    const { session: oldSession, attempt: oldAttempt } = await createSessionAndAttempt(
      learner.id,
      0.3,
      'EVALUATED',
    );
    const version2 = await database.lessonVersion.create({
      data: {
        lessonId,
        version: 2,
        title: 'Version 2',
        status: 'DRAFT',
        sourceHash: 'hash-v2',
        parsedContent: {},
      },
    });
    const activity2 = await database.activity.create({
      data: {
        lessonVersionId: version2.id,
        slug: activitySlug,
        activityType: 'reading',
        learningBlock: 'activate',
        order: 1,
        skills: ['reading'],
        contentReferences: [],
        languageBlockReferences: ['my-name-is'],
        payload: { prompt: 'Identify the greeting in the revised lesson' },
      },
    });
    await database.lessonVersion.update({
      where: { id: version2.id },
      data: { status: 'PUBLISHED' },
    });
    await database.lesson.update({
      where: { id: lessonId },
      data: { currentPublishedVersionId: version2.id },
    });

    const oldResult = await masteryService.recordAttemptEvaluation({
      attemptId: oldAttempt.id,
      learnerId: learner.id,
      lessonVersionId,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.3,
      evaluationStatus: 'EVALUATED',
    });
    clock.advance(1000);
    const { attempt: newAttempt } = await createSessionAndAttempt(
      learner.id,
      0.2,
      'EVALUATED',
      version2.id,
      activity2.id,
    );
    const newResult = await masteryService.recordAttemptEvaluation({
      attemptId: newAttempt.id,
      learnerId: learner.id,
      lessonVersionId: version2.id,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.2,
      evaluationStatus: 'EVALUATED',
    });

    expect((await database.learningSession.findUniqueOrThrow({ where: { id: oldSession.id } })).lessonVersionId).toBe(lessonVersionId);
    const oldEntry = await database.errorBankEntry.findUniqueOrThrow({
      where: { masteryEventId: oldResult[0]!.id },
    });
    const newEntry = await database.errorBankEntry.findUniqueOrThrow({
      where: { masteryEventId: newResult[0]!.id },
    });
    expect(oldEntry.lessonVersionId).toBe(lessonVersionId);
    expect(newEntry.lessonVersionId).toBe(version2.id);
    expect(oldEntry.contextKey).toBe(`${lessonId}:${activitySlug}`);
    expect(newEntry.contextKey).toBe(oldEntry.contextKey);

    const grouped = await masteryService.getErrorBank(learner.id);
    expect(grouped.total).toBe(1);
    expect(grouped.items[0]?.occurrenceCount).toBe(2);
    expect(grouped.items[0]?.lessonVersionId).toBe(version2.id);
  });

  it('backfills missing INCORRECT_ATTEMPT events idempotently', async () => {
    // Manually create a historical MasteryEvent without ErrorBankEntry
    const { attempt } = await createSessionAndAttempt(learner2Id, 0.5, 'EVALUATED');
    const legacyEvent = await database.masteryEvent.create({
      data: {
        learnerId: learner2Id,
        attemptId: attempt.id,
        languageBlockId,
        skill: 'reading',
        lessonVersionId,
        eventType: 'INCORRECT_ATTEMPT',
        score: 0.5,
      },
    });

    // Verify it doesn't have an error bank entry yet
    const before = await database.errorBankEntry.findUnique({
      where: { masteryEventId: legacyEvent.id },
    });
    expect(before).toBeNull();

    // Run backfill
    const result1 = await masteryService.backfillErrorBank(learner2Id);
    expect(result1.backfilledCount).toBe(1);

    const after = await database.errorBankEntry.findUnique({
      where: { masteryEventId: legacyEvent.id },
    });
    expect(after).toBeDefined();
    expect(after?.contextKey).toBe(`${lessonId}:${activitySlug}`);

    // Re-run backfill: should be idempotent and backfill 0
    const result2 = await masteryService.backfillErrorBank(learner2Id);
    expect(result2.backfilledCount).toBe(0);
  });

  it('cascades deletion when user is deleted', async () => {
    const entriesBefore = await database.errorBankEntry.findMany({
      where: { learnerId: learner2Id },
    });
    expect(entriesBefore.length).toBeGreaterThan(0);

    await database.user.delete({ where: { id: learner2Id } });

    const entriesAfter = await database.errorBankEntry.findMany({
      where: { learnerId: learner2Id },
    });
    expect(entriesAfter).toHaveLength(0);
  });
});
