import { it, expect, vi } from 'vitest';
import type { PrismaService } from '../common/database/prisma.service.js';
import type { ObjectStorage } from '../storage/domain/object-storage.port.js';
import { LearnerAudioService } from '../learning-sessions/application/learner-audio.service.js';
import { planFoundationSession } from '../learning-sessions/domain/session-planner.js';
import { topicMission } from './topic-test.fixture.js';

it('serves topic passage audio from the frozen version even when evidence and script slugs differ', async () => {
  const mission = topicMission();
  const activity = mission.lessonVersion.activities.find(a => a.activityType === 'listening')!;
  const database = {
    learningSession: { findFirst: vi.fn(async () => ({ lessonVersionId: mission.lessonVersion.id, planSnapshot: planFoundationSession({ mission, durationMinutes: 90 }) })) },
    activity: { findFirst: vi.fn(async () => activity) },
    lessonVersionAudioArtifact: { findFirst: vi.fn(async ({ where }) => {
      // Published topic scripts share the passage, but have independent identifiers.
      if (where.lessonVersionId !== mission.lessonVersion.id || (where.audioScriptSlug && !where.audioScriptSlug.in.includes('workplace-audio'))) return null;
      return { audioArtifact: { storageKey: 'frozen/passage', byteSize: 7, mimeType: 'audio/wav' } };
    }) },
  };
  const storage = { read: vi.fn(async () => Buffer.from('passage')) };
  const service = new LearnerAudioService(database as unknown as PrismaService, storage as unknown as ObjectStorage);
  expect(await service.getActivityAudio('learner', 'session', activity.id)).toMatchObject({ body: Buffer.from('passage') });
});
