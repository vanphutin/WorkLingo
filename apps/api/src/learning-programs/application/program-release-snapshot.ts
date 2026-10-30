import { UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { curriculumDefinitionInputSchema, programVersionInputSchema, type ProgramPolicy, type ProgramVersionInput } from '@worklingo/contracts';
import { lessonSnapshotSchema } from '../../curriculum/domain/curriculum.types.js';
import { requireVocabularySenses } from '../../vocabulary/vocabulary-library.service.js';

export const defaultProgramPolicy: ProgramPolicy = { version: 1, sequential: { stages: true, units: true, lessons: true }, completion: { requiredActivityRatio: 1 }, mastery: { required: false, threshold: 0.8, minimumQualifiedAttempts: 1 }, retry: { maxAttempts: 3, cooldownMinutes: 0 }, remediation: { enabled: true, afterAttempts: 2 }, review: { scheduleVersion: 'program-review-v1', intervalsDays: [1, 7, 30], requiredForReadiness: false } };
const fail = (): never => { throw new UnprocessableEntityException('PROGRAM_CURRICULUM_INVALID'); };
const same = (left: readonly unknown[], right: readonly unknown[]) => JSON.stringify(left) === JSON.stringify(right);
async function sourceRows(tx: Prisma.TransactionClient, ids: string[]) {
  await tx.$queryRaw`SELECT "id" FROM "CurriculumRevision" WHERE "id"=ANY(${ids}::uuid[]) ORDER BY "id" FOR SHARE`;
  await tx.$executeRaw`LOCK TABLE "CurriculumPrerequisite", "CurriculumRevisionLesson", "LearningPath", "Lesson", "LessonVersion", "Level", "Mission", "MissionLesson", "Activity" IN SHARE MODE`;
  return tx.curriculumRevision.findMany({ where: { id: { in: ids } }, include: { mission: { include: { level: { include: { path: true } } } }, prerequisites: true, lessons: { orderBy: { order: 'asc' }, include: { lessonVersion: { include: { activities: { orderBy: { order: 'asc' } }, lesson: { include: { missions: true } } } } } } } });
}
export async function captureProgramSnapshot(tx: Prisma.TransactionClient, programId: string, ids: string[], validate = true): Promise<ProgramVersionInput> {
  const program = await tx.learningProgram.findUniqueOrThrow({ where: { id: programId } });
  const rows = await sourceRows(tx, ids);
  if (!ids.length || rows.length !== ids.length) fail();
  const bindings = ids.map((id, index) => {
    const row = rows.find(item => item.id === id)!;
    const definition = curriculumDefinitionInputSchema.safeParse(row.snapshot);
    if (!definition.success) return fail();
    return { curriculumRevisionId: id, pathId: row.mission.level.pathId, levelId: row.mission.levelId, missionId: row.missionId, order: index + 1, title: row.mission.title, objectives: definition.data.objectives.map(item => item.statement), required: true, prerequisiteRevisionIds: definition.data.prerequisiteRevisionIds, lessons: row.lessons.map((pin, lessonIndex) => {
      const lesson = lessonSnapshotSchema.safeParse(pin.lessonVersion.parsedContent);
      if (!lesson.success) return fail();
      return { lessonVersionId: pin.lessonVersionId, order: lessonIndex + 1, title: lesson.data.title, objectives: definition.data.objectives.filter(item => item.evidence.some(evidence => evidence.lessonVersionId === pin.lessonVersionId)).map(item => item.statement), estimatedMinutes: 45, difficulty: program.proficiencyLabel, activityIds: lesson.data.activities.map(item => item.id), vocabularyRefs: [], resourceRefs: [] };
    }) };
  });
  const snapshot = { title: program.name, description: program.description, objectives: bindings.flatMap(binding => binding.objectives), estimatedMinutes: bindings.reduce((sum, binding) => sum + binding.lessons.reduce((minutes, lesson) => minutes + lesson.estimatedMinutes, 0), 0), difficulty: program.proficiencyLabel, proficiencyLabel: program.proficiencyLabel, supportedLanguages: ['en'], audiences: ['adult'], policy: defaultProgramPolicy, curriculumBindings: bindings };
  return validate ? validateProgramSnapshot(tx, programId, snapshot) : snapshot;
}
export async function validateProgramSnapshot(tx: Prisma.TransactionClient, programId: string, raw: unknown): Promise<ProgramVersionInput> {
  const parsed = programVersionInputSchema.safeParse(raw);
  if (!parsed.success) return fail();
  const content = parsed.data;
  if (!content.objectives.length || !content.curriculumBindings.some(binding => binding.required)) fail();
  const rows = await sourceRows(tx, content.curriculumBindings.map(binding => binding.curriculumRevisionId));
  if (rows.length !== content.curriculumBindings.length) fail();
  const missions = new Set<string>();
  for (const binding of content.curriculumBindings) {
    const row = rows.find(item => item.id === binding.curriculumRevisionId);
    if (!row || row.status !== 'PUBLISHED' || row.mission.status !== 'PUBLISHED' || row.mission.purpose !== 'LEARNING' || row.mission.level.status !== 'PUBLISHED' || row.mission.level.path.status !== 'PUBLISHED' || row.mission.level.path.programId !== programId || row.missionId !== binding.missionId || row.mission.levelId !== binding.levelId || row.mission.level.pathId !== binding.pathId || missions.has(row.missionId)) return fail();
    missions.add(row.missionId);
    const definition = curriculumDefinitionInputSchema.safeParse(row.snapshot);
    if (!definition.success || !definition.data.objectives.some(objective => objective.required)) return fail();
    if (binding.title !== row.mission.title || !same(binding.objectives, definition.data.objectives.map(item => item.statement)) || !same([...binding.prerequisiteRevisionIds].sort(), row.prerequisites.map(item => item.prerequisiteRevisionId).sort()) || !same([...binding.prerequisiteRevisionIds].sort(), [...definition.data.prerequisiteRevisionIds].sort())) fail();
    if (binding.lessons.length !== row.lessons.length) fail();
    const snapshots = new Map<string, ReturnType<typeof lessonSnapshotSchema.parse>>();
    for (const [index, lesson] of binding.lessons.entries()) {
      const pin = row.lessons[index];
      if (!pin || pin.lessonVersionId !== lesson.lessonVersionId || pin.lessonVersion.status !== 'PUBLISHED' || !pin.lessonVersion.lesson.missions.some(membership => membership.missionId === row.missionId)) return fail();
      const snapshot = lessonSnapshotSchema.safeParse(pin.lessonVersion.parsedContent);
      if (!snapshot.success || snapshot.data.formatVersion === 'WorkLingoLesson/1.2') return fail();
      snapshots.set(pin.lessonVersionId, snapshot.data);
      const objectives = definition.data.objectives.filter(item => item.evidence.some(evidence => evidence.lessonVersionId === pin.lessonVersionId)).map(item => item.statement);
      if (lesson.title !== snapshot.data.title || !same(lesson.objectives, objectives) || !same(lesson.activityIds, snapshot.data.activities.map(item => item.id)) || !same(lesson.activityIds, pin.lessonVersion.activities.map(item => item.id))) fail();
      for (const resource of lesson.resourceRefs) if (resource.url && !['https:', 'http:'].includes(new URL(resource.url).protocol)) fail();
      const senses = await requireVocabularySenses(tx, lesson.vocabularyRefs.map(ref => ref.senseId));
      if (lesson.vocabularyRefs.some(ref => !senses.some(sense => sense.id === ref.senseId && sense.lexicalEntryId === ref.lexicalEntryId))) fail();
    }
    for (const objective of definition.data.objectives) {
      for (const evidence of objective.evidence) {
        const activity = snapshots.get(evidence.lessonVersionId)?.activities.find(item => item.slug === evidence.activitySlug);
        if (!activity || evidence.languageBlockSlugs.some(slug => !activity.languageBlockReferences.includes(slug))) return fail();
      }
      if (objective.required) for (const skill of objective.skills) if (!objective.evidence.some(evidence => snapshots.get(evidence.lessonVersionId)?.activities.some(activity => activity.slug === evidence.activitySlug && activity.skills.includes(skill)))) fail();
    }
  }
  return content;
}
