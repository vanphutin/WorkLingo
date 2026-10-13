import { UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CurriculumDefinitionInput } from '@worklingo/contracts';
import { PrerequisiteGraphError, validatePrerequisiteGraph } from '../domain/prerequisite-graph.js';

export interface FoundationIssue { code: string; path: string; message: string }
export function invalid(issues: FoundationIssue[]): never {
  throw new UnprocessableEntityException({ code: 'INVALID_CURRICULUM_DEFINITION', message: 'Curriculum definition is not publishable', issues });
}

export async function validateFoundationDefinition(tx: Prisma.TransactionClient, missionId: string, programId: string, definition: CurriculumDefinitionInput): Promise<string[]> {
  const revisions = await tx.curriculumRevision.findMany({
    where: { mission: { level: { path: { programId } } }, status: 'PUBLISHED' }, take: 1001,
    include: { prerequisites: { include: { prerequisiteRevision: { select: { missionId: true } } } } },
  });
  try {
    validatePrerequisiteGraph({ missionId, programId, prerequisiteRevisionIds: definition.prerequisiteRevisionIds,
      revisions: revisions.map((revision) => ({ id: revision.id, missionId: revision.missionId, programId,
        status: 'PUBLISHED' as const, prerequisiteMissionIds: revision.prerequisites.map((edge) => edge.prerequisiteRevision.missionId) })),
    });
  } catch (error) {
    if (error instanceof PrerequisiteGraphError) invalid([{ code: error.code, path: 'prerequisiteRevisionIds', message: error.message }]);
    throw error;
  }
  const versionIds = [...new Set(definition.objectives.flatMap((objective) => objective.evidence.map((evidence) => evidence.lessonVersionId)))];
  // Prevent concurrent archive/update while validating and publishing the pinned versions.
  for (const id of [...versionIds].sort()) await tx.$queryRaw`SELECT "id" FROM "LessonVersion" WHERE "id"=${id}::uuid FOR SHARE`;
  const versions = await tx.lessonVersion.findMany({
    where: { id: { in: versionIds }, status: 'PUBLISHED', lesson: { missions: { some: { missionId } } } },
    include: { activities: true },
  });
  const issues: FoundationIssue[] = [];
  definition.objectives.forEach((objective, index) => {
    const evidencedSkills = new Set<string>();
    objective.evidence.forEach((evidence, evidenceIndex) => {
      const version = versions.find((candidate) => candidate.id === evidence.lessonVersionId);
      const activity = version?.activities.find((candidate) => candidate.slug === evidence.activitySlug);
      if (!activity || evidence.languageBlockSlugs.some((slug) => !activity.languageBlockReferences.includes(slug))) {
        issues.push({ code: 'INVALID_EVIDENCE', path: `objectives.${index}.evidence.${evidenceIndex}`, message: 'Evidence must reference an activity and Language Blocks in an attached published lesson version' });
      }
      activity?.skills.forEach((skill) => evidencedSkills.add(skill));
    });
    if (objective.skills.some((skill) => !evidencedSkills.has(skill))) issues.push({
      code: 'OBJECTIVE_SKILL_UNASSESSED', path: `objectives.${index}.skills`, message: 'Objective skills must be covered by their activity evidence',
    });
  });
  if (!definition.objectives.some((objective) => objective.required)) issues.push({ code: 'REQUIRED_OBJECTIVE_MISSING', path: 'objectives', message: 'At least one objective must be required' });
  if (issues.length) invalid(issues);
  return versionIds;
}
