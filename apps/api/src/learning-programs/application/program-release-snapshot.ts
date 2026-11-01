import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { curriculumDefinitionInputSchema, vocabularyCefrSchema, learningProgramIconKeySchema, programVersionInputSchema, type ProgramPolicy, type ProgramVersionInput, type ProgramLessonSnapshot } from '@worklingo/contracts';
import { lessonSnapshotSchema } from '../../curriculum/domain/curriculum.types.js';
import { requireVocabularySenses } from '../../vocabulary/vocabulary-library.service.js';
import { programLessonCanComplete } from '../domain/program-session-durations.js';

export const defaultProgramPolicy: ProgramPolicy = { version: 1, sequential: { stages: true, units: true, lessons: true }, completion: { requiredActivityRatio: 1 }, mastery: { required: false, threshold: 0.8, minimumQualifiedAttempts: 1 }, retry: { maxAttempts: 3, cooldownMinutes: 0 }, remediation: { enabled: true, afterAttempts: 2 }, review: { scheduleVersion: 'program-review-v1', intervalsDays: [1, 7, 30], requiredForReadiness: false } };
const fail = (): never => { throw new UnprocessableEntityException('PROGRAM_CURRICULUM_INVALID'); };
const same = (left: readonly unknown[], right: readonly unknown[]) => JSON.stringify(left) === JSON.stringify(right);
/** Canonical release attribution; caller-supplied provenance is always replaced. */
async function resolveProgramVocabularyReferences(tx: Prisma.TransactionClient, refs: ProgramLessonSnapshot['vocabularyRefs']): Promise<ProgramLessonSnapshot['vocabularyRefs']> {
  const senses = await requireVocabularySenses(tx, refs.map(ref => ref.senseId));
  if (refs.some(ref => !senses.some(sense => sense.id === ref.senseId && sense.lexicalEntryId === ref.lexicalEntryId))) fail();
  if (!senses.length) return [];
  const [sources, associations] = await Promise.all([
    tx.vocabularySource.findMany({ where: { id: { in: senses.map(sense => sense.sourceId!) } } }),
    tx.lexicalCefrAssociation.findMany({ where: { lexicalEntryId: { in: senses.map(sense => sense.lexicalEntryId) }, OR: [{ senseId: null }, { senseId: { in: senses.map(sense => sense.id) } }] }, orderBy: [{ cefrLevel: 'asc' }, { sourceEntryId: 'asc' }] }),
  ]);
  return refs.map(ref => {
    const sense = senses.find(sense => sense.id === ref.senseId)!;
    const source = sources.find(source => source.id === sense.sourceId)!;
    return { lexicalEntryId: ref.lexicalEntryId, senseId: ref.senseId, provenance: {
      sourceId: source.id, rightsBasis: sense.rightsBasis, permissionReference: source.permissionReference!, attributionRequirements: source.attributionRequirements,
      cefrAssociations: associations.filter(association => (association.senseId === null || association.senseId === sense.id) && association.lexicalEntryId === sense.lexicalEntryId).map(association => ({ cefrLevel: vocabularyCefrSchema.parse(association.cefrLevel), sourceEntryId: association.sourceEntryId })),
    } };
  });
}

