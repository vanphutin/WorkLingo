import { createHash } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { parseLessonSource } from '@worklingo/content-format';
import {
  ContentAuthoringErrorCode,
  type AudioArtifactDto,
  type AudioArtifactStatus,
  type GenerateAudioInput,
  type GenerateAudioResult,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { TextToSpeechPort } from '../domain/text-to-speech.port.js';
import { SIMULATION_AUDIO_LABEL } from '../infrastructure/fake-tts.adapter.js';

@Injectable()
export class AudioGenerationService {
  private readonly activeJobs = new Map<string, Promise<void>>();

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
    @Inject(TextToSpeechPort) private readonly tts: TextToSpeechPort,
  ) {}

  waitForJob(jobId: string): Promise<void> {
    return this.activeJobs.get(jobId) ?? Promise.resolve();
  }

  async generateAudio(
    contentImportId: string,
    actorId: string,
    input: GenerateAudioInput,
  ): Promise<GenerateAudioResult> {
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          audioScriptSlug: input.audioScriptSlug,
          idempotencyKey: input.idempotencyKey,
          voiceConfig: input.voiceConfig,
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

    // 4. Initial AudioArtifact record (GENERATING)
    await this.database.audioArtifact.upsert({
      where: {
        contentImportId_audioScriptSlug_scriptHash: {
          contentImportId,
          audioScriptSlug: targetSlug,
          scriptHash,
        },
      },
      create: {
        contentImportId,
        audioScriptSlug: targetSlug,
        scriptHash,
        adapterName: 'fake-tts',
        voiceConfig: (input.voiceConfig ?? {}) as Prisma.InputJsonValue,
        mimeType: 'audio/wav',
        byteSize: 0,
        checksum: '',
        storageKey: '',
        status: 'GENERATING',
      },
      update: {
        status: 'GENERATING',
        failureSummary: null,
      },
    });

    // 5. Create Job record
    const job = await this.database.job.create({
      data: {
        type: 'generate-audio',
        status: 'PENDING',
        payload: {
          contentImportId,
          audioScriptSlug: targetSlug,
          scriptHash,
          voiceConfig: (input.voiceConfig ?? {}) as Prisma.InputJsonValue,
        } as unknown as Prisma.InputJsonValue,
        contentImportId,
        createdById: actorId,
      },
    });

    const result: GenerateAudioResult = {
      jobId: job.id,
      status: 'PENDING',
      audioScriptSlug: targetSlug,
    };

    // 6. Record receipt
    await this.database.mutationReceipt.create({
      data: {
        actorId,
        operation: 'generate-audio',
        idempotencyKey: input.idempotencyKey,
        requestHash,
        responseStatus: 202,
        responseBody: result as unknown as Prisma.InputJsonValue,
      },
    });

    // 7. Dispatch background execution
    const jobPromise = this.runGenerationJob(
      job.id,
      contentImportId,
      targetSlug,
      targetScriptText,
      scriptHash,
      input.voiceConfig ?? {},
    );
    this.activeJobs.set(job.id, jobPromise);
    void jobPromise.finally(() => {
      this.activeJobs.delete(job.id);
    });

    return result;
  }

  private async runGenerationJob(
    jobId: string,
    contentImportId: string,
    audioScriptSlug: string,
    scriptText: string,
    scriptHash: string,
    voiceConfig: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.database.job.update({
        where: { id: jobId },
        data: { status: 'RUNNING' },
      });

      const synthesized = await this.tts.synthesize({
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
      const updatedArtifact = await this.database.audioArtifact.update({
        where: {
          contentImportId_audioScriptSlug_scriptHash: {
            contentImportId,
            audioScriptSlug,
            scriptHash,
          },
        },
        data: {
          status: finalStatus,
          mimeType: synthesized.mimeType,
          byteSize: storageResult.size,
          checksum: synthesized.checksum,
          storageKey: storageResult.key,
          failureSummary: isStale ? 'Script changed during generation' : null,
        },
      });

      // If READY, mark any prior artifacts for this slug with a different scriptHash as STALE
      if (!isStale) {
        await this.database.audioArtifact.updateMany({
          where: {
            contentImportId,
            audioScriptSlug,
            scriptHash: { not: scriptHash },
            status: { not: 'STALE' },
          },
          data: { status: 'STALE' },
        });
      }

      await this.database.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          result: {
            artifactId: updatedArtifact.id,
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
        .update({
          where: {
            contentImportId_audioScriptSlug_scriptHash: {
              contentImportId,
              audioScriptSlug,
              scriptHash,
            },
          },
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

    return records.map((record) => ({
      id: record.id,
      contentImportId: record.contentImportId,
      audioScriptSlug: record.audioScriptSlug,
      scriptHash: record.scriptHash,
      adapterName: record.adapterName,
      voiceConfig: record.voiceConfig as Record<string, unknown>,
      mimeType: record.mimeType,
      byteSize: record.byteSize,
      checksum: record.checksum,
      storageKey: record.storageKey,
      status: record.status as AudioArtifactStatus,
      failureSummary: record.failureSummary,
      simulationLabel: SIMULATION_AUDIO_LABEL,
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

    if (!record) {
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
        adapterName: record.adapterName,
        voiceConfig: record.voiceConfig as Record<string, unknown>,
        mimeType: record.mimeType,
        byteSize: record.byteSize,
        checksum: record.checksum,
        storageKey: record.storageKey,
        status: record.status as AudioArtifactStatus,
        failureSummary: record.failureSummary,
        simulationLabel: SIMULATION_AUDIO_LABEL,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
      audioBytes,
    };
  }
}
