import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type ActivityAttempt } from '@prisma/client';
import type { RecordingSubmissionResult } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import { LearningSessionsService } from '../../learning-sessions/application/learning-sessions.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import {
  AudioUploadPolicyError,
  type AudioDurationReader,
  type AudioUpload,
  type AudioUploadLimits,
  validateAudioUpload,
  validateRecordingConsent,
} from '../domain/audio-upload-policy.js';

export interface SubmitRecordingInput {
  readonly activityId: string;
  readonly clientAttemptId: string;
  readonly consentAccepted: boolean;
  readonly consentPolicyVersion: string;
  readonly consentScope: string;
  readonly learnerId: string;
  readonly sessionId: string;
}

export const AUDIO_DURATION_READER = Symbol('AUDIO_DURATION_READER');
export const AUDIO_UPLOAD_LIMITS = Symbol('AUDIO_UPLOAD_LIMITS');

@Injectable()
export class RecordingsService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
    @Inject(JobDispatcher) private readonly jobs: JobDispatcher,
    @Inject(LearningSessionsService) private readonly sessions: LearningSessionsService,
    @Inject(AUDIO_UPLOAD_LIMITS) private readonly limits: AudioUploadLimits,
    @Inject(AUDIO_DURATION_READER) private readonly readDuration: AudioDurationReader,
  ) {}

  async deleteOwned(learnerId: string, recordingId: string): Promise<void> {
    const recording = await this.database.recording.findFirst({
      where: { id: recordingId, learnerId },
    });
    if (!recording) throw new NotFoundException('Recording not found');
    if (recording.deletedAt) return;

    await this.database.$transaction(async (transaction) => {
      await transaction.recording.update({
        where: { id: recording.id },
        data: { deletionRequestedAt: recording.deletionRequestedAt ?? new Date() },
      });
      await transaction.job.updateMany({
        where: {
          resourceId: recording.attemptId,
          resourceType: 'ActivityAttempt',
          status: { in: ['PENDING', 'RETRY_WAIT'] },
          type: 'TRANSCRIBE_SPEECH',
        },
        data: {
          completedAt: new Date(),
          error: 'Recording was deleted by the learner.',
          errorCode: 'RECORDING_EXPIRED',
          errorSummary: 'Recording is no longer available.',
          retryable: false,
          status: 'FAILED',
        },
      });
      await transaction.activityAttempt.updateMany({
        where: { id: recording.attemptId, evaluationStatus: { not: 'EVALUATED' } },
        data: { evaluationStatus: 'EVALUATION_FAILED' },
      });
    });

    try {
      await this.storage.delete(recording.storageKey);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    await this.database.recording.update({
      where: { id: recording.id },
      data: { deletedAt: new Date() },
    });
  }

  async submit(
    input: SubmitRecordingInput,
    upload: AudioUpload,
  ): Promise<RecordingSubmissionResult> {
    let consent: { policyVersion: string; scope: string };
    let inspection: { durationSeconds: number };
    try {
      consent = validateRecordingConsent({
        accepted: input.consentAccepted,
        policyVersion: input.consentPolicyVersion,
        scope: input.consentScope,
      });
      inspection = await validateAudioUpload(upload, this.limits, this.readDuration);
    } catch (error) {
      if (error instanceof AudioUploadPolicyError) throw this.policyException(error);
      throw error;
    }

    const prior = await this.database.activityAttempt.findUnique({
      where: {
        learnerId_clientAttemptId: {
          learnerId: input.learnerId,
          clientAttemptId: input.clientAttemptId,
        },
      },
    });
    if (prior) return this.resolveExisting(prior, input);

    const context = await this.sessions.requireCurrentActivity(
      input.learnerId, input.sessionId, input.activityId, 'speaking',
    );
    const stored = await this.storage.put({
      body: upload.body,
      contentType: upload.mimeType,
      prefix: 'recordings',
    });

    try {
      const outcome = await this.database.$transaction(async (transaction) => {
        const duplicate = await transaction.activityAttempt.findUnique({
          where: {
            learnerId_clientAttemptId: {
              learnerId: input.learnerId,
              clientAttemptId: input.clientAttemptId,
            },
          },
        });
        if (duplicate) {
          return { result: await this.resolveExisting(duplicate, input, transaction), reused: true };
        }

        const attempt = await transaction.activityAttempt.create({
          data: {
            activityId: input.activityId,
            clientAttemptId: input.clientAttemptId,
            evaluationStatus: 'QUEUED',
            learnerId: input.learnerId,
            rawResponse: {
              kind: 'recording', mimeType: upload.mimeType, durationSeconds: inspection.durationSeconds,
            },
            sessionId: input.sessionId,
          },
        });
        const recording = await transaction.recording.create({
          data: {
            activityId: input.activityId,
            attemptId: attempt.id,
            byteSize: upload.body.byteLength,
            checksum: createHash('sha256').update(upload.body).digest('hex'),
            consentAcceptedAt: new Date(),
            consentPolicyVersion: consent.policyVersion,
            consentScope: consent.scope,
            durationSeconds: inspection.durationSeconds,
            learnerId: input.learnerId,
            mimeType: upload.mimeType,
            sessionId: input.sessionId,
            storageKey: stored.key,
          },
        });
        const job = await this.jobs.enqueue({
          createdById: input.learnerId,
          idempotencyKey: `transcribe:${attempt.id}`,
          payload: { attemptId: attempt.id, recordingId: recording.id },
          resourceId: attempt.id,
          resourceType: 'ActivityAttempt',
          type: 'TRANSCRIBE_SPEECH',
        }, transaction);
        await this.sessions.advanceSubmittedActivity(transaction, input.learnerId, context);
        return {
          reused: false,
          result: {
            attemptId: attempt.id,
            recordingId: recording.id,
            jobId: job.id,
            status: 'processing' as const,
          },
        };
      });
      if (outcome.reused) await this.deleteStaged(stored.key);
      return outcome.result;
    } catch (error) {
      await this.deleteStaged(stored.key);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.activityAttempt.findUnique({
          where: {
            learnerId_clientAttemptId: {
              learnerId: input.learnerId,
              clientAttemptId: input.clientAttemptId,
            },
          },
        });
        if (winner) return this.resolveExisting(winner, input);
      }
      throw error;
    }
  }

  private async resolveExisting(
    attempt: ActivityAttempt,
    input: SubmitRecordingInput,
    database: Prisma.TransactionClient | PrismaService = this.database,
  ): Promise<RecordingSubmissionResult> {
    if (attempt.sessionId !== input.sessionId || attempt.activityId !== input.activityId) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_REUSED',
        message: 'The client attempt ID is already associated with another target.',
        statusCode: 409,
      });
    }
    const [recording, job] = await Promise.all([
      database.recording.findUnique({ where: { attemptId: attempt.id } }),
      database.job.findFirst({
        where: { resourceType: 'ActivityAttempt', resourceId: attempt.id, type: 'TRANSCRIBE_SPEECH' },
      }),
    ]);
    if (!recording || !job) throw new ConflictException('Speaking submission is incomplete; retry later.');
    return { attemptId: attempt.id, recordingId: recording.id, jobId: job.id, status: 'processing' };
  }

  private policyException(error: AudioUploadPolicyError): BadRequestException | UnprocessableEntityException {
    const response = { code: error.code, message: error.message };
    return error.code === 'AUDIO_TOO_LONG'
      ? new UnprocessableEntityException({ ...response, statusCode: 422 })
      : new BadRequestException({ ...response, statusCode: 400 });
  }

  private async deleteStaged(key: string): Promise<void> {
    await this.storage.delete(key).catch(() => undefined);
  }
}
