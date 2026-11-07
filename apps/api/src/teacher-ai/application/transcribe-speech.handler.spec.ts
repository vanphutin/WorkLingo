import { createHash } from 'node:crypto';
import type { SpeechToTextPort } from '../../ai-gateway/domain/speech-to-text.port.js';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { describe, expect, it, vi } from 'vitest';

import { TranscribeSpeechHandler } from './transcribe-speech.handler.js';

describe('TranscribeSpeechHandler', () => {
  it('marks the attempt failed when retained audio was deleted before transcription', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const database = {
      activityAttempt: { updateMany },
      recording: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({
        id: 'recording-id', attemptId: 'attempt-id', deletionRequestedAt: new Date(), deletedAt: null,
      }) },
    } as unknown as PrismaService;
    const handler = new TranscribeSpeechHandler(
      database,
      {} as ObjectStorage,
      {} as SpeechToTextPort,
      {} as JobDispatcher,
      { locale: 'en-US' },
    );

    await expect(handler.handle({
      attemptNumber: 1, id: 'job-id', maxAttempts: 3,
      payload: { attemptId: 'attempt-id', recordingId: 'recording-id' },
      type: 'TRANSCRIBE_SPEECH',
    })).rejects.toMatchObject({ code: 'RECORDING_EXPIRED', retryable: false });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'attempt-id', evaluationStatus: { not: 'EVALUATED' } },
      data: { evaluationStatus: 'EVALUATION_FAILED' },
    });
  });

  it('reuses a persisted transcript on retry and only enqueues evaluation', async () => {
    const recording = {
      id: 'recording-id',
      attemptId: 'attempt-id',
      transcript: 'Hello, I am Lan from the support team.',
      speechMetrics: { accuracy: 0.92, completeness: 0.96, fluency: 0.84 },
      providerName: 'fake-microsoft-speech',
    };
    const transaction = {
      activityAttempt: { update: vi.fn() },
      recording: { findUnique: vi.fn().mockResolvedValue({ deletedAt: null, deletionRequestedAt: null }) },
    };
    const database = {
      recording: { findUnique: vi.fn().mockResolvedValue(recording), updateMany: vi.fn() },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const storage = { read: vi.fn() } as unknown as ObjectStorage;
    const speech = { transcribe: vi.fn() } as unknown as SpeechToTextPort;
    const jobs = { enqueue: vi.fn().mockResolvedValue({ id: 'evaluation-job' }) } as unknown as JobDispatcher;
    const handler = new TranscribeSpeechHandler(database, storage, speech, jobs, { locale: 'en-US' });

    const result = await handler.handle({
      attemptNumber: 2,
      id: 'transcription-job',
      maxAttempts: 3,
      payload: { attemptId: 'attempt-id', recordingId: 'recording-id' },
      type: 'TRANSCRIBE_SPEECH',
    });

    expect(storage.read).not.toHaveBeenCalled();
    expect(speech.transcribe).not.toHaveBeenCalled();
    expect(jobs.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: 'evaluate:attempt-id',
      payload: { attemptId: 'attempt-id' },
      type: 'EVALUATE_ATTEMPT',
    }), transaction);
    expect(result).toEqual({
      attemptId: 'attempt-id',
      evaluationJobId: 'evaluation-job',
      recordingId: 'recording-id',
      transcriptReused: true,
    });
  });
});