async function sourceRows(tx: Prisma.TransactionClient, ids: string[]) {
  await tx.$queryRaw`SELECT "id" FROM "CurriculumRevision" WHERE "id"=ANY(${ids}::uuid[]) ORDER BY "id" FOR SHARE`;
  await tx.$executeRaw`LOCK TABLE "CurriculumPrerequisite", "CurriculumRevisionLesson", "LearningPath", "Lesson", "LessonVersion", "Level", "Mission", "MissionLesson", "Activity" IN SHARE MODE`;
  return tx.curriculumRevision.findMany({ where: { id: { in: ids } }, include: { mission: { include: { level: { include: { path: true } } } }, prerequisites: true, lessons: { orderBy: { order: 'asc' }, include: { lessonVersion: { include: { activities: { orderBy: { order: 'asc' } }, lesson: { include: { missions: true } } } } } } } });
}
export async function captureProgramSnapshot(tx: Prisma.TransactionClient, programId: string, ids: string[], validate = true): Promise<ProgramVersionInput> {
  const program = await tx.learningProgram.findUniqueOrThrow({ where: { id: programId } });
  const rows = await sourceRows(tx, ids);
  if (!ids.length || rows.length !== ids.length) fail();
  const bindings: ProgramVersionInput['curriculumBindings'] = ids.map((id, index) => {
    const row = rows.find(item => item.id === id)!;
    const definition = curriculumDefinitionInputSchema.safeParse(row.snapshot);
    if (!definition.success) return fail();
    return { curriculumRevisionId: id, pathId: row.mission.level.pathId, levelId: row.mission.levelId, missionId: row.missionId, pathTitle: row.mission.level.path.name, levelTitle: row.mission.level.name, order: index + 1, title: row.mission.title, objectives: definition.data.objectives.map(item => item.statement), required: true, prerequisiteRevisionIds: definition.data.prerequisiteRevisionIds, lessons: row.lessons.map((pin, lessonIndex) => {
      const lesson = lessonSnapshotSchema.safeParse(pin.lessonVersion.parsedContent);
      if (!lesson.success) return fail();
      return { lessonVersionId: pin.lessonVersionId, order: lessonIndex + 1, title: lesson.data.title, objectives: definition.data.objectives.filter(item => item.evidence.some(evidence => evidence.lessonVersionId === pin.lessonVersionId)).map(item => item.statement), estimatedMinutes: 45, difficulty: program.proficiencyLabel, activityIds: lesson.data.activities.map(item => item.id), vocabularyRefs: [], resourceRefs: [] };
    }) };
  });
  // Reuse published library bindings on any existing curriculum target. Each
  // lesson selection is capped before rows leave SQL; never read the inventory.
  const targets = bindings.flatMap(binding => binding.lessons.map(lesson => ({ programId, curriculumRevisionId: binding.curriculumRevisionId, pathId: binding.pathId, levelId: binding.levelId, missionId: binding.missionId, lessonVersionId: lesson.lessonVersionId })));
  const vocabulary = await tx.$queryRaw<{ curriculumRevisionId: string; lessonVersionId: string; refs: { lexicalEntryId: string; senseId: string }[] }[]>(Prisma.sql`
    SELECT target->>'curriculumRevisionId' AS "curriculumRevisionId",target->>'lessonVersionId' AS "lessonVersionId",COALESCE(jsonb_agg(jsonb_build_object('lexicalEntryId',v."lexicalEntryId",'senseId',v."senseId") ORDER BY v."lexicalEntryId",v."senseId") FILTER(WHERE v."senseId" IS NOT NULL),'[]'::jsonb) AS refs
    FROM jsonb_array_elements(${JSON.stringify(targets)}::jsonb) target LEFT JOIN LATERAL (
      SELECT DISTINCT m."lexicalEntryId",m."senseId" FROM "VocabularyCurriculumBinding" b
      JOIN "VocabularyCollectionVersion" cv ON cv.id=b."collectionVersionId" AND cv.status='PUBLISHED'
      JOIN "VocabularyCollectionMember" m ON m."collectionVersionId"=cv.id
      WHERE b."programId"=(target->>'programId')::uuid OR b."pathId"=(target->>'pathId')::uuid OR b."levelId"=(target->>'levelId')::uuid
        OR b."missionId"=(target->>'missionId')::uuid OR b."lessonVersionId"=(target->>'lessonVersionId')::uuid
        OR b."wordBankVersionId" IN (SELECT "wordBankVersionId" FROM "LessonVersionWordBank" WHERE "lessonVersionId"=(target->>'lessonVersionId')::uuid)
      ORDER BY m."lexicalEntryId",m."senseId" LIMIT 1001
    ) v ON true GROUP BY target->>'curriculumRevisionId',target->>'lessonVersionId'`);
  if (vocabulary.some(row => row.refs.length > 1000)) throw new UnprocessableEntityException('PROGRAM_VOCABULARY_SELECTION_TOO_LARGE');
  const refs = [...new Map(vocabulary.flatMap(row => row.refs).map(ref => [ref.senseId, ref])).values()];
  const resolved = await resolveProgramVocabularyReferences(tx, refs);
  for (const binding of bindings) for (const lesson of binding.lessons) {
    lesson.vocabularyRefs = (vocabulary.find(row => row.curriculumRevisionId === binding.curriculumRevisionId && row.lessonVersionId === lesson.lessonVersionId)?.refs ?? []).map(ref => resolved.find(item => item.senseId === ref.senseId)!);
  }
  const snapshot = { title: program.name, description: program.description, objectives: bindings.flatMap(binding => binding.objectives), estimatedMinutes: bindings.reduce((sum, binding) => sum + binding.lessons.reduce((minutes, lesson) => minutes + lesson.estimatedMinutes, 0), 0), difficulty: program.proficiencyLabel, proficiencyLabel: program.proficiencyLabel, supportedLanguages: ['en'], audiences: ['adult'], catalogMetadata: { iconKey: learningProgramIconKeySchema.parse(program.iconKey), displayOrder: program.displayOrder }, policy: defaultProgramPolicy, curriculumBindings: bindings };
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
      if (!programLessonCanComplete(snapshot.data)) throw new UnprocessableEntityException({ code: 'PROGRAM_LESSON_UNPLAYABLE', lessonVersionId: pin.lessonVersionId, message: 'Arrange lesson activities so supported program sessions can cover every activity; respond blocks require speaking and writing tasks.' });
      snapshots.set(pin.lessonVersionId, snapshot.data);
      const objectives = definition.data.objectives.filter(item => item.evidence.some(evidence => evidence.lessonVersionId === pin.lessonVersionId)).map(item => item.statement);
      if (lesson.title !== snapshot.data.title || !same(lesson.objectives, objectives) || !same(lesson.activityIds, snapshot.data.activities.map(item => item.id)) || !same(lesson.activityIds, pin.lessonVersion.activities.map(item => item.id))) fail();
      for (const resource of lesson.resourceRefs) if (resource.url && !['https:', 'http:'].includes(new URL(resource.url).protocol)) fail();
      lesson.vocabularyRefs = await resolveProgramVocabularyReferences(tx, lesson.vocabularyRefs);
    }
    for (const objective of definition.data.objectives) {
      for (const evidence of objective.evidence) {
        const activity = snapshots.get(evidence.lessonVersionId)?.activities.find(item => item.slug === evidence.activitySlug);
        if (!activity || evidence.languageBlockSlugs.some(slug => !activity.languageBlockReferences.includes(slug))) return fail();
      }
      if (objective.required) for (const skill of objective.skills) if (!objective.evidence.some(evidence => snapshots.get(evidence.lessonVersionId)?.activities.some(activity => activity.slug === evidence.activitySlug && activity.skills.includes(skill)))) fail();
    }
  }
  const program = await tx.learningProgram.findUniqueOrThrow({ where: { id: programId } });
  // Presentation metadata is captured from the locked authoring program, never caller overrides.
  return programVersionInputSchema.parse({ ...content, curriculumBindings: content.curriculumBindings.map(binding => { const row = rows.find(item => item.id === binding.curriculumRevisionId)!; return {...binding,pathTitle:row.mission.level.path.name,levelTitle:row.mission.level.name}; }), catalogMetadata: { iconKey: program.iconKey, displayOrder: program.displayOrder } });
}
