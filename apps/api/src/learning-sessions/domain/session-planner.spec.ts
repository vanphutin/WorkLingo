import { foundationMissionFixture } from '@worklingo/test-fixtures';
import { sessionPlanSchema } from '@worklingo/contracts';
import { describe, expect, it } from 'vitest';

import { lessonSnapshotSchema, type PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import { planFoundationSession } from './session-planner.js';

// Approved Task 5 seam: published curriculum -> pure, deterministic session plan.
function fixtureId(value: number): string {
  return `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`;
}

function createMission(): PublishedMission {
  const fixture = foundationMissionFixture;
  const snapshot = lessonSnapshotSchema.parse({
    ...fixture.lesson,
    contentBlocks: fixture.lesson.contentBlocks.map((block, index) => ({ ...block, id: fixtureId(index + 1) })),
    wordBanks: fixture.lesson.wordBanks.map((bank) => ({
      ...bank, id: fixtureId(10),
      languageBlocks: bank.languageBlocks.map((block, index) => ({ ...block, id: fixtureId(index + 20) })),
    })),
    activities: fixture.lesson.activities.map((activity, order) => ({ ...activity, order, id: fixtureId(order + 100) })),
  });
  return {
    id: fixtureId(200), slug: fixture.slug, title: fixture.title,
    objective: fixture.objective, levelCode: fixture.level.code,
    lessonVersion: { ...snapshot, id: fixtureId(201), version: 1 },
  };
}

describe('Foundation session planner', () => {
  it('plans four ordered fifteen-minute blocks covering all four skills', () => {
    const mission = createMission();
    const plan = planFoundationSession({ mission, durationMinutes: 60 });

    expect(plan.durationMinutes).toBe(60);
    expect(plan.missionId).toBe(fixtureId(200));
    expect(plan.lessonVersionId).toBe(fixtureId(201));
    expect(plan.blocks.map((block) => [block.type, block.order, block.targetMinutes])).toEqual([
      ['activate', 1, 15], ['readDecode', 2, 15], ['listenReason', 3, 15], ['respond', 4, 15],
    ]);
    expect(plan.blocks.map((block) => block.activityIds)).toEqual([
      [fixtureId(100)], [fixtureId(101)], [fixtureId(102)], [fixtureId(103), fixtureId(104)],
    ]);
    expect(new Set(plan.blocks.flatMap((block) => block.skills)))
      .toEqual(new Set(['reading', 'listening', 'speaking', 'writing']));
  });

  it('plans three ordered fifteen-minute blocks for a 45-minute session covering all four skills', () => {
    const mission = createMission();
    const plan = planFoundationSession({ mission, durationMinutes: 45 });

    expect(plan.durationMinutes).toBe(45);
    expect(plan.missionId).toBe(fixtureId(200));
    expect(plan.lessonVersionId).toBe(fixtureId(201));
    expect(plan.blocks.map((block) => [block.type, block.order, block.targetMinutes])).toEqual([
      ['readDecode', 1, 15], ['listenReason', 2, 15], ['respond', 3, 15],
    ]);
    expect(plan.blocks.map((block) => block.activityIds)).toEqual([
      [fixtureId(101)], [fixtureId(102)], [fixtureId(103), fixtureId(104)],
    ]);
    expect(new Set(plan.blocks.flatMap((block) => block.skills)))
      .toEqual(new Set(['reading', 'listening', 'speaking', 'writing']));
  });

  it.each([90, 120, 150])(
    'throws InsufficientContentForDurationError when requesting %s minutes with 5 activities, returning availableDurations [45, 60]',
    (durationMinutes) => {
      expect(() => planFoundationSession({ mission: createMission(), durationMinutes }))
        .toThrowError(expect.objectContaining({
          name: 'InsufficientContentForDurationError',
          code: 'INSUFFICIENT_CONTENT_FOR_DURATION',
          durationMinutes,
          availableDurations: [45, 60],
        }));
    },
  );

  it.each([0, -15, 30, 75, 60.5, Number.NaN])(
    'rejects unsupported duration %s with a typed duration error', (durationMinutes) => {
      expect(() => planFoundationSession({ mission: createMission(), durationMinutes }))
        .toThrowError(expect.objectContaining({
          name: 'UnsupportedSessionDurationError', code: 'UNSUPPORTED_SESSION_DURATION', durationMinutes,
        }));
    },
  );

  it.each(['reading', 'listening', 'speaking', 'writing'] as const)(
    'names the missing %s skill instead of returning a partial plan', (missingSkill) => {
      const mission = createMission();
      mission.lessonVersion.activities = mission.lessonVersion.activities
        .filter((activity) => !activity.skills.includes(missingSkill));
      expect(() => planFoundationSession({ mission, durationMinutes: 60 }))
        .toThrowError(expect.objectContaining({
          name: 'IncompleteSkillCoverageError', code: 'INCOMPLETE_SKILL_COVERAGE', missingSkills: [missingSkill],
        }));
    },
  );

  it('rejects duplicate activity IDs rather than planning the same exercise twice', () => {
    const mission = createMission();
    mission.lessonVersion.activities[4]!.id = mission.lessonVersion.activities[3]!.id;
    expect(() => planFoundationSession({ mission, durationMinutes: 60 }))
      .toThrowError(expect.objectContaining({ name: 'InvalidLessonPlanError', code: 'INVALID_LESSON_PLAN' }));
  });

  it('rejects an empty Activate block even when the remaining activities cover four skills', () => {
    const mission = createMission();
    mission.lessonVersion.activities = mission.lessonVersion.activities.filter((activity) => activity.learningBlock !== 'activate');
    expect(() => planFoundationSession({ mission, durationMinutes: 60 }))
      .toThrowError(expect.objectContaining({ name: 'InvalidLessonPlanError', code: 'INVALID_LESSON_PLAN' }));
  });

  it('does not silently drop activities assigned to an unknown learning block', () => {
    const mission = createMission();
    mission.lessonVersion.activities.push({
      ...mission.lessonVersion.activities[0]!, id: fixtureId(999),
      learningBlock: 'unknown' as 'activate', order: 5,
    });
    expect(() => planFoundationSession({ mission, durationMinutes: 60 }))
      .toThrowError(expect.objectContaining({ name: 'InvalidLessonPlanError', code: 'INVALID_LESSON_PLAN' }));
  });

  it('counts multiple skills on the same activity without requiring a separate activity for each', () => {
    const mission = createMission();
    mission.lessonVersion.activities[1]!.skills.push('speaking');
    mission.lessonVersion.activities = mission.lessonVersion.activities.filter((activity) => activity.activityType !== 'speaking');
    const plan = planFoundationSession({ mission, durationMinutes: 60 });
    expect(new Set(plan.blocks.flatMap((block) => block.skills)))
      .toEqual(new Set(['reading', 'listening', 'speaking', 'writing']));
    expect(plan.blocks[1]!.skills).toEqual(['reading', 'speaking']);
  });

  it('names all missing skills in canonical order', () => {
    const mission = createMission();
    mission.lessonVersion.activities = mission.lessonVersion.activities.filter((activity) => activity.activityType === 'writing');
    expect(() => planFoundationSession({ mission, durationMinutes: 60 }))
      .toThrowError(expect.objectContaining({ missingSkills: ['reading', 'listening', 'speaking'] }));
  });

  it('orders activities deterministically without changing the source snapshot', () => {
    const mission = createMission();
    const expected = planFoundationSession({ mission, durationMinutes: 60 });
    mission.lessonVersion.activities.reverse();
    const source = structuredClone(mission);
    expect(planFoundationSession({ mission, durationMinutes: 60 })).toEqual(expected);
    expect(planFoundationSession({ mission, durationMinutes: 60 })).toEqual(expected);
    expect(mission).toEqual(source);
  });

  it('returns a deeply frozen plan detached from the input snapshot', () => {
    const mission = createMission();
    const plan = planFoundationSession({ mission, durationMinutes: 60 });
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.blocks)).toBe(true);
    for (const block of plan.blocks) {
      expect(Object.isFrozen(block)).toBe(true);
      expect(Object.isFrozen(block.activityIds)).toBe(true);
      expect(Object.isFrozen(block.skills)).toBe(true);
    }
    mission.lessonVersion.activities[0]!.id = fixtureId(999);
    expect(plan.blocks[0]!.activityIds).toEqual([fixtureId(100)]);
    expect(() => Reflect.set(plan.blocks[0]!.activityIds, 0, fixtureId(999))).not.toThrow();
    expect(plan.blocks[0]!.activityIds).toEqual([fixtureId(100)]);
  });

  it('wraps invalid UUID references in the typed lesson error', () => {
    const mission = createMission();
    mission.lessonVersion.activities[0]!.id = 'invalid';
    expect(() => planFoundationSession({ mission, durationMinutes: 60 }))
      .toThrowError(expect.objectContaining({ name: 'InvalidLessonPlanError', code: 'INVALID_LESSON_PLAN' }));
  });

  it.each(['reordered blocks', 'duplicate IDs', 'missing skill'] as const)(
    'rejects a malformed shared contract with %s', (malformation) => {
      const plan = structuredClone(planFoundationSession({ mission: createMission(), durationMinutes: 60 }));
      if (malformation === 'reordered blocks') Reflect.set(plan, 'blocks', [...plan.blocks].reverse());
      if (malformation === 'duplicate IDs') Reflect.set(plan.blocks[1]!.activityIds, 0, plan.blocks[0]!.activityIds[0]);
      if (malformation === 'missing skill') Reflect.set(plan.blocks[2]!.skills, 0, 'reading');
      expect(sessionPlanSchema.safeParse(plan).success).toBe(false);
    },
  );

  it('plans 6 unique blocks ending in respond for 90 minutes when mission has sufficient activities', () => {
    const mission = createMission();
    // 90m canonical: ['activate', 'readDecode', 'listenReason', 'readDecode', 'listenReason', 'respond']
    // Needs at least 1 activate, 2 readDecode, 2 listenReason, 1 respond
    const base = mission.lessonVersion.activities;
    const extraRead = { ...base[1]!, id: fixtureId(401), slug: 'read-extra', order: 5 };
    const extraListen = { ...base[2]!, id: fixtureId(402), slug: 'listen-extra', order: 6 };
    mission.lessonVersion.activities = [base[0]!, base[1]!, base[2]!, extraRead, extraListen, base[3]!, base[4]!];

    const plan = planFoundationSession({ mission, durationMinutes: 90 });
    expect(plan.durationMinutes).toBe(90);
    expect(plan.blocks).toHaveLength(6);
    expect(plan.blocks.map((b) => [b.type, b.order, b.targetMinutes])).toEqual([
      ['activate', 1, 15],
      ['readDecode', 2, 15],
      ['listenReason', 3, 15],
      ['readDecode', 4, 15],
      ['listenReason', 5, 15],
      ['respond', 6, 15],
    ]);
    const allActivityIds = plan.blocks.flatMap((b) => b.activityIds);
    expect(new Set(allActivityIds).size).toBe(allActivityIds.length);
    expect(plan.blocks[5]!.type).toBe('respond');
    expect(new Set(plan.blocks.flatMap((b) => b.skills)))
      .toEqual(new Set(['reading', 'listening', 'speaking', 'writing']));
  });

  it('plans 8 unique blocks ending in respond for 120 minutes when mission has sufficient activities', () => {
    const mission = createMission();
    // 120m canonical: ['activate', 'readDecode', 'listenReason', 'respond', 'activate', 'readDecode', 'listenReason', 'respond']
    const base = mission.lessonVersion.activities;
    mission.lessonVersion.activities = [
      { ...base[0]!, id: fixtureId(501), slug: 'act-1', order: 0 },
      { ...base[1]!, id: fixtureId(502), slug: 'read-1', order: 1 },
      { ...base[2]!, id: fixtureId(503), slug: 'listen-1', order: 2 },
      { ...base[3]!, id: fixtureId(504), slug: 'resp-1', order: 3 },
      { ...base[0]!, id: fixtureId(505), slug: 'act-2', order: 4 },
      { ...base[1]!, id: fixtureId(506), slug: 'read-2', order: 5 },
      { ...base[2]!, id: fixtureId(507), slug: 'listen-2', order: 6 },
      { ...base[4]!, id: fixtureId(508), slug: 'resp-2', order: 7 },
    ];

    const plan = planFoundationSession({ mission, durationMinutes: 120 });
    expect(plan.durationMinutes).toBe(120);
    expect(plan.blocks).toHaveLength(8);
    expect(plan.blocks[7]!.type).toBe('respond');
    const allIds = plan.blocks.flatMap((b) => b.activityIds);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('plans 10 unique blocks ending in respond for 150 minutes when mission has sufficient activities', () => {
    const mission = createMission();
    const base = mission.lessonVersion.activities;
    // 150m canonical: ['activate', 'readDecode', 'listenReason', 'respond', 'activate', 'readDecode', 'listenReason', 'readDecode', 'listenReason', 'respond']
    mission.lessonVersion.activities = [
      { ...base[0]!, id: fixtureId(601), slug: 'act-1', order: 0 },
      { ...base[1]!, id: fixtureId(602), slug: 'read-1', order: 1 },
      { ...base[2]!, id: fixtureId(603), slug: 'listen-1', order: 2 },
      { ...base[3]!, id: fixtureId(604), slug: 'resp-1', order: 3 },
      { ...base[0]!, id: fixtureId(605), slug: 'act-2', order: 4 },
      { ...base[1]!, id: fixtureId(606), slug: 'read-2', order: 5 },
      { ...base[2]!, id: fixtureId(607), slug: 'listen-2', order: 6 },
      { ...base[1]!, id: fixtureId(608), slug: 'read-3', order: 7 },
      { ...base[2]!, id: fixtureId(609), slug: 'listen-3', order: 8 },
      { ...base[4]!, id: fixtureId(610), slug: 'resp-2', order: 9 },
    ];

    const plan = planFoundationSession({ mission, durationMinutes: 150 });
    expect(plan.durationMinutes).toBe(150);
    expect(plan.blocks).toHaveLength(10);
    expect(plan.blocks[9]!.type).toBe('respond');
    const allIds = plan.blocks.flatMap((b) => b.activityIds);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('prioritizes review candidates in block ordering and captures reviewItemIds in the plan snapshot', () => {
    const mission = createMission();
    // Language block in fixture: id fixtureId(20) has slug matching activity languageBlockReferences
    const targetLanguageBlock = mission.lessonVersion.wordBanks[0]!.languageBlocks[0]!;
    // The activate writing activity references this language block.
    const reviewItemId = fixtureId(777);

    const plan = planFoundationSession({
      mission,
      durationMinutes: 60,
      reviewItems: [
        {
          id: reviewItemId,
          languageBlockId: targetLanguageBlock.id,
          skill: 'writing',
          priorityReason: 'NEEDS_ATTENTION',
          priorityScore: 1100,
        },
      ],
    });

    expect(plan.reviewItemIds).toContain(reviewItemId);
  });

  it('traces only review records for skills actually practiced by matching activities', () => {
    const mission = createMission();
    const languageBlockId = mission.lessonVersion.wordBanks[0]!.languageBlocks[0]!.id;
    const listeningReviewId = fixtureId(778);
    const speakingReviewId = fixtureId(779);

    const plan = planFoundationSession({
      mission,
      durationMinutes: 45,
      reviewItems: [
        { id: listeningReviewId, languageBlockId, skill: 'listening', priorityScore: 1200 },
        { id: speakingReviewId, languageBlockId, skill: 'speaking', priorityScore: 1100 },
      ],
    });

    expect(plan.reviewItemIds).toEqual([speakingReviewId]);
  });

  it('places a due review activity before a newer activity in the same block', () => {
    const mission = createMission();
    const reviewedActivity = mission.lessonVersion.activities[1]!;
    const newerActivity = {
      ...reviewedActivity,
      id: fixtureId(780),
      slug: 'read-newer',
      order: -1,
      languageBlockReferences: ['nice-to-meet-you'],
    };
    mission.lessonVersion.activities.push(newerActivity);
    const languageBlockId = mission.lessonVersion.wordBanks[0]!.languageBlocks[3]!.id;

    const withoutReview = planFoundationSession({ mission, durationMinutes: 60 });
    const withReview = planFoundationSession({
      mission,
      durationMinutes: 60,
      reviewItems: [{
        id: fixtureId(781), languageBlockId, skill: 'reading', priorityScore: 1000,
      }],
    });

    expect(withoutReview.blocks[1]!.activityIds).toEqual([newerActivity.id, reviewedActivity.id]);
    expect(withReview.blocks[1]!.activityIds).toEqual([reviewedActivity.id, newerActivity.id]);
  });

  it('keeps NEEDS_ATTENTION ahead of an older OVERDUE item even when its score is lower', () => {
    const mission = createMission();
    const weakActivity = mission.lessonVersion.activities[1]!;
    const overdueActivity = {
      ...weakActivity,
      id: fixtureId(782),
      slug: 'read-overdue',
      order: 6,
      languageBlockReferences: ['nice-to-meet-you'],
    };
    mission.lessonVersion.activities.push(overdueActivity);
    const languageBlocks = mission.lessonVersion.wordBanks[0]!.languageBlocks;

    const plan = planFoundationSession({
      mission,
      durationMinutes: 60,
      reviewItems: [
        { id: fixtureId(783), languageBlockId: languageBlocks[3]!.id, skill: 'reading', priorityReason: 'NEEDS_ATTENTION', priorityScore: 1050 },
        { id: fixtureId(784), languageBlockId: languageBlocks[2]!.id, skill: 'reading', priorityReason: 'OVERDUE', priorityScore: 2000 },
      ],
    });

    expect(plan.blocks[1]!.activityIds).toEqual([weakActivity.id, overdueActivity.id]);
  });

  it('parses an existing 60-minute session plan snapshot with complete backward compatibility', () => {
    const legacyPlanSnapshot = {
      durationMinutes: 60,
      missionId: fixtureId(200),
      lessonVersionId: fixtureId(201),
      blocks: [
        { type: 'activate', order: 1, targetMinutes: 15, activityIds: [fixtureId(100)], skills: ['writing'] },
        { type: 'readDecode', order: 2, targetMinutes: 15, activityIds: [fixtureId(101)], skills: ['reading'] },
        { type: 'listenReason', order: 3, targetMinutes: 15, activityIds: [fixtureId(102)], skills: ['listening'] },
        { type: 'respond', order: 4, targetMinutes: 15, activityIds: [fixtureId(103), fixtureId(104)], skills: ['speaking', 'writing'] },
      ],
    };
    const parsed = sessionPlanSchema.safeParse(legacyPlanSnapshot);
    expect(parsed.success).toBe(true);
  });
});
