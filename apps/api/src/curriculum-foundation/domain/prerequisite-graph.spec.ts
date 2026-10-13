import { describe, expect, it } from 'vitest';
import { validatePrerequisiteGraph } from './prerequisite-graph.js';

const revision = (id: string, missionId: string, programId = 'program-a', status: 'PUBLISHED' | 'ARCHIVED' = 'PUBLISHED', prerequisites: string[] = []) =>
  ({ id, missionId, programId, status, prerequisiteMissionIds: prerequisites });

describe('validatePrerequisiteGraph', () => {
  it.each([
    ['self link', 'mission-a', ['revision-a'], [revision('revision-a', 'mission-a')]],
    ['foreign program', 'mission-a', ['revision-b'], [revision('revision-b', 'mission-b', 'program-b')]],
    ['archived dependency', 'mission-a', ['revision-b'], [revision('revision-b', 'mission-b', 'program-a', 'ARCHIVED')]],
    ['cycle through another mission', 'mission-a', ['revision-b'], [revision('revision-b', 'mission-b', 'program-a', 'PUBLISHED', ['mission-a'])]],
  ] as const)('rejects %s', (_label, missionId, prerequisiteIds, revisions) => {
    expect(() => validatePrerequisiteGraph({
      missionId, programId: 'program-a', prerequisiteRevisionIds: prerequisiteIds, revisions,
    })).toThrow();
  });

  it('accepts a bounded acyclic same-program graph', () => {
    expect(validatePrerequisiteGraph({
      missionId: 'mission-c', programId: 'program-a', prerequisiteRevisionIds: ['revision-b'],
      revisions: [revision('revision-a', 'mission-a'), revision('revision-b', 'mission-b', 'program-a', 'PUBLISHED', ['mission-a'])],
    })).toEqual(['revision-b']);
  });

  it('rejects graphs over the traversal limit instead of truncating them', () => {
    const revisions = Array.from({ length: 1001 }, (_, index) => revision(`revision-${index}`, `mission-${index}`));
    expect(() => validatePrerequisiteGraph({ missionId: 'new', programId: 'program-a', prerequisiteRevisionIds: [], revisions })).toThrow(/1000/u);
  });
});
