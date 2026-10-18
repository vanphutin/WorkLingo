import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseLessonSource } from '@worklingo/content-format';
import {
  ContentAuthoringErrorCode,
  type AudioArtifactDto,
  type AudioArtifactStatus,
  type GenerateAudioInput,
  type GenerateAudioResult,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { TextToSpeechProviderRegistry } from '../../ai-gateway/application/text-to-speech-provider.registry.js';
import { TextToSpeechPort } from '../../ai-gateway/domain/text-to-speech.port.js';
import { SIMULATION_AUDIO_LABEL } from '../../ai-gateway/infrastructure/fake-tts.adapter.js';
import { AZURE_AUDIO_GENERATION_VERSION } from '../../ai-gateway/infrastructure/azure-dialogue-ssml.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import { JobRunnerService } from '../../jobs/application/job-runner.service.js';

const canonicalizeJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalizeJson(nested)]),
    );
  }
  return value;
};

@Injectable()
export class AudioGenerationService implements OnApplicationShutdown {
  private readonly activeJobs = new Map<string, Promise<void>>();

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
    @Inject(TextToSpeechPort) private readonly tts: TextToSpeechPort,
    @Inject(TextToSpeechProviderRegistry)
    private readonly ttsProviders: TextToSpeechProviderRegistry,
    @Optional() @Inject(JobDispatcher) private readonly jobs?: JobDispatcher,
    @Optional() @Inject(JobRunnerService) private readonly runner?: JobRunnerService,
  ) {}

  waitForJob(jobId: string): Promise<void> {
    return this.activeJobs.get(jobId) ?? Promise.resolve();
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([...this.activeJobs.values()]);
  }

  async generateAudio(
    contentImportId: string,
    actorId: string,
    input: GenerateAudioInput,
  ): Promise<GenerateAudioResult> {
    const providerId = input.providerId ?? this.tts.providerName;
    const descriptor = this.ttsProviders.list().find((candidate) => candidate.id === providerId);
    const voiceId = input.voiceId ?? descriptor?.defaultVoiceId ?? '';
    const voiceConfig: Record<string, unknown> = { ...(input.voiceConfig ?? {}), voice: voiceId };
    // Audit fields come from synthesis, never from the caller. Version participates
    // in both variant and request hashes so pre-dialogue artifacts cannot be reused.
    delete voiceConfig.speakerVoices;
    if (providerId === 'azure-speech') voiceConfig.generationVersion = AZURE_AUDIO_GENERATION_VERSION;
    const normalizedVoiceConfig = canonicalizeJson(voiceConfig) as Record<string, unknown>;
    const variantKey = `${providerId}:${voiceId}:${createHash('sha256')
      .update(JSON.stringify(normalizedVoiceConfig)).digest('hex')}`;
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          audioScriptSlug: input.audioScriptSlug,
          contentImportId,
          idempotencyKey: input.idempotencyKey,
          providerId,
          voiceConfig: normalizedVoiceConfig,
          voiceId,
        }),
      )
      .digest('hex');

    // 1. Idempotency check
    const existingReceipt = await this.database.mutationReceipt.findUnique({
      where: {
        actorId_operation_idempotencyKey: {
          actorId,
          operation: 'generate-audio',
          idempotencyKey: input.idempotencyKey,
        },
      },
    });

    if (existingReceipt) {
      if (existingReceipt.requestHash === requestHash) {
        return existingReceipt.responseBody as unknown as GenerateAudioResult;
      }
      throw new ConflictException({
        code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
        message: 'Idempotency key reused with different request payload',
        statusCode: 409,
      });
    }
    this.ttsProviders.assertVoiceSupported(providerId, voiceId);

    // 2. ContentImport lookup
    const contentImport = await this.database.contentImport.findUnique({
      where: { id: contentImportId },
    });

    if (!contentImport) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Content import ${contentImportId} not found`,
        statusCode: 404,
      });
    }

    // 3. Resolve target audio script from lesson source
    const parseRes = parseLessonSource(contentImport.rawSource);
    const audioScripts = parseRes.document.audioScripts;

    let targetScriptText = '';
    let targetSlug = input.audioScriptSlug ?? '';

    if (input.audioScriptSlug) {
      const target = audioScripts.find((s) => s.slug === input.audioScriptSlug);
      if (!target) {
        throw new NotFoundException({
          code: 'AUDIO_SCRIPT_NOT_FOUND',
          message: `Audio script ${input.audioScriptSlug} not found in lesson source`,
          statusCode: 404,
        });
      }
      targetScriptText = target.script;
      targetSlug = target.slug;
    } else {
      const firstScript = audioScripts[0];
      if (!firstScript) {
        throw new NotFoundException({
          code: 'NO_AUDIO_SCRIPTS',
          message: 'No audio scripts found in lesson source',
          statusCode: 404,
        });
      }
      targetScriptText = firstScript.script;
      targetSlug = firstScript.slug;
    }

    const scriptHash = createHash('sha256')
      .update(targetScriptText)
      .digest('hex');

    const artifactId = randomUUID();
    const generationKey = createHash('sha256')
      .update(`${actorId}:generate-audio:${input.idempotencyKey}`)
      .digest('hex');
    let result: GenerateAudioResult;
    try {
      result = await this.database.$transaction(async (transaction) => {
        const receiptAfterLock = await transaction.mutationReceipt.findUnique({
          where: {
            actorId_operation_idempotencyKey: {
              actorId,
              operation: 'generate-audio',
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (receiptAfterLock) {
          if (receiptAfterLock.requestHash === requestHash) {
            return receiptAfterLock.responseBody as unknown as GenerateAudioResult;
          }
          throw new ConflictException({
            code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
            message: 'Idempotency key reused with different request payload',
            statusCode: 409,
          });
        }

        await transaction.audioArtifact.create({
          data: {
            id: artifactId,
            contentImportId,
            audioScriptSlug: targetSlug,
            scriptHash,
            adapterName: providerId,
            generationKey,
            variantKey,
            voiceConfig: normalizedVoiceConfig as Prisma.InputJsonValue,
            mimeType: 'audio/wav',
            byteSize: 0,
            checksum: '',
            storageKey: '',
            status: 'GENERATING',
          },
        });

        const payload = {
          artifactId,
          audioScriptSlug: targetSlug,
          contentImportId,
          providerId,
          scriptHash,
          variantKey,
          voiceConfig: normalizedVoiceConfig,
          voiceId,
        };
        const job = this.jobs
          ? await this.jobs.enqueue({
              contentImportId,
              createdById: actorId,
              idempotencyKey: `tts:${actorId}:${input.idempotencyKey}`,
              payload,
              resourceId: contentImportId,
              resourceType: 'ContentImport',
              type: 'GENERATE_AUDIO',
            }, transaction)
          : await transaction.job.create({
              data: {
                type: 'generate-audio',
                status: 'PENDING',
                payload: payload as Prisma.InputJsonValue,
                contentImportId,
                createdById: actorId,
              },
            });
        const accepted: GenerateAudioResult = {
          jobId: job.id,
          status: job.status === 'RETRY_WAIT' ? 'PENDING' : job.status,
          audioScriptSlug: targetSlug,
        };
        await transaction.mutationReceipt.create({
          data: {
            actorId,
            operation: 'generate-audio',
            idempotencyKey: input.idempotencyKey,
            requestHash,
            responseStatus: 202,
            responseBody: accepted as unknown as Prisma.InputJsonValue,
          },
        });
        return accepted;
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const concurrentReceipt = await this.database.mutationReceipt.findUnique({
        where: { actorId_operation_idempotencyKey: {
          actorId,
          operation: 'generate-audio',
          idempotencyKey: input.idempotencyKey,
        } },
      });
      if (!concurrentReceipt || concurrentReceipt.requestHash !== requestHash) {
        throw new ConflictException({
          code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
          message: 'Idempotency key reused with different request payload',
          statusCode: 409,
        });
      }
      result = concurrentReceipt.responseBody as unknown as GenerateAudioResult;
    }

    if (this.jobs && this.runner) {
      const run = this.runQueuedJob(result.jobId);
      this.activeJobs.set(result.jobId, run);
      void run.then(
        () => this.activeJobs.delete(result.jobId),
        () => this.activeJobs.delete(result.jobId),
      );
      return result;
    }

    const jobPromise = this.runGenerationJob(
      result.jobId,
      artifactId,
      contentImportId,
      targetSlug,
      targetScriptText,
      scriptHash,
      providerId,
      normalizedVoiceConfig,
    );
    this.activeJobs.set(result.jobId, jobPromise);
    void jobPromise.then(
      () => this.activeJobs.delete(result.jobId),
      () => this.activeJobs.delete(result.jobId),
    );

    return result;
  }

  private async runQueuedJob(jobId: string): Promise<void> {
    if (!this.runner) return;
    for (let iteration = 0; iteration < 20; iteration += 1) {
      const row = await this.database.job.findUnique({ where: { id: jobId } });
      if (row?.status === 'COMPLETED' || row?.status === 'FAILED') return;
      const ran = await this.runner.runOnce();
      if (!ran) return;
    }
  }

  private async runGenerationJob(
    jobId: string,
    artifactId: string,
    contentImportId: string,
    audioScriptSlug: string,
    scriptText: string,
    scriptHash: string,
    providerId: string,
    voiceConfig: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.database.job.update({
        where: { id: jobId },
        data: { status: 'RUNNING' },
      });

      const provider = this.ttsProviders.resolve(providerId);
      const synthesized = await provider.synthesize({
        script: scriptText,
        voiceConfig,
      });

      const storageResult = await this.storage.put({
        body: synthesized.audioBytes,
        contentType: synthesized.mimeType,
        prefix: 'generated-audio',
      });

      // Out-of-order check: check if content source was updated while synthesizing
      const currentImport = await this.database.contentImport.findUnique({
        where: { id: contentImportId },
      });

      let isStale = false;
      if (currentImport) {
        const freshParse = parseLessonSource(currentImport.rawSource);
        const currentScript = freshParse.document.audioScripts.find(
          (s) => s.slug === audioScriptSlug,
        );
        if (!currentScript) {
          isStale = true;
        } else {
          const currentHash = createHash('sha256')
            .update(currentScript.script)
            .digest('hex');
          if (currentHash !== scriptHash) {
            isStale = true;
          }
        }
      }

      const finalStatus: AudioArtifactStatus = isStale ? 'STALE' : 'READY';
      const updatedArtifact = await this.database.audioArtifact.updateMany({
        where: { id: artifactId, status: 'GENERATING' },
        data: {
          adapterName: synthesized.provider?.name ?? provider.providerName,
          status: finalStatus,
          mimeType: synthesized.mimeType,
          byteSize: storageResult.size,
          checksum: synthesized.checksum,
          storageKey: storageResult.key,
          voiceConfig: {
            ...voiceConfig,
            ...(synthesized.provider ? { voice: synthesized.provider.voice } : {}),
            ...(synthesized.provider?.speakerVoices ? {
              speakerVoices: synthesized.provider.speakerVoices.map((assignment) => ({ ...assignment })),
            } : {}),
          },
          failureSummary: isStale ? 'Script changed during generation' : null,
        },
      });
      if (updatedArtifact.count !== 1) {
        throw new Error('Audio candidate is no longer mutable');
      }

      await this.database.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          result: {
            artifactId,
            status: finalStatus,
          },
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown generation error';

      await this.database.job
        .update({
          where: { id: jobId },
          data: { status: 'FAILED', error: message },
        })
        .catch(() => undefined);

      await this.database.audioArtifact
        .updateMany({
          where: { id: artifactId, status: 'GENERATING' },
          data: {
            status: 'FAILED',
            failureSummary: message,
          },
        })
        .catch(() => undefined);
    }
  }

  async listAudio(
    contentImportId: string,
    _actorId: string,
  ): Promise<AudioArtifactDto[]> {
    const records = await this.database.audioArtifact.findMany({
      where: { contentImportId },
      orderBy: { createdAt: 'asc' },
    });

    return records
      .filter((record): record is typeof record & { contentImportId: string } =>
        record.contentImportId !== null)
      .map((record) => ({
        id: record.id,
        contentImportId: record.contentImportId,
        audioScriptSlug: record.audioScriptSlug,
        scriptHash: record.scriptHash,
        variantKey: record.variantKey,
        adapterName: record.adapterName,
        voiceConfig: record.voiceConfig as Record<string, unknown>,
        mimeType: record.mimeType,
        byteSize: record.byteSize,
        checksum: record.checksum,
        storageKey: record.storageKey,
        status: record.status as AudioArtifactStatus,
        failureSummary: record.failureSummary,
        ...(record.adapterName === 'fake-tts' ? { simulationLabel: SIMULATION_AUDIO_LABEL } : {}),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }));
  }

  async getArtifact(
    artifactId: string,
    _actorId: string,
  ): Promise<{
    artifact: AudioArtifactDto;
    audioBytes: Buffer;
  }> {
    const record = await this.database.audioArtifact.findUnique({
      where: { id: artifactId },
    });

    if (!record || record.contentImportId === null) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Audio artifact ${artifactId} not found`,
        statusCode: 404,
      });
    }

    const audioBytes = await this.storage.read(record.storageKey);

    return {
      artifact: {
        id: record.id,
        contentImportId: record.contentImportId,
        audioScriptSlug: record.audioScriptSlug,
        scriptHash: record.scriptHash,
        variantKey: record.variantKey,
        adapterName: record.adapterName,
        voiceConfig: record.voiceConfig as Record<string, unknown>,
        mimeType: record.mimeType,
        byteSize: record.byteSize,
        checksum: record.checksum,
        storageKey: record.storageKey,
        status: record.status as AudioArtifactStatus,
        failureSummary: record.failureSummary,
        ...(record.adapterName === 'fake-tts' ? { simulationLabel: SIMULATION_AUDIO_LABEL } : {}),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
      audioBytes,
    };
  }
}
