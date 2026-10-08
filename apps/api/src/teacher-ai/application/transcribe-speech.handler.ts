import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { SpeechToTextPort } from '../../ai-gateway/domain/speech-to-text.port.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';
import { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import type { ClaimedJob, JobHandler } from '../../jobs/domain/job-handler.port.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';

const payloadSchema = z.object({ attemptId: z.string().min(1), recordingId: z.string().min(1) }).strict();

export interface TranscriptionHandlerOptions {
  readonly locale: string;
  readonly providerConfigVersion?: string;
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
    const recording = await this.database.recording.findUnique({
      where: { id: payload.recordingId },
      include: { activity: true },
    });
    if (!recording || recording.attemptId !== payload.attemptId) {
      throw new NotFoundException('Recording for transcription was not found');
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
