import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TestClock } from '../../src/mastery/domain/clock.port.js';
import { MasteryService } from '../../src/mastery/application/mastery.service.js';
import type { PrismaService } from '../../src/common/database/prisma.service.js';

describe('Mastery & Review Scheduler Integration', () => {
  const schemaName = `mastery_int_test_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;
  let masteryService: MasteryService;
  let clock: TestClock;

  let learnerId: string;
  let languageBlockId: string;
  let lessonVersion1Id: string;
  let lessonVersion2Id: string;

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

    const user = await database.user.create({
      data: {
        email: `learner_${randomUUID()}@example.test`,
        displayName: 'Test Learner',
        passwordHash: 'dummy',
      },
    });
    learnerId = user.id;

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

    const lv1 = await database.lessonVersion.create({
      data: {
        lessonId: lessonObj.id,
        version: 1,
        title: 'Version 1',
        status: 'DRAFT',
        sourceHash: 'hash-v1',
        parsedContent: {},
      },
    });
    lessonVersion1Id = lv1.id;

    for (const skill of ['reading', 'listening', 'speaking', 'writing'] as const) {
      await database.activity.create({
        data: {
          lessonVersionId: lv1.id,
          slug: `act_v1_${skill}`,
          activityType: skill,
          learningBlock: 'activate',
          order: skill === 'reading' ? 1 : skill === 'listening' ? 2 : skill === 'speaking' ? 3 : 4,
          skills: [skill],
          contentReferences: [],
          languageBlockReferences: ['my-name-is'],
          payload: {},
        },
      });
    }

    await database.lessonVersion.update({
      where: { id: lv1.id },
      data: { status: 'ARCHIVED' },
    });

    const lv2 = await database.lessonVersion.create({
      data: {
        lessonId: lessonObj.id,
        version: 2,
        title: 'Version 2',
        status: 'DRAFT',
        sourceHash: 'hash-v2',
        parsedContent: {},
      },
    });
    lessonVersion2Id = lv2.id;

    for (const skill of ['reading', 'listening', 'speaking', 'writing'] as const) {
      await database.activity.create({
        data: {
          lessonVersionId: lv2.id,
          slug: `act_v2_${skill}`,
          activityType: skill,
          learningBlock: 'activate',
          order: skill === 'reading' ? 1 : skill === 'listening' ? 2 : skill === 'speaking' ? 3 : 4,
          skills: [skill],
          contentReferences: [],
          languageBlockReferences: ['my-name-is'],
          payload: {},
        },
      });
    }

    await database.lessonVersion.update({
      where: { id: lv2.id },
      data: { status: 'PUBLISHED' },
    });
  });

  afterAll(async () => {
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminDb.$disconnect();
  });

  async function createDummyAttempt(
    lessonVersionId: string,
    activityType: 'reading' | 'listening' | 'speaking' | 'writing',
    attemptLearnerId = learnerId,
    evaluationStatus: 'EVALUATED' | 'SUBMITTED' = 'EVALUATED',
  ) {
    const act = await database.activity.findFirstOrThrow({
      where: { lessonVersionId, activityType },
    });
    const session = await database.learningSession.create({
      data: {
        learnerId: attemptLearnerId,
        clientSessionId: randomUUID(),
        missionId: (await database.mission.findFirstOrThrow()).id,
        lessonVersionId,
        durationMinutes: 60,
        planSnapshot: { blocks: [] },
      },
    });
    const attempt = await database.activityAttempt.create({
      data: {
        learnerId: attemptLearnerId,
        sessionId: session.id,
        activityId: act.id,
        clientAttemptId: randomUUID(),
        rawResponse: {},
        evaluationStatus,
        score: evaluationStatus === 'EVALUATED' ? 1.0 : null,
      },
    });
    return { attempt, activity: act, session };
  }

  it('1. creates separate mastery records for all 4 skills on the same language block', async () => {
    const skills = ['reading', 'listening', 'speaking', 'writing'] as const;

    for (const skill of skills) {
      const { attempt } = await createDummyAttempt(lessonVersion1Id, skill);
      const results = await masteryService.recordAttemptEvaluation({
        attemptId: attempt.id,
        learnerId,
        lessonVersionId: lessonVersion1Id,
        skills: [skill],
        languageBlockSlugs: ['my-name-is'],
        score: 1.0,
        evaluationStatus: 'EVALUATED',
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.skill).toBe(skill);
      expect(results[0]!.languageBlockId).toBe(languageBlockId);
    }

    const records = await database.masteryRecord.findMany({
      where: { learnerId, languageBlockId },
    });
    expect(records).toHaveLength(4);
    const recordedSkills = records.map((r) => r.skill).sort();
    expect(recordedSkills).toEqual(['listening', 'reading', 'speaking', 'writing']);
  });

  it('does not award mastery for an unscored speaking submission', async () => {
    const pendingLearner = await database.user.create({
      data: {
        email: `pending_${randomUUID()}@example.test`,
        displayName: 'Pending Learner',
        passwordHash: 'dummy',
      },
    });
    const { attempt } = await createDummyAttempt(
      lessonVersion1Id,
      'speaking',
      pendingLearner.id,
      'SUBMITTED',
    );

    const results = await masteryService.recordAttemptEvaluation({
      attemptId: attempt.id,
      learnerId: pendingLearner.id,
      lessonVersionId: lessonVersion1Id,
      skills: ['speaking'],
      languageBlockSlugs: ['my-name-is'],
      score: null,
      evaluationStatus: 'SUBMITTED',
    });

    expect(results).toEqual([]);
    await expect(database.masteryEvent.count({ where: { attemptId: attempt.id } })).resolves.toBe(0);
    await expect(database.masteryRecord.count({ where: { learnerId: pendingLearner.id } })).resolves.toBe(0);
  });

  it('2. guarantees idempotency under concurrent retries for the same attempt', async () => {
    const retryLearner = await database.user.create({
      data: {
        email: `retry_${randomUUID()}@example.test`,
        displayName: 'Retry Learner',
        passwordHash: 'dummy',
      },
    });
    const { attempt } = await createDummyAttempt(lessonVersion1Id, 'reading', retryLearner.id);

    const concurrentCalls = Array.from({ length: 5 }).map(() =>
      masteryService.recordAttemptEvaluation({
        attemptId: attempt.id,
        learnerId: retryLearner.id,
        lessonVersionId: lessonVersion1Id,
        skills: ['reading'],
        languageBlockSlugs: ['my-name-is'],
        score: 1.0,
        evaluationStatus: 'EVALUATED',
      }),
    );

    await Promise.all(concurrentCalls);

    const events = await database.masteryEvent.findMany({
      where: { attemptId: attempt.id, skill: 'reading' },
    });
    expect(events).toHaveLength(1);
    const record = await database.masteryRecord.findUniqueOrThrow({
      where: {
        learnerId_languageBlockId_skill: {
          learnerId: retryLearner.id,
          languageBlockId,
          skill: 'reading',
        },
      },
    });
    expect(record.intervalDays).toBe(1);
  });

  it('serializes distinct concurrent attempts for one learner and block without losing progress', async () => {
    const concurrentLearner = await database.user.create({
      data: {
        email: `concurrent_${randomUUID()}@example.test`,
        displayName: 'Concurrent Learner',
        passwordHash: 'dummy',
      },
    });
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => createDummyAttempt(lessonVersion1Id, 'reading', concurrentLearner.id)),
    );

    await Promise.all(attempts.map(({ attempt }) => masteryService.recordAttemptEvaluation({
      attemptId: attempt.id,
      learnerId: concurrentLearner.id,
      lessonVersionId: lessonVersion1Id,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 1.0,
      evaluationStatus: 'EVALUATED',
    })));

    const events = await database.masteryEvent.findMany({
      where: { learnerId: concurrentLearner.id },
    });
    expect(events).toHaveLength(5);
    const record = await database.masteryRecord.findUniqueOrThrow({
      where: {
        learnerId_languageBlockId_skill: {
          learnerId: concurrentLearner.id,
          languageBlockId,
          skill: 'reading',
        },
      },
    });
    expect(record.intervalDays).toBe(28);
  });

  it('keeps mastery evidence append-only after an evaluated attempt', async () => {
    const { attempt } = await createDummyAttempt(lessonVersion1Id, 'reading');
    const [event] = await masteryService.recordAttemptEvaluation({
      attemptId: attempt.id,
      learnerId,
      lessonVersionId: lessonVersion1Id,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 1.0,
      evaluationStatus: 'EVALUATED',
    });
    expect(event).toBeDefined();

    await expect(database.masteryEvent.update({
      where: { id: event!.id },
      data: { score: 0 },
    })).rejects.toThrow();
    await expect(database.masteryEvent.delete({
      where: { id: event!.id },
    })).rejects.toThrow();
    await expect(database.masteryEvent.findUniqueOrThrow({
      where: { id: event!.id },
    })).resolves.toMatchObject({ score: 1.0 });
  });

  it('allows learner erasure to remove associated mastery evidence', async () => {
    const erasedLearner = await database.user.create({
      data: {
        email: `erase_${randomUUID()}@example.test`,
        displayName: 'Erased Learner',
        passwordHash: 'dummy',
      },
    });
    const { attempt } = await createDummyAttempt(lessonVersion1Id, 'reading', erasedLearner.id);
    await masteryService.recordAttemptEvaluation({
      attemptId: attempt.id,
      learnerId: erasedLearner.id,
      lessonVersionId: lessonVersion1Id,
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 1,
      evaluationStatus: 'EVALUATED',
    });

    await database.user.delete({ where: { id: erasedLearner.id } });
    await expect(database.masteryEvent.count({ where: { learnerId: erasedLearner.id } })).resolves.toBe(0);
  });

  it('3. preserves mastery record across lesson versions while tracing version evidence', async () => {
    const { attempt: attempt1 } = await createDummyAttempt(lessonVersion1Id, 'listening');
    await masteryService.recordAttemptEvaluation({
      attemptId: attempt1.id,
      learnerId,
      lessonVersionId: lessonVersion1Id,
      skills: ['listening'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.5,
      evaluationStatus: 'EVALUATED',
    });

    const recordAfterV1 = await database.masteryRecord.findUniqueOrThrow({
      where: {
        learnerId_languageBlockId_skill: {
          learnerId,
          languageBlockId,
          skill: 'listening',
        },
      },
    });
    expect(recordAfterV1.lastLessonVersionId).toBe(lessonVersion1Id);
    expect(recordAfterV1.state).toBe('NEEDS_ATTENTION');

    const { attempt: attempt2 } = await createDummyAttempt(lessonVersion2Id, 'listening');
    await masteryService.recordAttemptEvaluation({
      attemptId: attempt2.id,
      learnerId,
      lessonVersionId: lessonVersion2Id,
      skills: ['listening'],
      languageBlockSlugs: ['my-name-is'],
      score: 1.0,
      evaluationStatus: 'EVALUATED',
    });

    const recordAfterV2 = await database.masteryRecord.findUniqueOrThrow({
      where: {
        learnerId_languageBlockId_skill: {
          learnerId,
          languageBlockId,
          skill: 'listening',
        },
      },
    });
    expect(recordAfterV2.id).toBe(recordAfterV1.id);
    expect(recordAfterV2.lastLessonVersionId).toBe(lessonVersion2Id);
    expect(recordAfterV2.state).toBe('LEARNING');

    const event1 = await database.masteryEvent.findUniqueOrThrow({
      where: {
        attemptId_languageBlockId_skill: {
          attemptId: attempt1.id,
          languageBlockId,
          skill: 'listening',
        },
      },
    });
    const event2 = await database.masteryEvent.findUniqueOrThrow({
      where: {
        attemptId_languageBlockId_skill: {
          attemptId: attempt2.id,
          languageBlockId,
          skill: 'listening',
        },
      },
    });

    expect(event1.lessonVersionId).toBe(lessonVersion1Id);
    expect(event2.lessonVersionId).toBe(lessonVersion2Id);
  });

  it('4. performs time-travel review scheduling with injected clock', async () => {
    clock.setTime(new Date('2026-10-06T12:00:00Z'));

    const queueT0 = await masteryService.getReviewQueue(learnerId, {
      includeWeakUnscheduled: false,
    });
    const listeningItemT0 = queueT0.find((q) => q.skill === 'listening');
    expect(listeningItemT0).toBeUndefined();

    clock.advanceDays(4);

    const queueT4 = await masteryService.getReviewQueue(learnerId, {
      includeWeakUnscheduled: false,
    });
    const dueSkills = queueT4.map((q) => q.skill);
    expect(dueSkills.length).toBeGreaterThan(0);

    const listeningQueue = await masteryService.getReviewQueue(learnerId, {
      skill: 'listening',
    });
    expect(listeningQueue.every((q) => q.skill === 'listening')).toBe(true);
  });
});
