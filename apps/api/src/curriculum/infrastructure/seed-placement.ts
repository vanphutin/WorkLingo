import { createHash, randomUUID } from 'node:crypto';

import { ConflictException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { placementMissionFixture } from '@worklingo/test-fixtures';

import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { lessonSnapshotSchema } from '../domain/curriculum.types.js';
import { createLocalSeedStorage, createSeededAudioArtifact } from './seed-audio.js';

export async function seedPlacementCurriculum(
  database: PrismaClient,
  storage: ObjectStorage = createLocalSeedStorage(),
): Promise<void> {
  const fixture = placementMissionFixture;
  const sourceHash = createHash('sha256').update(JSON.stringify(fixture.lesson)).digest('hex');

  await database.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('worklingo:placement-seed'))`;
    const level = await tx.level.findUnique({ where: { code: fixture.level.code } });
    if (!level) throw new ConflictException('Seed Foundation before the placement diagnostic');

    const mission = await tx.mission.upsert({
      where: { slug: fixture.slug },
      update: {},
      create: {
        levelId: level.id,
        objective: fixture.objective,
        order: 10_000,
        purpose: 'PLACEMENT',
        slug: fixture.slug,
        status: 'PUBLISHED',
        title: fixture.title,
      },
    });
    if (mission.levelId !== level.id || mission.purpose !== 'PLACEMENT') {
      throw new ConflictException('Placement mission belongs to another level or purpose');
    }

    const lesson = await tx.lesson.upsert({
      where: { slug: fixture.lesson.slug },
      update: {},
      create: { slug: fixture.lesson.slug },
    });
    await tx.missionLesson.upsert({
      where: { missionId_lessonId: { missionId: mission.id, lessonId: lesson.id } },
      update: {},
      create: { lessonId: lesson.id, missionId: mission.id, order: 0 },
    });

    const existing = await tx.lessonVersion.findFirst({
      where: { lessonId: lesson.id, sourceHash },
      orderBy: { version: 'desc' },
    });
    if (existing) {
      const current = lesson.currentPublishedVersionId
        ? await tx.lessonVersion.findUnique({ where: { id: lesson.currentPublishedVersionId } })
        : null;
      if (current?.status === 'PUBLISHED') return;

      const latestPublished = await tx.lessonVersion.findFirst({
        where: { lessonId: lesson.id, status: 'PUBLISHED' },
        orderBy: { version: 'desc' },
      });
      await tx.lesson.update({
        where: { id: lesson.id },
        data: { currentPublishedVersionId: latestPublished?.id ?? null },
      });
      return;
    }

    const wordBanks: Array<{
      bankVersionId: string;
      id: string;
      languageBlocks: Array<
        (typeof fixture.lesson.wordBanks)[number]['languageBlocks'][number] & { id: string }
      >;
      name: string;
      slug: string;
    }> = [];
    for (const bankFixture of fixture.lesson.wordBanks) {
      const bank = await tx.wordBank.upsert({
        where: { slug: bankFixture.slug },
        update: {},
        create: { name: bankFixture.name, slug: bankFixture.slug },
      });
      const bankHash = createHash('sha256').update(JSON.stringify(bankFixture)).digest('hex');
      const bankVersion = await tx.wordBankVersion.upsert({
        where: { wordBankId_version: { wordBankId: bank.id, version: 1 } },
        update: {},
        create: {
          name: bankFixture.name,
          sourceHash: bankHash,
          version: 1,
          wordBankId: bank.id,
        },
      });
      const languageBlocks = [];
      for (const blockFixture of bankFixture.languageBlocks) {
        const shared = {
          ...blockFixture,
          collocations: [...blockFixture.collocations],
          commonErrors: [...blockFixture.commonErrors],
          examples: [...blockFixture.examples],
          transferContexts: [...blockFixture.transferContexts],
        };
        await tx.languageBlockVersion.upsert({
          where: {
            wordBankVersionId_slug: {
              slug: blockFixture.slug,
              wordBankVersionId: bankVersion.id,
            },
          },
          update: {},
          create: { ...shared, wordBankVersionId: bankVersion.id },
        });
        const block = await tx.languageBlock.upsert({
          where: { slug: blockFixture.slug },
          update: {},
          create: { ...shared, wordBankId: bank.id },
        });
        if (block.wordBankId !== bank.id) {
          throw new ConflictException('Placement language block belongs to another Word Bank');
        }
        languageBlocks.push({ ...blockFixture, id: block.id });
      }
      wordBanks.push({
        bankVersionId: bankVersion.id,
        id: bank.id,
        languageBlocks,
        name: bank.name,
        slug: bank.slug,
      });
    }

    const snapshot = lessonSnapshotSchema.parse({
      activities: fixture.lesson.activities.map((activity, order) => ({
        ...activity,
        id: randomUUID(),
        order,
      })),
      contentBlocks: fixture.lesson.contentBlocks.map((block) => ({
        ...block,
        id: randomUUID(),
      })),
      title: fixture.lesson.title,
      wordBanks,
    });
    const latestVersion = await tx.lessonVersion.findFirst({
      where: { lessonId: lesson.id },
      orderBy: { version: 'desc' },
    });
    const version = await tx.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        parsedContent: snapshot as Prisma.InputJsonValue,
        sourceHash,
        title: snapshot.title,
        version: (latestVersion?.version ?? 0) + 1,
      },
    });
    for (const [order, block] of snapshot.contentBlocks.entries()) {
      await tx.contentBlock.create({
        data: {
          id: block.id,
          lessonVersionId: version.id,
          metadata: block.audio ? { audio: block.audio } : {},
          order,
          slug: block.slug,
          text: block.text,
          type: block.type,
        },
      });
    }
    for (const activity of snapshot.activities) {
      await tx.activity.create({
        data: {
          ...activity,
          lessonVersionId: version.id,
          payload: activity.payload as Prisma.InputJsonValue,
        },
      });
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

    const listeningBlock = snapshot.contentBlocks.find((block) =>
      snapshot.activities.some((activity) =>
        activity.activityType === 'listening' && activity.contentReferences.includes(block.slug),
      ),
    );
    if (!listeningBlock) {
      throw new ConflictException('Placement listening activity requires referenced content');
    }
    await createSeededAudioArtifact(tx, storage, {
      audioScriptSlug: listeningBlock.slug,
      lessonVersionId: version.id,
      script: listeningBlock.text,
    });

    await tx.lesson.update({
      where: { id: lesson.id },
      data: { currentPublishedVersionId: version.id },
    });
    await tx.lessonVersion.update({
      where: { id: version.id },
      data: { publishedAt: new Date(), status: 'PUBLISHED' },
    });
  }, { timeout: 15_000 });
}
