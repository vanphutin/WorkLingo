import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dsn = process.env.WL_R2_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? '';
const target = new URL(dsn);
if (`${target.hostname}:${target.port}${target.pathname}` !== '127.0.0.1:55447/worklingo_r2') throw new Error('Owned disposable R2 endpoint required');
const schema = `r2_persistence_${randomUUID().replaceAll('-', '')}`;
target.searchParams.set('schema', schema);
const database = new PrismaClient({ datasourceUrl: target.toString() });
const admin = new PrismaClient({ datasourceUrl: dsn });
const migrationName = '20261030000200_r2_full_platform';
const migrationRoot = path.resolve('prisma/migrations');
const migrationSql = readFileSync(path.join(migrationRoot, migrationName, 'migration.sql'), 'utf8');
const prismaCli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
function executeScript(sql: string) {
  const result = spawnSync(process.execPath, [prismaCli, 'db', 'execute', '--stdin', '--url', target.toString(), '--config', 'prisma.r2.config.ts'], {
    encoding: 'utf8', input: sql, env: { ...process.env, DATABASE_URL: target.toString() }, timeout: 30_000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}
const ids = { program: randomUUID(), learner: randomUUID(), path: randomUUID(), level: randomUUID(), mission: randomUUID(), lesson: randomUUID(), lessonVersion: randomUUID(), revision: randomUUID(), olderRevision: randomUUID(), enrollment: randomUUID(), canonicalEnrollment: randomUUID(), otherProgram: randomUUID(), olderEnrollment: randomUUID(), otherLearner: randomUUID() };
let releaseId: string;
let reviewId: string;

async function baselineFixtures() {
  await database.user.createMany({ data: [ids.learner, ids.otherLearner].map((id, i) => ({ id, email: `${id}@example.test`, displayName: `R2 synthetic ${i}`, passwordHash: 'synthetic' })) });
  await database.learningProgram.createMany({ data: [ids.program, ids.otherProgram].map((id, i) => ({ id, slug: `r2-persistence-${id}`, name: 'Available capture title', description: 'Synthetic fixture', learningGoal: 'Practice', proficiencyLabel: 'A1', iconKey: 'intermediate', availabilityStatus: 'AVAILABLE', displayOrder: 9000 + i, curriculumRevisionIds: i === 0 ? [ids.revision] : [] })) });
  await database.learningPath.create({ data: { id: ids.path, programId: ids.program, slug: `path-${ids.path}`, name: 'Path' } });
  await database.level.create({ data: { id: ids.level, pathId: ids.path, code: ids.level, name: 'Stage', cefrReference: 'A1', order: 1 } });
  await database.mission.create({ data: { id: ids.mission, levelId: ids.level, slug: ids.mission, title: 'Available unit title', objective: 'Practice', order: 1 } });
  await database.lesson.create({ data: { id: ids.lesson, slug: ids.lesson } });
  await database.lessonVersion.create({ data: { id: ids.lessonVersion, lessonId: ids.lesson, version: 1, title: 'Exact lesson', sourceHash: 'synthetic', parsedContent: {}, status: 'PUBLISHED' } });
  for (const [index, id] of [ids.olderRevision, ids.revision].entries()) {
    await database.curriculumRevision.create({ data: { id, missionId: ids.mission, revision: index + 1, snapshot: { objectives: ['Practice'], prerequisiteRevisionIds: [] }, lessons: { create: { lessonVersionId: ids.lessonVersion, order: 1 } } } });
  }
  // The baseline table has no version/status columns yet; raw insert exercises a real pre-migration enrollment.
  await database.$executeRaw`INSERT INTO "LearnerProgramEnrollment" ("id","learnerId","programId","curriculumRevisionIds","updatedAt") VALUES (${ids.enrollment}::uuid,${ids.learner}::uuid,${ids.program}::uuid,ARRAY[${ids.revision}::uuid],now()), (${ids.olderEnrollment}::uuid,${ids.otherLearner}::uuid,${ids.program}::uuid,ARRAY[${ids.olderRevision}::uuid],now()), (${ids.canonicalEnrollment}::uuid,${ids.learner}::uuid,'10000000-0000-4000-8000-000000000001'::uuid,ARRAY[]::uuid[],now())`;
}

describe('R2 release persistence', () => {
  beforeAll(async () => {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const baseline = readdirSync(migrationRoot).filter(name => name < migrationName && /^\d/u.test(name)).sort().map(name => readFileSync(path.join(migrationRoot, name, 'migration.sql'), 'utf8')).join('\n');
    executeScript(baseline);
    await baselineFixtures();
  }, 60_000);
  afterAll(async () => { await database.$disconnect(); await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.$disconnect(); });

  it('fails closed for unresolved legacy pins before applying the valid migration', async () => {
    await database.learningProgram.update({ where: { id: ids.program }, data: { curriculumRevisionIds: [randomUUID()] } });
    expect(() => executeScript(`BEGIN;\n${migrationSql}\nCOMMIT;`)).toThrow(/Cannot backfill unresolved/u);
    await database.learningProgram.update({ where: { id: ids.program }, data: { curriculumRevisionIds: [ids.revision] } });
    executeScript(migrationSql);
  }, 30_000);

  it('preserves exact legacy enrollment pins and truthfully captures current metadata', async () => {
    const enrollment = await database.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: ids.enrollment }, include: { programVersion: { include: { curricula: true } } } });
    releaseId = enrollment.programVersionId!;
    expect(enrollment).toMatchObject({ id: ids.enrollment, revision: 1, status: 'ACTIVE', curriculumRevisionIds: [ids.revision] });
    expect(enrollment.programVersion).toMatchObject({ source: 'LEGACY_PIN_BACKFILL', status: 'PUBLISHED', curriculumRevisionIds: [ids.revision], snapshot: { title: 'Available capture title', metadataFidelity: 'AVAILABLE_AT_CAPTURE_NOT_HISTORICAL' }, curricula: [{ curriculumRevisionId: ids.revision, order: 1 }] });
    expect(enrollment.programVersion!.capturedAt.getTime()).toBeGreaterThan(Date.now() - 60_000);
    const older = await database.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: ids.olderEnrollment }, include: { programVersion: true } });
    expect(older.programVersionId).not.toBe(releaseId);
    expect(older.programVersion).toMatchObject({ status: 'RETIRED', curriculumRevisionIds: [ids.olderRevision] });
    expect(await database.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: ids.canonicalEnrollment } })).toMatchObject({ programVersionId: null, curriculumRevisionIds: [] });
  });

  it('retains published snapshots and ordered relational pins while allowing retirement', async () => {
    await expect(database.programVersion.update({ where: { id: releaseId }, data: { snapshot: { forged: true } } })).rejects.toThrow(/immutable/u);
    await expect(database.programVersion.update({ where: { id: releaseId }, data: { revision: 2 } })).rejects.toThrow(/immutable/u);
    await expect(database.programVersionCurriculum.delete({ where: { programVersionId_curriculumRevisionId: { programVersionId: releaseId, curriculumRevisionId: ids.revision } } })).rejects.toThrow(/immutable/u);
    await database.programVersion.update({ where: { id: releaseId }, data: { status: 'RETIRED', retiredAt: new Date() } });
    await expect(database.programVersion.update({ where: { id: releaseId }, data: { status: 'PUBLISHED' } })).rejects.toThrow(/immutable/u);
    expect(await database.programVersion.findUniqueOrThrow({ where: { id: releaseId } })).toMatchObject({ status: 'RETIRED', curriculumRevisionIds: [ids.revision] });
  });

  it('enforces program identity and exact curriculum foreign keys', async () => {
    await expect(database.learnerProgramEnrollment.update({ where: { id: ids.enrollment }, data: { programId: ids.otherProgram } })).rejects.toMatchObject({ code: 'P2003' });
    const draft = await database.programVersion.create({ data: { programId: ids.program, version: 10, snapshot: {}, policy: {} } });
    await expect(database.programVersionCurriculum.create({ data: { programVersionId: draft.id, curriculumRevisionId: randomUUID(), order: 1 } })).rejects.toMatchObject({ code: 'P2003' });
    await database.programVersionCurriculum.create({ data: { programVersionId: draft.id, curriculumRevisionId: ids.revision, order: 1 } });
    await expect(database.programVersionCurriculum.create({ data: { programVersionId: draft.id, curriculumRevisionId: ids.olderRevision, order: 1 } })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('persists append-only enrollment and progression history bound to the enrolled release', async () => {
    const event = await database.enrollmentEvent.create({ data: { enrollmentId: ids.enrollment, actorId: ids.learner, type: 'ASSIGNED', reason: 'Synthetic migration qualification', revision: 1, nextState: { status: 'ACTIVE', programVersionId: releaseId } } });
    const projection = await database.progressionSnapshot.create({ data: { enrollmentId: ids.enrollment, programVersionId: releaseId, revision: 1, engineVersion: 'r2-v1', policyVersion: 'r2-v1', evidence: [], projection: { completion: 0, mastery: null } } });
    expect(await database.progressionSnapshot.findUniqueOrThrow({ where: { id: projection.id } })).toMatchObject({ projection: { completion: 0, mastery: null } });
    await expect(database.enrollmentEvent.delete({ where: { id: event.id } })).rejects.toThrow(/append-only/u);
    await expect(database.progressionSnapshot.update({ where: { id: projection.id }, data: { projection: {} } })).rejects.toThrow(/append-only/u);
    const unrelated = await database.programVersion.create({ data: { programId: ids.otherProgram, version: 1, snapshot: {}, policy: {} } });
    await expect(database.progressionSnapshot.create({ data: { enrollmentId: ids.enrollment, programVersionId: unrelated.id, revision: 2, engineVersion: 'r2-v1', policyVersion: 'r2-v1', evidence: [], projection: {} } })).rejects.toMatchObject({ code: 'P2003' });
  });

  it('records review history only from matching completed learning sessions', async () => {
    const review = await database.programReview.create({ data: { enrollmentId: ids.enrollment, curriculumRevisionId: ids.revision, lessonVersionId: ids.lessonVersion, scheduleVersion: 'review-v1', dueAt: new Date() } });
    reviewId = review.id;
    await expect(database.programReviewEvent.create({ data: { reviewId, revision: 1, type: 'COMPLETED', nextState: {} } })).rejects.toThrow(/requires a completed/u);
    const session = await database.learningSession.create({ data: { learnerId: ids.learner, clientSessionId: randomUUID(), missionId: ids.mission, lessonVersionId: ids.lessonVersion, curriculumRevisionId: ids.revision, durationMinutes: 45, planSnapshot: {} } });
    await expect(database.programReviewEvent.create({ data: { reviewId, learningSessionId: session.id, revision: 1, type: 'COMPLETED', nextState: {} } })).rejects.toThrow(/must match a completed/u);
    await database.learningSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    const event = await database.programReviewEvent.create({ data: { reviewId, learningSessionId: session.id, revision: 1, type: 'COMPLETED', nextState: { iteration: 1 } } });
    expect(event.learningSessionId).toBe(session.id);
    await expect(database.programReviewEvent.update({ where: { id: event.id }, data: { nextState: {} } })).rejects.toThrow(/append-only/u);
  });

  it('indexes release discovery, enrollment state, progression history and due reviews', async () => {
    const rows = await database.$queryRaw<Array<{ indexname: string }>>`SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()`;
    const indexes = rows.map(row => row.indexname);
    expect(indexes).toEqual(expect.arrayContaining(['ProgramVersion_programId_status_version_idx', 'LearnerProgramEnrollment_programId_status_idx', 'ProgramVersionCurriculum_curriculumRevisionId_idx', 'ProgressionSnapshot_programVersionId_createdAt_idx', 'ProgramReview_enrollmentId_dueAt_idx']));
  });
});
