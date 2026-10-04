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

  it.each([45, 90, 120, 150, 0, -15, 60.5, Number.NaN])(
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
});
