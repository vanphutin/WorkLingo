import { createHash, randomUUID } from 'node:crypto';

import { ConflictException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { foundationMissionFixture } from '@worklingo/test-fixtures';

import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { lessonSnapshotSchema } from '../domain/curriculum.types.js';
import { createLocalSeedStorage, createSeededAudioArtifact } from './seed-audio.js';

export async function seedFoundationCurriculum(
  database: PrismaClient,
  storage: ObjectStorage = createLocalSeedStorage(),
): Promise<void> {
  const fixture = foundationMissionFixture;
  const sourceHash = createHash('sha256').update(JSON.stringify(fixture.lesson)).digest('hex');
  await database.$transaction(async (tx) => {
    // Serialize concurrent seed runs before checking stable keys.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('worklingo:foundation-seed'))`;
    const path = await tx.learningPath.upsert({
      where: { slug: fixture.path.slug }, update: {}, create: { ...fixture.path, status: 'PUBLISHED' },
    });
    const level = await tx.level.upsert({
      where: { code: fixture.level.code }, update: {}, create: { ...fixture.level, pathId: path.id, order: 0 },
    });
    if (level.pathId !== path.id) {
      throw new ConflictException('Foundation level belongs to another learning path');
    }
    const mission = await tx.mission.upsert({
      where: { slug: fixture.slug }, update: {},
      create: { slug: fixture.slug, title: fixture.title, objective: fixture.objective, levelId: level.id, order: 0, status: 'PUBLISHED' },
    });
    if (mission.levelId !== level.id) {
      throw new ConflictException('Foundation mission belongs to another level');
    }
    const lesson = await tx.lesson.upsert({ where: { slug: fixture.lesson.slug }, update: {}, create: { slug: fixture.lesson.slug } });
    await tx.missionLesson.upsert({
      where: { missionId_lessonId: { missionId: mission.id, lessonId: lesson.id } },
      update: {}, create: { missionId: mission.id, lessonId: lesson.id, order: 0 },
    });
    const existing = await tx.lessonVersion.findFirst({
      where: { lessonId: lesson.id, sourceHash },
      orderBy: { version: 'desc' },
    });
    const wordBanks: Array<{
      id: string;
      slug: string;
      name: string;
      bankVersionId: string;
      languageBlocks: Array<(typeof fixture.lesson.wordBanks)[number]['languageBlocks'][number] & { id: string }>;
    }> = [];
    for (const bankFixture of fixture.lesson.wordBanks) {
      const bank = await tx.wordBank.upsert({ where: { slug: bankFixture.slug }, update: {}, create: { slug: bankFixture.slug, name: bankFixture.name } });
      const bankHash = createHash('sha256').update(JSON.stringify(bankFixture)).digest('hex');
      const bankVersion = await tx.wordBankVersion.upsert({
        where: { wordBankId_version: { wordBankId: bank.id, version: 1 } },
        update: {},
        create: {
          wordBankId: bank.id,
          name: bankFixture.name,
          sourceHash: bankHash,
          version: 1,
        },
      });
      const languageBlocks = [];
      for (const blockFixture of bankFixture.languageBlocks) {
        await tx.languageBlockVersion.upsert({
          where: { wordBankVersionId_slug: { wordBankVersionId: bankVersion.id, slug: blockFixture.slug } },
          update: {},
          create: {
            ...blockFixture,
            wordBankVersionId: bankVersion.id,
            collocations: [...blockFixture.collocations],
            examples: [...blockFixture.examples],
            commonErrors: [...blockFixture.commonErrors],
            transferContexts: [...blockFixture.transferContexts],
          },
        });
        const block = await tx.languageBlock.upsert({
          where: { slug: blockFixture.slug }, update: {},
          create: { ...blockFixture, wordBankId: bank.id, collocations: [...blockFixture.collocations], examples: [...blockFixture.examples], commonErrors: [...blockFixture.commonErrors], transferContexts: [...blockFixture.transferContexts] },
        });
        if (block.wordBankId !== bank.id) {
          throw new ConflictException('Foundation language block belongs to another Word Bank');
        }
        languageBlocks.push({ ...blockFixture, id: block.id });
      }
      wordBanks.push({ id: bank.id, slug: bank.slug, name: bank.name, bankVersionId: bankVersion.id, languageBlocks });
    }
    if (existing) {
      const currentVersion = lesson.currentPublishedVersionId
        ? await tx.lessonVersion.findUnique({ where: { id: lesson.currentPublishedVersionId } })
        : null;
      if (currentVersion?.status === 'PUBLISHED') return;

      const latestPublished = await tx.lessonVersion.findFirst({
        where: { lessonId: lesson.id, status: 'PUBLISHED' },
        orderBy: { version: 'desc' },
      });
      if (!latestPublished) {
        if (lesson.currentPublishedVersionId) {
          await tx.lesson.updateMany({
            where: {
              id: lesson.id,
              currentPublishedVersionId: lesson.currentPublishedVersionId,
            },
            data: { currentPublishedVersionId: null },
          });
        }
        return;
      }

      await tx.lesson.update({
        where: { id: lesson.id },
        data: { currentPublishedVersionId: latestPublished.id },
      });
      return;
    }
    const snapshot = lessonSnapshotSchema.parse({
      title: fixture.lesson.title, wordBanks,
      contentBlocks: fixture.lesson.contentBlocks.map((block) => ({ ...block, id: randomUUID() })),
      activities: fixture.lesson.activities.map((activity, order) => ({ ...activity, order, id: randomUUID() })),
    });
    const latestVersion = await tx.lessonVersion.findFirst({
      where: { lessonId: lesson.id },
      orderBy: { version: 'desc' },
    });
    const version = await tx.lessonVersion.create({
      data: {
        lessonId: lesson.id, version: (latestVersion?.version ?? 0) + 1, title: snapshot.title,
        sourceHash, parsedContent: snapshot as Prisma.InputJsonValue,
      },
    });
    for (const [order, block] of snapshot.contentBlocks.entries()) {
      await tx.contentBlock.create({ data: { id: block.id, slug: block.slug, type: block.type, text: block.text, order, lessonVersionId: version.id, metadata: block.audio ? { audio: block.audio } : {} } });
    }
    for (const activity of snapshot.activities) {
      await tx.activity.create({ data: { ...activity, lessonVersionId: version.id, payload: activity.payload as Prisma.InputJsonValue } });
    }
    for (const bank of wordBanks) {
      await tx.lessonVersionWordBank.create({
        data: {
          lessonVersionId: version.id,
          wordBankId: bank.id,
          wordBankVersionId: bank.bankVersionId,
        },
      });
    }
    const listeningBlock = snapshot.contentBlocks.find(
      (block) => snapshot.activities.some(
        (activity) => activity.activityType === 'listening' &&
          activity.contentReferences.includes(block.slug),
      ),
    );
    if (!listeningBlock) {
      throw new ConflictException('Foundation listening activity requires referenced content');
    }
    await createSeededAudioArtifact(tx, storage, {
      audioScriptSlug: listeningBlock.slug,
      lessonVersionId: version.id,
      script: listeningBlock.text,
    });
    const currentPublishedVersion = lesson.currentPublishedVersionId
      ? await tx.lessonVersion.findUnique({ where: { id: lesson.currentPublishedVersionId } })
      : null;
    if (currentPublishedVersion?.status === 'PUBLISHED') {
      await tx.lessonVersion.update({
        where: { id: currentPublishedVersion.id },
        data: { status: 'ARCHIVED' },
      });
    }
    await tx.lesson.update({ where: { id: lesson.id }, data: { currentPublishedVersionId: version.id } });
    // Publish only after every child and the validated snapshot exist, in one transaction.
    await tx.lessonVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  }, { timeout: 15_000 });
}
