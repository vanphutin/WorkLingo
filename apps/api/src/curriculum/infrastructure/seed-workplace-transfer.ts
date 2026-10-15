import { createHash, randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { lessonSnapshotSchema } from '../domain/curriculum.types.js';
import { createLocalSeedStorage, createSeededAudioArtifact } from './seed-audio.js';

/** A second authored workplace situation reuses stable introduction blocks. */
export async function seedWorkplaceTransferCurriculum(
  database: PrismaClient,
  storage: ObjectStorage = createLocalSeedStorage(),
): Promise<void> {
  await database.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('worklingo:transfer-seed'))`;
    const base = await tx.lessonVersion.findFirst({
      where: {
        lesson: { slug: 'first-day-introductions', currentPublishedVersionId: { not: null } },
        status: 'PUBLISHED',
      },
      orderBy: { version: 'desc' },
      include: { wordBanks: true },
    });
    if (!base) throw new ConflictException('Seed Foundation before its transfer mission');
    const source = lessonSnapshotSchema.parse(base.parsedContent);
    const sourceActivities = new Map(source.activities.map((activity) => [activity.slug, activity]));
    const requireSourceActivity = (slug: string) => {
      const activity = sourceActivities.get(slug);
      if (!activity) throw new ConflictException(`Foundation source activity is missing: ${slug}`);
      return activity;
    };
    const template = {
      ...source, title: 'A customer visit',
      contentBlocks: [
        { slug: 'visitor-email', type: 'email' as const,
          text: 'Hello An. A customer, Linh, will visit our office at ten. She wants to meet the support team about a new order. Please welcome her at reception. Tell her your name and department, then take her to Mai. Linh does not know our building. If she needs help, please ask her what she needs. Thank you, Mai' },
        { slug: 'visitor-call', type: 'dialogue' as const,
          text: 'An: Hello, my name is An. I work in sales. How can I help you?\nLinh: My name is Linh. I am here to meet Mai in support.\nAn: Nice to meet you, Linh. Do you need help finding her desk?\nLinh: Yes, please. This is my first visit.\nAn: Please come with me. Mai is waiting for you.',
          audio: { kind: 'textPlaceholder' as const, notice: 'A local simulated voice is available. Use the transcript if playback fails.' } },
      ],
      activities: [
        { ...requireSourceActivity('recall-introduction'), slug: 'recall-customer-greeting', contentReferences: ['visitor-email'],
          payload: { prompt: 'Introduce your name before welcoming a customer.', sampleAnswer: 'My name is An.', requiredPhrases: ['my name is'], minWords: 4 } },
        { ...requireSourceActivity('understand-welcome'), slug: 'understand-visitor-plan', contentReferences: ['visitor-email'],
          payload: { prompt: 'Read the visit plan and connect its purpose, instructions and offer of help.', questions: [
            { slug: 'visitor-purpose', prompt: 'Why is Linh visiting?', options: ['To discuss an order with support.', 'To apply for a sales job.', 'To move her desk.'], answerIndex: 0, explanation: 'The email links her visit to a new order and the support team.', evidence: 'She wants to meet the support team about a new order.' },
            { slug: 'welcome-sequence', prompt: 'What should An do before taking Linh to Mai?', options: ['Send Linh home.', 'Welcome her at reception and introduce himself.', 'Ask Linh to find the room alone.'], answerIndex: 1, explanation: 'The instructions put greeting and introduction before escorting the visitor.', evidence: 'Please welcome her at reception. Tell her your name and department, then take her to Mai.' },
            { slug: 'visitor-inference', prompt: 'Linh seems unsure where to go. What fits Mai’s instructions?', options: ['Wait without speaking.', 'Offer help and ask what Linh needs.', 'Cancel the visit.'], answerIndex: 1, explanation: 'A visitor who does not know the building may need guidance.', evidence: 'Linh does not know our building. If she needs help, please ask her what she needs.' },
          ] } },
        { ...requireSourceActivity('understand-colleague'), slug: 'understand-visitor-call', contentReferences: ['visitor-call'],
          payload: { prompt: 'Follow the customer conversation and identify why An offers help.', questions: [
            { slug: 'visitor-contact', prompt: 'Who does Linh want to meet?', options: ['An in support.', 'Mai in sales.', 'Mai in support.'], answerIndex: 2, explanation: 'Linh states her contact and department.', evidence: 'I am here to meet Mai in support.' },
            { slug: 'escort-reason', prompt: 'Why does An offer to take Linh to Mai?', options: ['It is her first visit and she needs directions.', 'Linh works in sales.', 'Mai cancelled the order.'], answerIndex: 0, explanation: 'Her first visit explains the need for guidance.', evidence: 'Yes, please. This is my first visit.' },
          ] } },
        { ...requireSourceActivity('shadow-introduction'), slug: 'practice-visitor-welcome', contentReferences: ['visitor-call'],
          payload: { prompt: 'Say the greeting, then use your own name and department and record your response.', mode: 'shadowing' as const, sampleAnswer: 'My name is An. I work in sales. Nice to meet you.', requiredPhrases: ['my name is', 'i work in', 'nice to meet you'], minWords: 12 } },
        { ...requireSourceActivity('write-first-message'), slug: 'write-visitor-message', contentReferences: ['visitor-email', 'visitor-call'],
          payload: { prompt: 'Send Linh a welcome message before her visit. Introduce yourself and offer help finding reception.', sampleAnswer: 'Hello Linh. My name is An. I work in sales. Do you need help finding reception?', requiredPhrases: ['my name is', 'i work in', 'do you need help'], minWords: 14 } },
        { ...requireSourceActivity('prepare-help-question'), slug: 'prepare-customer-help', contentReferences: ['visitor-call'],
          payload: { prompt: 'Before the customer arrives, write one polite question that offers help.', sampleAnswer: 'Do you need help finding reception?', requiredPhrases: ['do you need help'], minWords: 6 } },
        { ...requireSourceActivity('read-team-details'), slug: 'read-visitor-details', contentReferences: ['visitor-email'],
          payload: { prompt: 'Read the email again and connect the visitor, team and meeting details.', questions: [
            { slug: 'visitor-time', prompt: 'When will Linh visit?', options: ['At nine', 'At ten', 'At noon'], answerIndex: 1, explanation: 'The visit time is stated directly.', evidence: 'Linh, will visit our office at ten.' },
            { slug: 'visitor-team', prompt: 'Which team will Linh meet?', options: ['Support', 'Sales', 'Finance'], answerIndex: 0, explanation: 'The email identifies the support team.', evidence: 'She wants to meet the support team.' },
          ] } },
        { ...requireSourceActivity('read-support-inference'), slug: 'read-visitor-inference', contentReferences: ['visitor-email'],
          payload: { prompt: 'Use the full email to infer the clearest response to a visitor who looks lost.', questions: [
            { slug: 'lost-visitor', prompt: 'What should An do if Linh cannot find reception?', options: ['Offer help and ask what she needs', 'Tell her to return tomorrow', 'Ignore her'], answerIndex: 0, explanation: 'Mai explicitly asks An to help because Linh does not know the building.', evidence: 'Linh does not know our building. If she needs help, please ask her what she needs.' },
          ] } },
        { ...requireSourceActivity('listen-for-departments'), slug: 'listen-visitor-roles', contentReferences: ['visitor-call'],
          payload: { prompt: 'Listen and identify each person’s role before checking the transcript.', questions: [
            { slug: 'an-department', prompt: 'Which department does An work in?', options: ['Sales', 'Support', 'Reception'], answerIndex: 0, explanation: 'An introduces his department.', evidence: 'I work in sales.' },
          ] } },
        { ...requireSourceActivity('listen-and-reason-help'), slug: 'listen-visitor-help', contentReferences: ['visitor-call'],
          payload: { prompt: 'Listen to the complete exchange and identify why the offer of help matters.', questions: [
            { slug: 'help-reason', prompt: 'Why does Linh accept An’s help?', options: ['It is her first visit', 'She works in sales', 'Mai is absent'], answerIndex: 0, explanation: 'Linh explains that she does not know the workplace yet.', evidence: 'Yes, please. This is my first visit.' },
          ] } },
      ],
    };
    const sourceHash = createHash('sha256').update(JSON.stringify(template)).digest('hex');
    const level = await tx.level.findUniqueOrThrow({ where: { code: 'FOUNDATION_1' } });
    const last = await tx.mission.findFirst({
      where: { levelId: level.id, purpose: 'LEARNING' },
      orderBy: { order: 'desc' },
    });
    const mission = await tx.mission.upsert({
      where: { slug: 'welcome-a-workplace-customer' }, update: {},
      create: { slug: 'welcome-a-workplace-customer', title: 'Welcome a customer to your workplace',
        objective: 'Use introductions and offers of help with a workplace visitor.', levelId: level.id,
        order: (last?.order ?? 0) + 1, purpose: 'LEARNING', status: 'PUBLISHED' },
    });
    if (mission.levelId !== level.id || mission.purpose !== 'LEARNING') {
      throw new ConflictException('Transfer mission belongs to another level or purpose');
    }
    const lesson = await tx.lesson.upsert({ where: { slug: 'customer-visit' }, update: {}, create: { slug: 'customer-visit' } });
    await tx.missionLesson.upsert({ where: { missionId_lessonId: { missionId: mission.id, lessonId: lesson.id } },
      update: {}, create: { missionId: mission.id, lessonId: lesson.id, order: 0 } });
    const existing = await tx.lessonVersion.findFirst({
      where: { lessonId: lesson.id, sourceHash },
      orderBy: { version: 'desc' },
    });
    if (existing) return;
    const snapshot = lessonSnapshotSchema.parse({
      ...template,
      contentBlocks: template.contentBlocks.map((block) => ({ ...block, id: randomUUID() })),
      activities: template.activities.map((activity, order) => ({ ...activity, order, id: randomUUID() })),
    });
    const latestVersion = await tx.lessonVersion.findFirst({
      where: { lessonId: lesson.id },
      orderBy: { version: 'desc' },
    });
    const version = await tx.lessonVersion.create({ data: {
      lessonId: lesson.id, version: (latestVersion?.version ?? 0) + 1, title: snapshot.title, sourceHash,
      parsedContent: snapshot as Prisma.InputJsonValue,
    } });
    for (const [order, block] of snapshot.contentBlocks.entries()) {
      await tx.contentBlock.create({ data: { id: block.id, lessonVersionId: version.id,
        slug: block.slug, type: block.type, order, text: block.text,
        metadata: (block.audio ? { audio: block.audio } : {}) as Prisma.InputJsonValue } });
    }
    for (const activity of snapshot.activities) {
      await tx.activity.create({ data: { ...activity, lessonVersionId: version.id, payload: activity.payload as Prisma.InputJsonValue } });
    }
    for (const bank of base.wordBanks) {
      await tx.lessonVersionWordBank.create({ data: { lessonVersionId: version.id,
        wordBankId: bank.wordBankId, wordBankVersionId: bank.wordBankVersionId } });
    }
    const listeningBlock = snapshot.contentBlocks.find((block) => block.slug === 'visitor-call');
    if (!listeningBlock) throw new ConflictException('Transfer listening content is missing');
    await createSeededAudioArtifact(tx, storage, {
      audioScriptSlug: listeningBlock.slug,
      lessonVersionId: version.id,
      script: listeningBlock.text,
    });
    if (lesson.currentPublishedVersionId) {
      const current = await tx.lessonVersion.findUnique({
        where: { id: lesson.currentPublishedVersionId },
      });
      if (current?.status === 'PUBLISHED') {
        await tx.lessonVersion.update({
          where: { id: current.id },
          data: { status: 'ARCHIVED' },
        });
      }
    }
    await tx.lesson.update({ where: { id: lesson.id }, data: { currentPublishedVersionId: version.id } });
    await tx.lessonVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  }, { timeout: 15_000 });
}
