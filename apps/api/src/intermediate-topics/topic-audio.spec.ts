import { createHash } from 'node:crypto';
import { it, expect, vi } from 'vitest';
import type { PrismaService } from '../common/database/prisma.service.js';
import type { ObjectStorage } from '../storage/domain/object-storage.port.js';
import { LearnerAudioService } from '../learning-sessions/application/learner-audio.service.js';
import { planFoundationSession } from '../learning-sessions/domain/session-planner.js';
import { topicMission } from './topic-test.fixture.js';

it('serves topic passage audio from the frozen version even when evidence and script slugs differ', async () => {
  const mission = topicMission();
  const activity = mission.lessonVersion.activities.find(a => a.activityType === 'listening')!;
  if (activity.activityType !== 'listening') throw new Error('Listening fixture required');
  // Frozen reviewed rendition is explicitly bound even though source evidence uses another slug.
  activity.payload.audioText = 'The frozen passage rendition.';
  const bytes = Buffer.from('passage');
  const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
  const database = {
    learningSession: { findFirst: vi.fn(async () => ({ lessonVersionId: mission.lessonVersion.id, planSnapshot: planFoundationSession({ mission, durationMinutes: 90 }) })) },
    activity: { findFirst: vi.fn(async () => activity) },
    lessonVersion: { findUnique: vi.fn(async ({where}) => where.id === mission.lessonVersion.id
      ? {parsedContent:mission.lessonVersion,sourceHash:'unneeded-for-explicit-snapshot-text'} : null) },
    lessonVersionAudioArtifact: { findMany: vi.fn(async ({where}) => where.lessonVersionId === mission.lessonVersion.id ? [{
      lessonVersionId:mission.lessonVersion.id,audioScriptSlug:'workplace-audio',audioArtifactId:'frozen-audio',
      audioArtifact:{id:'frozen-audio',audioScriptSlug:'workplace-audio',status:'READY',adapterName:'reviewed-provider',
        checksum:digest(bytes),scriptHash:digest(activity.payload.audioText!),storageKey:'frozen/passage',mimeType:'audio/wav',contentImport:null},
    }] : []) },
  };
  const storage = { read: vi.fn(async () => bytes) };
  const service = new LearnerAudioService(database as unknown as PrismaService, storage as unknown as ObjectStorage);
  expect(await service.getActivityAudio('learner', 'session', activity.id)).toMatchObject({ body: bytes });
  expect(database.lessonVersion.findUnique).toHaveBeenCalledWith(expect.objectContaining({where:{id:mission.lessonVersion.id}}));
  expect(storage.read).toHaveBeenCalledWith('frozen/passage');
});
