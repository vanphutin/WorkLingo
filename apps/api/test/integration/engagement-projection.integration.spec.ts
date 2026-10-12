import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';
import { StudyDayProjectorService } from '../../src/engagement/application/study-day-projector.service.js';

describe('Engagement study day and session projection integration', () => {
  let context: LearningSessionTestContext;
  let projector: StudyDayProjectorService;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('engagement_proj_test');
    projector = context.app.get(StudyDayProjectorService);
  }, 45_000);

  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('projects an ordinary completed learning session into study day and active engagement week', async () => {
    await registerLearner(context.app, {
      displayName: 'Projection Learner',
      email: 'proj@example.test',
    });

    const user = await context.database.user.findUniqueOrThrow({
      where: { email: 'proj@example.test' },
      include: { profile: true },
    });

    // 1. Create and complete a learning session via projector
    const mission = await context.database.mission.findFirstOrThrow({
      where: { purpose: 'LEARNING', status: 'PUBLISHED' },
      include: { lessons: { include: { lesson: true }, take: 1 } },
    });
    const lessonVersionId = mission.lessons[0]!.lesson.currentPublishedVersionId!;

    const session = await context.database.learningSession.create({
      data: {
        clientSessionId: randomUUID(),
        durationMinutes: 45,
        learnerId: user.id,
        lessonVersionId,
        missionId: mission.id,
        planSnapshot: {},
        status: 'COMPLETED',
        completedAt: new Date('2026-10-12T03:00:00Z'), // Monday 10:00 AM VN
      },
    });

    await context.database.$transaction(async (tx) => {
      await projector.recordCompletion(tx, {
        completedAt: session.completedAt!,
        learnerId: user.id,
        purpose: 'learning',
        sessionId: session.id,
        timezone: 'Asia/Ho_Chi_Minh',
      });
    });

    // 2. Verify LearnerStudyDay
    const studyDay = await context.database.learnerStudyDay.findUniqueOrThrow({
      where: {
        learnerId_dateKey: {
          dateKey: '2026-10-12',
          learnerId: user.id,
        },
      },
    });
    expect(studyDay.completedSessionCount).toBe(1);
    expect(studyDay.timezone).toBe('Asia/Ho_Chi_Minh');

    // 3. Verify LearnerStudySession
    const studySession = await context.database.learnerStudySession.findUniqueOrThrow({
      where: { sessionId: session.id },
    });
    expect(studySession.studyDayId).toBe(studyDay.id);
    expect(studySession.learnerId).toBe(user.id);

    // 4. Verify LearnerEngagementWeek
    const week = await context.database.learnerEngagementWeek.findUniqueOrThrow({
      where: {
        learnerId_weekStartKey: {
          learnerId: user.id,
          weekStartKey: '2026-10-12',
        },
      },
    });
    expect(week.status).toBe('ACTIVE');
    expect(week.targetDays).toBe(3);
    expect(week.metAt).toBeNull();
  });

  it('is completely idempotent when session completion is replayed', async () => {
    await registerLearner(context.app, {
      displayName: 'Idempotent Learner',
      email: 'idemp@example.test',
    });
    const user = await context.database.user.findUniqueOrThrow({ where: { email: 'idemp@example.test' } });
    const mission = await context.database.mission.findFirstOrThrow({ where: { purpose: 'LEARNING' } });

    const session = await context.database.learningSession.create({
      data: {
        clientSessionId: randomUUID(),
        durationMinutes: 45,
        learnerId: user.id,
        lessonVersionId: (await context.database.lessonVersion.findFirstOrThrow()).id,
        missionId: mission.id,
        planSnapshot: {},
        status: 'COMPLETED',
        completedAt: new Date('2026-10-12T03:00:00Z'),
      },
    });

    const completionInput = {
      completedAt: session.completedAt!,
      learnerId: user.id,
      purpose: 'learning' as const,
      sessionId: session.id,
      timezone: 'Asia/Ho_Chi_Minh',
    };

    // First call
    await context.database.$transaction(async (tx) => projector.recordCompletion(tx, completionInput));
    // Second replay call
    await context.database.$transaction(async (tx) => projector.recordCompletion(tx, completionInput));

    const studyDay = await context.database.learnerStudyDay.findUniqueOrThrow({
      where: { learnerId_dateKey: { dateKey: '2026-10-12', learnerId: user.id } },
    });
    expect(studyDay.completedSessionCount).toBe(1);

    const sessionRows = await context.database.learnerStudySession.findMany({
      where: { sessionId: session.id },
    });
    expect(sessionRows).toHaveLength(1);
  });

  it('aggregates multiple sessions on the same local date into one study day', async () => {
    await registerLearner(context.app, {
      displayName: 'Multi-session Learner',
      email: 'multi@example.test',
    });
    const user = await context.database.user.findUniqueOrThrow({ where: { email: 'multi@example.test' } });
    const lessonVersionId = (await context.database.lessonVersion.findFirstOrThrow()).id;
    const mission = await context.database.mission.findFirstOrThrow({ where: { purpose: 'LEARNING' } });

    const session1 = await context.database.learningSession.create({
      data: {
        clientSessionId: randomUUID(),
        durationMinutes: 45,
        learnerId: user.id,
        lessonVersionId,
        missionId: mission.id,
        planSnapshot: {},
        status: 'COMPLETED',
        completedAt: new Date('2026-10-12T02:00:00Z'),
      },
    });
    const session2 = await context.database.learningSession.create({
      data: {
        clientSessionId: randomUUID(),
        durationMinutes: 45,
        learnerId: user.id,
        lessonVersionId,
        missionId: mission.id,
        planSnapshot: {},
        status: 'COMPLETED',
        completedAt: new Date('2026-10-12T08:00:00Z'),
      },
    });

    await context.database.$transaction(async (tx) => {
      await projector.recordCompletion(tx, {
        completedAt: session1.completedAt!,
        learnerId: user.id,
        purpose: 'learning',
        sessionId: session1.id,
      });
      await projector.recordCompletion(tx, {
        completedAt: session2.completedAt!,
        learnerId: user.id,
        purpose: 'learning',
        sessionId: session2.id,
      });
    });

    const days = await context.database.learnerStudyDay.findMany({
      where: { learnerId: user.id },
    });
    expect(days).toHaveLength(1);
    expect(days[0]!.dateKey).toBe('2026-10-12');
    expect(days[0]!.completedSessionCount).toBe(2);
  });

  it('strictly ignores placement session completion', async () => {
    await registerLearner(context.app, {
      displayName: 'Placement Learner',
      email: 'placement-test@example.test',
    });
    const user = await context.database.user.findUniqueOrThrow({ where: { email: 'placement-test@example.test' } });
    const lessonVersionId = (await context.database.lessonVersion.findFirstOrThrow()).id;
    const mission = await context.database.mission.findFirstOrThrow();

    const placementSession = await context.database.learningSession.create({
      data: {
        clientSessionId: randomUUID(),
        durationMinutes: 45,
        learnerId: user.id,
        lessonVersionId,
        missionId: mission.id,
        planSnapshot: {},
        status: 'COMPLETED',
        completedAt: new Date('2026-10-12T02:00:00Z'),
      },
    });

    await context.database.$transaction(async (tx) => {
      await projector.recordCompletion(tx, {
        completedAt: placementSession.completedAt!,
        learnerId: user.id,
        purpose: 'placement',
        sessionId: placementSession.id,
      });
    });

    const days = await context.database.learnerStudyDay.findMany({ where: { learnerId: user.id } });
    const weeks = await context.database.learnerEngagementWeek.findMany({ where: { learnerId: user.id } });
    expect(days).toHaveLength(0);
    expect(weeks).toHaveLength(0);
  });

  it('transitions week status to MET once distinct study days reach target', async () => {
    await registerLearner(context.app, {
      displayName: 'Streak Met Learner',
      email: 'streak-met@example.test',
    });
    const user = await context.database.user.findUniqueOrThrow({ where: { email: 'streak-met@example.test' } });
    const lessonVersionId = (await context.database.lessonVersion.findFirstOrThrow()).id;
    const mission = await context.database.mission.findFirstOrThrow({ where: { purpose: 'LEARNING' } });

    // Target is 3 days. Complete day 1 (Oct 12), day 2 (Oct 13), day 3 (Oct 14)
    const dates = ['2026-10-12T02:00:00Z', '2026-10-13T02:00:00Z', '2026-10-14T02:00:00Z'];
    for (const d of dates) {
      const sess = await context.database.learningSession.create({
        data: {
          clientSessionId: randomUUID(),
          durationMinutes: 45,
          learnerId: user.id,
          lessonVersionId,
          missionId: mission.id,
          planSnapshot: {},
          status: 'COMPLETED',
          completedAt: new Date(d),
        },
      });
      await context.database.$transaction(async (tx) => {
        await projector.recordCompletion(tx, {
          completedAt: sess.completedAt!,
          learnerId: user.id,
          purpose: 'learning',
          sessionId: sess.id,
        });
      });
    }

    const week = await context.database.learnerEngagementWeek.findUniqueOrThrow({
      where: { learnerId_weekStartKey: { learnerId: user.id, weekStartKey: '2026-10-12' } },
    });
    expect(week.status).toBe('MET');
    expect(week.metAt).toBeDefined();
  });
});
