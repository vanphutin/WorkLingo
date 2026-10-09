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
        payload: { prompt: 'Listen.', questions: [{
          slug: 'listen-q1', prompt: 'What next?', options: ['A', 'B'], answerIndex: 0,
          explanation: 'A', evidence: 'call-v1:1',
        }] },
      }) },
      lessonVersionAudioArtifact: { findFirst: vi.fn().mockResolvedValue({
        audioArtifact: { storageKey: 'generated-audio/version-n', byteSize: 3, mimeType: 'audio/wav' },
      }) },
    } as unknown as PrismaService;
    const storage = { read: vi.fn().mockResolvedValue(Buffer.from('old')) } as unknown as ObjectStorage;
    const service = new LearnerAudioService(database, storage);

    await expect(service.getActivityAudio('learner', 'session', activityId)).resolves.toMatchObject({
      body: Buffer.from('old'), byteSize: 3, mimeType: 'audio/wav',
    });
    expect(database.lessonVersionAudioArtifact.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        lessonVersionId,
        audioScriptSlug: { in: expect.arrayContaining(['dialogue', 'call-v1']) },
      }),
    }));
    expect(storage.read).toHaveBeenCalledWith('generated-audio/version-n');
  });
});
