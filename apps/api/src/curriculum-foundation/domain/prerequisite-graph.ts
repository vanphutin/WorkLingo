export interface CurriculumGraphRevision {
  readonly id: string;
  readonly missionId: string;
  readonly programId: string;
  readonly status: 'PUBLISHED' | 'ARCHIVED';
  readonly prerequisiteMissionIds: readonly string[];
}

export class PrerequisiteGraphError extends Error {
  constructor(readonly code: 'CURRICULUM_GRAPH_INVALID' | 'CURRICULUM_GRAPH_TOO_LARGE', message: string) {
    super(message);
  }
}

export function validatePrerequisiteGraph(input: {
  readonly missionId: string;
  readonly programId: string;
  readonly prerequisiteRevisionIds: readonly string[];
  readonly revisions: readonly CurriculumGraphRevision[];
  readonly maxNodes?: number;
}): string[] {
  const maxNodes = input.maxNodes ?? 1000;
  if (input.revisions.length > maxNodes) {
    throw new PrerequisiteGraphError('CURRICULUM_GRAPH_TOO_LARGE', `Curriculum graph exceeds ${maxNodes} nodes`);
  }
  const byId = new Map(input.revisions.map((revision) => [revision.id, revision]));
  const selected = input.prerequisiteRevisionIds.map((id) => {
    const revision = byId.get(id);
    if (!revision || revision.status !== 'PUBLISHED') {
      throw new PrerequisiteGraphError('CURRICULUM_GRAPH_INVALID', `Prerequisite ${id} is not published`);
    }
    if (revision.programId !== input.programId) {
      throw new PrerequisiteGraphError('CURRICULUM_GRAPH_INVALID', 'Prerequisites must belong to the same program');
    }
    if (revision.missionId === input.missionId) {
      throw new PrerequisiteGraphError('CURRICULUM_GRAPH_INVALID', 'A mission cannot depend on itself');
    }
    return revision;
  });

  const edges = new Map<string, Set<string>>();
  for (const revision of input.revisions) {
    const current = edges.get(revision.missionId) ?? new Set<string>();
    revision.prerequisiteMissionIds.forEach((missionId) => current.add(missionId));
    edges.set(revision.missionId, current);
  }
  edges.set(input.missionId, new Set(selected.map((revision) => revision.missionId)));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (missionId: string): void => {
    if (visiting.has(missionId)) throw new PrerequisiteGraphError('CURRICULUM_GRAPH_INVALID', 'Curriculum prerequisites contain a cycle');
    if (visited.has(missionId)) return;
    visiting.add(missionId);
    for (const dependency of edges.get(missionId) ?? []) visit(dependency);
    visiting.delete(missionId);
    visited.add(missionId);
  };
  for (const missionId of edges.keys()) visit(missionId);
  return selected.map((revision) => revision.id);
}
