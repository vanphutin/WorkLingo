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