// Captures the persisted database boundary, using real transcription-handler orchestration.
describe('TranscribeSpeechHandler assessment evidence persistence', () => {
  function setup(mime = 'audio/webm', checksum = '9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a') {
    const recording = {
      id: 'recording-id', attemptId: 'attempt-id', learnerId: 'learner-id', storageKey: 'private-audio',
      transcript: null, speechMetrics: null, deletedAt: null, deletionRequestedAt: null,
      mimeType: mime, checksum,
      activity: { id: '00000000-0000-4000-8000-000000000001', slug: 'speak', order: 1, learningBlock: 'respond',
        skills: ['speaking'], contentReferences: ['content'], languageBlockReferences: ['language'], activityType: 'speaking',
        payload: { prompt: 'Say hello', sampleAnswer: 'Hello', minWords: 1, requiredPhrases: ['hello'], mode: 'shadowing' } },
    };
    const update = vi.fn().mockResolvedValue({});
    const transaction = { recording: { findUnique: vi.fn().mockResolvedValue({ deletedAt: null, deletionRequestedAt: null }) }, activityAttempt: { update: vi.fn() } };
    const database = { recording: { findUnique: vi.fn().mockResolvedValue(recording), update, updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      activityAttempt: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const storage = { read: vi.fn().mockResolvedValue(Uint8Array.from([1, 2, 3, 4])) } as unknown as ObjectStorage;
    const transcribe = vi.fn().mockResolvedValue({ transcript: 'Hello', locale: 'en-US', words: [{ word: 'Hello', offsetMs: 0, durationMs: 100 }],
      providerConfidence: 0.9, pronunciation: { accuracy: 0.8, fluency: 0.7 }, provider: { name: 'microsoft-speech', requestId: 'req-1' },
      acousticEvidence: { audioChecksum: checksum, dimensions: ['fluency'], unassessedDimensions: ['pronunciation'], words: [] },
    });
    const jobs = { enqueue: vi.fn().mockResolvedValue({ id: 'evaluation-job' }) } as unknown as JobDispatcher;
    return { update, storage, transcribe, handler: new TranscribeSpeechHandler(database, storage, { transcribe } as SpeechToTextPort, jobs, { locale: 'en-US' }) };
  }
  const job = { attemptNumber: 1, id: 'job-id', maxAttempts: 1, payload: { attemptId: 'attempt-id', recordingId: 'recording-id' }, type: 'TRANSCRIBE_SPEECH' };
  it('keeps legacy scores and persists unvalidated provider evidence without verifying it', async () => {
    const test = setup(); await test.handler.handle(job);
    expect(test.update).toHaveBeenCalledWith({where: {id: 'recording-id'}, data: expect.objectContaining({ speechMetrics: {
      accuracy: 0.8, fluency: 0.7, assessmentEvidence: expect.objectContaining({
        audioChecksum: '9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a',
        verified: false, providerConfidence: 0.9, requestId: 'req-1', dimensions: ['fluency'], words: [{ word: 'Hello', offsetMs: 0, durationMs: 100 }],
      }),
    } }) });
  });
  it('rejects retained bytes whose checksum changed before any provider call', async () => {
    const test = setup('audio/webm', 'a'.repeat(64));
    await expect(test.handler.handle(job)).rejects.toMatchObject({ code: 'INVALID_AUDIO' });
    expect(test.transcribe).not.toHaveBeenCalled();
  });
  it('rejects malformed PCM before any provider call', async () => {
    const test = setup('audio/wav');
    await expect(test.handler.handle(job)).rejects.toMatchObject({ code: 'INVALID_AUDIO' });
    expect(test.transcribe).not.toHaveBeenCalled();
  });
  it('persists validated PCM duration and authentic provider evidence', async () => {
    const bytes = Buffer.alloc(3244); bytes.write('RIFF'); bytes.writeUInt32LE(3236, 4); bytes.write('WAVE', 8);
    bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(16000, 24); bytes.writeUInt32LE(32000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
    bytes.write('data', 36); bytes.writeUInt32LE(3200, 40);
    for (let i = 44; i < bytes.length; i += 2) bytes.writeInt16LE(8000, i);
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const test = setup('audio/wav', checksum); vi.mocked(test.storage.read).mockResolvedValue(bytes);
    await test.handler.handle(job);
    expect(test.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ durationSeconds: 0.1,
      speechMetrics: expect.objectContaining({ assessmentEvidence: expect.objectContaining({ verified: true, synthetic: false, durationMs: 100, audioChecksum: checksum }) }),
    }) }));
  });
  it('labels fake provider evidence synthetic and unverified', async () => {
    const test = setup(); const output = await test.transcribe();
    test.transcribe.mockResolvedValue({ ...output, provider: { name: 'fake-microsoft-speech', requestId: null } });
    await test.handler.handle(job);
    expect(test.update).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({ speechMetrics: expect.objectContaining({
      assessmentEvidence: expect.objectContaining({ synthetic: true, verified: false }),
    }) }) }));
  });
});
