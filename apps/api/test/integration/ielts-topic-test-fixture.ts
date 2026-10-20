import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { topicFixture } from '../../src/ielts-study/domain/ielts-topic-validation.fixture.js';
import type { LearningSessionTestContext } from './learning-session-test-harness.js';

export async function seedIeltsTopicCurriculum(context: Pick<LearningSessionTestContext,'database'>, fixture = topicFixture(), storage: ObjectStorage = (context as LearningSessionTestContext).app.get(ObjectStorage)) {
  const db = context.database;
    const path = await db.learningPath.create({ data: { programId: '10000000-0000-4000-8000-000000000004', slug: 'ielts-topics-test', name: 'IELTS topics', status: 'PUBLISHED' } });
    const level = await db.level.create({ data: { pathId: path.id, code: 'IELTS_TEST_FOUNDATION', name: 'Topic foundation', cefrReference: 'B1', order: 1, status: 'PUBLISHED' } });
    const mission = await db.mission.create({ data: { levelId: level.id, slug: fixture.lesson.mission.slug, title: 'Education', objective: fixture.lesson.mission.objective, order: 1, status: 'PUBLISHED' } });
    const snapshot = fixture.lesson.mission.lessonVersion;
    const lesson = await db.lesson.create({ data: { slug: 'ielts-test-education' } });
    const version = await db.lessonVersion.create({ data: { id: snapshot.id, lessonId: lesson.id, version: 1, title: snapshot.title, status: 'DRAFT', sourceHash: randomUUID(), parsedContent: snapshot as unknown as Prisma.InputJsonValue } });
    for (const bank of snapshot.wordBanks) {
      await db.wordBank.create({ data: { id: bank.id, slug: bank.slug, name: bank.name, languageBlocks: { create: bank.languageBlocks.map(chunk => ({ ...chunk })) } } });
      await db.lessonVersionWordBank.create({ data: { lessonVersionId: version.id, wordBankId: bank.id } });
    }
    await db.contentBlock.createMany({ data: snapshot.contentBlocks.map((block, order) => ({ id: block.id, lessonVersionId: version.id, slug: block.slug, type: block.type, text: block.text, order, metadata: block.audio ? { audio: block.audio } : {} })) });
    await db.activity.createMany({ data: snapshot.activities.map(activity => ({ ...activity, lessonVersionId: version.id, payload: activity.payload as Prisma.InputJsonValue })) });
    const bytes=Buffer.alloc(46);bytes.write('RIFF');bytes.writeUInt32LE(38,4);bytes.write('WAVE',8);bytes.write('fmt ',12);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(16000,24);bytes.writeUInt32LE(32000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(2,40);
    const object=await storage.put({body:bytes,contentType:'audio/wav',prefix:'isolated-topic-fixture'});
    const audio=await db.audioArtifact.create({data:{audioScriptSlug:'fixture',scriptHash:randomUUID(),adapterName:'isolated-fixture',voiceConfig:{provenance:'Synthetic transport fixture only'},mimeType:'audio/wav',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex'),storageKey:object.key,status:'READY'}});
    for(const activity of snapshot.activities.filter(activity=>activity.activityType==='listening'||activity.activityType==='speaking'))await db.lessonVersionAudioArtifact.create({data:{lessonVersionId:version.id,audioScriptSlug:activity.slug,audioArtifactId:audio.id}});
    // Listening resolves the content/evidence slug; shadowing also resolves the activity slug.
    for(const slug of new Set(snapshot.activities.filter(activity=>activity.activityType==='listening').flatMap(activity=>activity.contentReferences)))await db.lessonVersionAudioArtifact.create({data:{lessonVersionId:version.id,audioScriptSlug:slug,audioArtifactId:audio.id}});
    await db.lessonVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await db.missionLesson.create({ data: { missionId: mission.id, lessonId: lesson.id, order: 1 } });
    await db.curriculumRevision.create({ data: { id: fixture.pack.curriculumRevisionId, missionId: mission.id, revision: 1, snapshot: {}, lessons: { create: { lessonVersionId: version.id, order: 1 } } } });
  return { ...fixture, level, mission, version };
}
