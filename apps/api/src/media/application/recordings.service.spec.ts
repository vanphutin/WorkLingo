import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../common/database/prisma.service.js';
import type { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import type { LearningSessionsService } from '../../learning-sessions/application/learning-sessions.service.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { RecordingsService } from './recordings.service.js';

const ids = {
  activity: randomUUID(), attempt: randomUUID(), job: randomUUID(), learner: randomUUID(),
  recording: randomUUID(), session: randomUUID(), version: randomUUID(),
};
const input = {
  activityId: ids.activity,
  clientAttemptId: randomUUID(),
  consentAccepted: true,
  consentPolicyVersion: 'recording-v1',
  consentScope: 'teacher-ai',
  learnerId: ids.learner,
  sessionId: ids.session,
};
const file = {
  body: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('OpusHead')]),
  mimeType: 'audio/webm;codecs=opus',
};
const context = {
  activityId: ids.activity, activityIndex: 0, activityIds: [ids.activity],
  lessonVersionId: ids.version, plan: { blocks: [] }, sessionId: ids.session,
};

const createService = (overrides: {
  database?: Partial<PrismaService>;
  dispatcher?: Partial<JobDispatcher>;
  sessions?: Partial<LearningSessionsService>;
  storage?: Partial<ObjectStorage>;
} = {}) => {
  const database = overrides.database ?? {
    activityAttempt: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(),
  };
  const storage = overrides.storage ?? {
    put: vi.fn().mockResolvedValue({ key: 'recordings/server-generated', size: file.body.length }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const dispatcher = overrides.dispatcher ?? { enqueue: vi.fn() };
  const sessions = overrides.sessions ?? {
    requireCurrentActivity: vi.fn().mockResolvedValue(context),
    advanceSubmittedActivity: vi.fn(),
  };
  return {
    database, dispatcher, sessions, storage,
    service: new RecordingsService(
      database as PrismaService,
      storage as ObjectStorage,
      dispatcher as JobDispatcher,
      sessions as LearningSessionsService,
      { maxBytes: 10 * 1024 * 1024, maxDurationSeconds: 120 },
      async () => 20,
    ),
  };
};

describe('RecordingsService', () => {
  it('rejects invalid audio before storage or database use', async () => {
    const setup = createService();

    await expect(setup.service.submit(input, {
      body: Buffer.from('not-webm'), mimeType: 'audio/webm;codecs=opus',
    })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'AUDIO_SIGNATURE_INVALID' }) });
    expect(setup.storage.put).not.toHaveBeenCalled();
    expect(setup.database.$transaction).not.toHaveBeenCalled();
  });

  it('deletes only the newly staged object when the database transaction fails', async () => {
    const setup = createService({
      database: {
        activityAttempt: { findUnique: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn().mockRejectedValue(new Error('database unavailable')),
      } as unknown as PrismaService,
    });

    await expect(setup.service.submit(input, file)).rejects.toThrow('database unavailable');
    expect(setup.storage.put).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'recordings' }));
    expect(setup.storage.delete).toHaveBeenCalledWith('recordings/server-generated');
  });

  it('returns a same-target race winner and deletes newly staged bytes', async () => {
    const existing = {
      id: ids.attempt, learnerId: ids.learner, sessionId: ids.session, activityId: ids.activity,
    };
    const transaction = {
      activityAttempt: { findUnique: vi.fn().mockResolvedValue(existing) },
      recording: { findUnique: vi.fn().mockResolvedValue({ id: ids.recording }) },
      job: { findFirst: vi.fn().mockResolvedValue({ id: ids.job }) },
    };
    const setup = createService({
      database: {
        activityAttempt: { findUnique: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn(async (callback) => callback(transaction)),
      } as unknown as PrismaService,
    });

    await expect(setup.service.submit(input, file)).resolves.toEqual({
      attemptId: ids.attempt, recordingId: ids.recording, jobId: ids.job, status: 'processing',
    });
    expect(setup.storage.delete).toHaveBeenCalledWith('recordings/server-generated');
    expect(setup.sessions.advanceSubmittedActivity).not.toHaveBeenCalled();
  });
});
