import { PrismaClient } from '@prisma/client';
import { analyzeLessonSource } from '@worklingo/content-format';
import { ensureTopicMission } from '../src/intermediate-topics/topic-mission.js';
import { isTopicSource } from '../src/intermediate-topics/topic-source.js';
import { lessonSnapshotSchema } from '../src/curriculum/domain/curriculum.types.js';
import { INTERMEDIATE_PROGRAM_ID } from '../src/learning-programs/domain/program-catalog.js';

process.loadEnvFile(new URL('../../../.env', import.meta.url));
const db = new PrismaClient();
try {
  const lessons = await db.lesson.findMany({
    where: { currentPublishedVersion: { status: 'PUBLISHED' }, missions: { none: { mission: { purpose: 'LEARNING', level: { path: { programId: INTERMEDIATE_PROGRAM_ID } } } } } },
    include: { currentPublishedVersion: { include: { contentImports: { where: { status: 'PUBLISHED' }, take: 1, select: { rawSource: true } } } } },
  });
  let linked = 0;
  for (const lesson of lessons) {
    const version = lesson.currentPublishedVersion!;
    const snapshot = lessonSnapshotSchema.safeParse(version.parsedContent);
    const source = version.contentImports[0]?.rawSource;
    if (!snapshot.success || !snapshot.data.intermediateTopic || !source) continue;
    const draft = analyzeLessonSource(source).normalizedDraft;
    if (!draft || !isTopicSource(source)) continue;
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Lesson" WHERE id = ${lesson.id}::uuid FOR UPDATE`;
      const current = await tx.lesson.findUnique({ where: { id: lesson.id }, select: { currentPublishedVersionId: true } });
      if (current?.currentPublishedVersionId !== version.id) return;
      await ensureTopicMission(tx, { id: lesson.id, title: version.title, objective: draft.objective });
      linked++;
    });
  }
  console.log(JSON.stringify({ linked }));
} finally { await db.$disconnect(); }
