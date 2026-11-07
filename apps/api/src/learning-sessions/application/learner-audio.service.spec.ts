import { createHash } from 'node:crypto';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { describe, expect, it, vi } from 'vitest';

import { LearnerAudioService } from './learner-audio.service.js';

describe('LearnerAudioService', () => {
  it('reads the artifact linked to the session lesson version, not the current lesson version', async () => {
    const activityId = '00000000-0000-4000-8000-000000000001';
    const lessonVersionId = '00000000-0000-4000-8000-000000000002';
    const database = {
      learningSession: { findFirst: vi.fn().mockResolvedValue({
        lessonVersionId,
        planSnapshot: {
          durationMinutes: 45,
          missionId: '00000000-0000-4000-8000-000000000003',
          lessonVersionId,
          blocks: [
            { type: 'readDecode', order: 1, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000004'], skills: ['reading'] },
            { type: 'listenReason', order: 2, targetMinutes: 15, activityIds: [activityId], skills: ['listening'] },
            { type: 'respond', order: 3, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000005'], skills: ['speaking', 'writing'] },
          ],
        },
      }) },
      activity: { findFirst: vi.fn().mockResolvedValue({
        id: activityId, lessonVersionId, slug: 'listen', order: 1,
        activityType: 'listening', learningBlock: 'listenReason', skills: ['listening'],
        contentReferences: ['dialogue'], languageBlockReferences: ['follow-up'],
        payload: { prompt: 'Listen.', audioText:'Hello', questions: [{
          slug: 'listen-q1', prompt: 'What next?', options: ['A', 'B'], answerIndex: 0,
          explanation: 'A', evidence: 'call-v1:1',
        }] },
      }) },
      lessonVersionAudioArtifact: { findMany: vi.fn().mockResolvedValue([{lessonVersionId, audioScriptSlug:'call-v1',audioArtifactId:'audio-id',audioArtifact:{id:'audio-id',audioScriptSlug:'call-v1',scriptHash:createHash('sha256').update('Hello').digest('hex'),checksum:createHash('sha256').update('old').digest('hex'),status:'READY',adapterName:'azure-speech',contentImport:null,storageKey:'generated-audio/version-n',mimeType:'audio/wav'}}]) },
    } as unknown as PrismaService;
    const stored = await database.activity.findFirst({where:{id:activityId}});
    Object.assign(database,{lessonVersion:{findUnique:vi.fn().mockResolvedValue({sourceHash:'x',parsedContent:{activities:[stored]}})}});
    const storage = { read: vi.fn().mockResolvedValue(Buffer.from('old')) } as unknown as ObjectStorage;
    const service = new LearnerAudioService(database, storage);

    await expect(service.getActivityAudio('learner', 'session', activityId)).resolves.toMatchObject({
      body: Buffer.from('old'), byteSize: 3, mimeType: 'audio/wav',
    });
    expect(database.lessonVersionAudioArtifact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        lessonVersionId,
      }),
    }));
    expect(storage.read).toHaveBeenCalledWith('generated-audio/version-n');
  });

  it('serves a version-bound model for a shadowing activity', async () => {
    const activityId = '00000000-0000-4000-8000-000000000011';
    const lessonVersionId = '00000000-0000-4000-8000-000000000012';
    const database = {
      learningSession: { findFirst: vi.fn().mockResolvedValue({
        lessonVersionId,
        planSnapshot: {
          durationMinutes: 45,
          missionId: '00000000-0000-4000-8000-000000000013',
          lessonVersionId,
          blocks: [
            { type: 'readDecode', order: 1, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000014'], skills: ['reading'] },
            { type: 'listenReason', order: 2, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000015'], skills: ['listening'] },
            { type: 'respond', order: 3, targetMinutes: 15, activityIds: [activityId, '00000000-0000-4000-8000-000000000016'], skills: ['speaking', 'writing'] },
          ],
        },
      }) },
      activity: { findFirst: vi.fn().mockResolvedValue({
        id: activityId, lessonVersionId, slug: 'shadow-introduction', order: 3,
        activityType: 'speaking', learningBlock: 'respond', skills: ['speaking'],
        contentReferences: ['dialogue'], languageBlockReferences: ['my-name-is'],
        payload: {
          prompt: 'Shadow the model.', mode: 'shadowing', sampleAnswer: 'My name is An.',
          requiredPhrases: ['my name is'], minWords: 4,
        },
      }) },
      lessonVersionAudioArtifact: { findMany: vi.fn().mockResolvedValue([{lessonVersionId,audioScriptSlug:'shadow-introduction',audioArtifactId:'audio-id',audioArtifact:{id:'audio-id',audioScriptSlug:'shadow-introduction',scriptHash:createHash('sha256').update('My name is An.').digest('hex'),checksum:createHash('sha256').update('model').digest('hex'),status:'READY',adapterName:'azure-speech',contentImport:null,storageKey:'generated-audio/shadow-model',mimeType:'audio/wav'}}]) },
    } as unknown as PrismaService;
    const stored = await database.activity.findFirst({where:{id:activityId}});
    Object.assign(database,{lessonVersion:{findUnique:vi.fn().mockResolvedValue({sourceHash:'x',parsedContent:{activities:[stored]}})}});
    const storage = { read: vi.fn().mockResolvedValue(Buffer.from('model')) } as unknown as ObjectStorage;
    const service = new LearnerAudioService(database, storage);

    await expect(service.getActivityAudio('learner', 'session', activityId)).resolves.toMatchObject({
      body: Buffer.from('model'), byteSize: 5, mimeType: 'audio/wav',
    });
    expect(database.lessonVersionAudioArtifact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        lessonVersionId,
      }),
    }));
  });
});
