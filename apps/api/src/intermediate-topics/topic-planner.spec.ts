import { describe, it, expect } from 'vitest';
import { computeAvailableDurations, planFoundationSession } from '../learning-sessions/domain/session-planner.js';
import { topicMission } from './topic-test.fixture.js';
describe('Approved topic planner', () => {
  it('offers only the approved duration', () => { expect(computeAvailableDurations(topicMission())).toEqual([90]); });
  it('includes every activity exactly once and uses all approved allocations', () => {
    const mission = topicMission(); const plan = planFoundationSession({ mission, durationMinutes: 90 });
    expect(plan.kind).toBe('topic'); expect(plan.blocks.map(b => b.targetMinutes)).toEqual([10, 30, 20, 30]);
    expect(plan.blocks.flatMap(b => b.activityIds).sort()).toEqual(mission.lessonVersion.activities.map(a => a.id).sort());
  });
  it('generic planner cannot override approval duration', () => {
    expect(() => planFoundationSession({ mission: topicMission(), durationMinutes: 60 })).toThrow();
  });
});
