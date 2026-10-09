import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { SpeechToTextPort } from '../../ai-gateway/domain/speech-to-text.port.js';
import { ProviderError } from '../../ai-gateway/domain/provider-errors.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';
import { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import type { ClaimedJob, JobHandler } from '../../jobs/domain/job-handler.port.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';

const payloadSchema = z.object({ attemptId: z.string().min(1), recordingId: z.string().min(1) }).strict();

export interface TranscriptionHandlerOptions {
  readonly locale: string;
  readonly providerConfigVersion?: string;
  readonly recordingRetentionDays?: number;
}

export const TRANSCRIPTION_HANDLER_OPTIONS = Symbol('TRANSCRIPTION_HANDLER_OPTIONS');

@Injectable()
export class TranscribeSpeechHandler implements JobHandler {
  readonly type = 'TRANSCRIBE_SPEECH';

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
    @Inject(SpeechToTextPort) private readonly speech: SpeechToTextPort,
    @Inject(JobDispatcher) private readonly jobs: JobDispatcher,
    @Inject(TRANSCRIPTION_HANDLER_OPTIONS) private readonly options: TranscriptionHandlerOptions,
  ) {}

  async handle(job: ClaimedJob): Promise<Readonly<Record<string, unknown>>> {
    const payload = payloadSchema.parse(job.payload);
    try {
      return await this.process(payload);
    } catch (error) {
      const canRetry = error instanceof ProviderError
        && error.retryable
        && job.attemptNumber < job.maxAttempts;
      await this.database.activityAttempt.updateMany({
        where: { id: payload.attemptId, evaluationStatus: { not: 'EVALUATED' } },
        data: { evaluationStatus: canRetry ? 'QUEUED' : 'EVALUATION_FAILED' },
      }).catch(() => undefined);
      if (!canRetry) {
        const retentionUntil = new Date();
        retentionUntil.setUTCDate(
          retentionUntil.getUTCDate() + (this.options.recordingRetentionDays ?? 7),
        );
        await this.database.recording.updateMany({
          where: { id: payload.recordingId, retentionUntil: null },
          data: { retentionUntil },
        }).catch(() => undefined);
      }
      throw error;
    }
  }

  private async process(
    payload: { readonly attemptId: string; readonly recordingId: string },
  ): Promise<Readonly<Record<string, unknown>>> {
    const recording = await this.database.recording.findUnique({
      where: { id: payload.recordingId },
      include: { activity: true },
    });
    if (!recording || recording.attemptId !== payload.attemptId) {
      throw new NotFoundException('Recording for transcription was not found');
    }
    if (recording.deletionRequestedAt || recording.deletedAt) {
      throw new ProviderError('Recording is no longer available.', {
        code: 'RECORDING_EXPIRED', retryable: false,
      });
    }

    const transcriptReused = typeof recording.transcript === 'string'
      && recording.transcript.length > 0
      && recording.speechMetrics !== null;
    if (!transcriptReused) {
      const activity = activitySchema.parse({
        activityType: recording.activity.activityType,
        contentReferences: recording.activity.contentReferences,
        id: recording.activity.id,
        languageBlockReferences: recording.activity.languageBlockReferences,
        learningBlock: recording.activity.learningBlock,
        order: recording.activity.order,
        payload: recording.activity.payload,
        skills: recording.activity.skills,
        slug: recording.activity.slug,
      });
      if (activity.activityType !== 'speaking') {
        throw new Error('A recording can only be transcribed for a speaking activity');
      }
      const audio = await this.storage.read(recording.storageKey);
      const transcription = await this.speech.transcribe({
        audio,
        locale: this.options.locale,
        mimeType: recording.mimeType,
        referenceText: activity.payload.sampleAnswer,
      });
      await this.database.recording.update({
        where: { id: recording.id },
        data: {
          providerConfigVersion: this.options.providerConfigVersion ?? '1',
          providerName: transcription.provider.name,
          speechMetrics: transcription.pronunciation as unknown as Prisma.InputJsonValue,
          transcript: transcription.transcript,
        },
      });
    }

    const evaluationJob = await this.database.$transaction(async (transaction) => {
      const current = await transaction.recording.findUnique({
        where: { id: recording.id }, select: { deletedAt: true, deletionRequestedAt: true },
      });
      if (!current || current.deletionRequestedAt || current.deletedAt) {
        throw new ProviderError('Recording is no longer available.', {
          code: 'RECORDING_EXPIRED', retryable: false,
        });
      }
      await transaction.activityAttempt.update({
        where: { id: payload.attemptId },
        data: { evaluationStatus: 'PROCESSING' },
      });
      return this.jobs.enqueue({
        createdById: recording.learnerId,
        idempotencyKey: `evaluate:${payload.attemptId}`,
        payload: { attemptId: payload.attemptId },
        resourceId: payload.attemptId,
        resourceType: 'ActivityAttempt',
        type: 'EVALUATE_ATTEMPT',
      }, transaction);
    });
    return {
      attemptId: payload.attemptId,
      evaluationJobId: evaluationJob.id,
      recordingId: payload.recordingId,
      transcriptReused,
    };
  }
}
