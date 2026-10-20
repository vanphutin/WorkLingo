import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { INTERMEDIATE_PROGRAM_ID, INTERMEDIATE_TOPIC_LIBRARY_LEVEL } from '../learning-programs/domain/program-catalog.js';

/** Supply the durable mission identity required by sessions, without changing progression levels. */
export async function ensureTopicMission(tx: Prisma.TransactionClient, lesson: { id: string; title: string; objective: string }) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('intermediate-topic-library'))`;
  const slug = `intermediate-topic-${lesson.id}`;
  const binding = await tx.missionLesson.findFirst({
    where: { lessonId: lesson.id, mission: { purpose: 'LEARNING', level: { path: { programId: INTERMEDIATE_PROGRAM_ID } } } },
    include: { mission: true },
  });
  // Preserve manually managed curriculum/prerequisites, including unpublished ones.
  if (binding) {
    if (binding.mission.slug === slug) await tx.mission.update({ where: { id: binding.missionId }, data: { title: lesson.title, objective: lesson.objective } });
    return binding.missionId;
  }
  const path = await tx.learningPath.upsert({ where: { slug: 'intermediate-topic-library' }, update: {},
    create: { slug: 'intermediate-topic-library', name: 'Intermediate topic library', programId: INTERMEDIATE_PROGRAM_ID, status: 'PUBLISHED' } });
  const level = await tx.level.upsert({ where: { code: INTERMEDIATE_TOPIC_LIBRARY_LEVEL }, update: {},
    create: { pathId: path.id, code: INTERMEDIATE_TOPIC_LIBRARY_LEVEL, name: 'Topic library', cefrReference: 'See lesson level', order: 0, status: 'PUBLISHED' } });
  if (path.programId !== INTERMEDIATE_PROGRAM_ID || level.pathId !== path.id) throw new ConflictException('Topic library belongs to another curriculum');
  await tx.$queryRaw`SELECT id FROM "Level" WHERE id = ${level.id}::uuid FOR UPDATE`;
  const latest = await tx.mission.aggregate({ where: { levelId: level.id }, _max: { order: true } });
  const mission = await tx.mission.create({ data: {
    slug, levelId: level.id, title: lesson.title, objective: lesson.objective, purpose: 'LEARNING', status: 'PUBLISHED', order: (latest._max.order ?? -1) + 1,
    lessons: { create: { lessonId: lesson.id, order: 0 } },
  } });
  return mission.id;
}
