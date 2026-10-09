import { createHash } from 'node:crypto';

import { Inject, Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { parseLessonSource } from '@worklingo/content-format';
import { z } from 'zod';

import { TextToSpeechPort } from '../../ai-gateway/domain/text-to-speech.port.js';
import { ProviderError } from '../../ai-gateway/domain/provider-errors.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { JobHandlerRegistry } from '../../jobs/application/job-runner.service.js';
import type { ClaimedJob, JobHandler } from '../../jobs/domain/job-handler.port.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';

const payloadSchema = z.object({
  audioScriptSlug: z.string().min(1),
  contentImportId: z.string().uuid(),
  scriptHash: z.string().min(1),
  voiceConfig: z.record(z.string(), z.unknown()),
}).strict();

@Injectable()
export class AudioGenerationHandler implements JobHandler, OnModuleInit {
  readonly type = 'GENERATE_AUDIO';

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
    @Inject(TextToSpeechPort) private readonly tts: TextToSpeechPort,
    @Inject(JobHandlerRegistry) private readonly registry: JobHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handle(job: ClaimedJob): Promise<Readonly<Record<string, unknown>>> {
    const payload = payloadSchema.parse(job.payload);
    try {
      const contentImport = await this.database.contentImport.findUnique({
        where: { id: payload.contentImportId },
      });
      if (!contentImport) throw new NotFoundException('Content import for audio was not found');
      const script = parseLessonSource(contentImport.rawSource).document.audioScripts
        .find((candidate) => candidate.slug === payload.audioScriptSlug);
      if (!script) throw new Error('Reviewed audio script is no longer available');
      const currentHash = createHash('sha256').update(script.script).digest('hex');
      if (currentHash !== payload.scriptHash) {
        await this.markArtifact(payload, { status: 'STALE', failureSummary: 'Script changed before generation' });
        return { audioScriptSlug: payload.audioScriptSlug, status: 'STALE' };
      }
      const synthesized = await this.tts.synthesize({
        script: script.script,
        voiceConfig: payload.voiceConfig,
        ...(script.speaker ? { speaker: script.speaker } : {}),
      });
      const stored = await this.storage.put({
        body: synthesized.audioBytes, contentType: synthesized.mimeType, prefix: 'generated-audio',
      });
      const latest = await this.database.contentImport.findUnique({ where: { id: payload.contentImportId } });
      const latestScript = latest
        ? parseLessonSource(latest.rawSource).document.audioScripts
          .find((candidate) => candidate.slug === payload.audioScriptSlug)
        : undefined;
      const stale = !latestScript
        || createHash('sha256').update(latestScript.script).digest('hex') !== payload.scriptHash;
      const artifact = await this.database.audioArtifact.update({
        where: { contentImportId_audioScriptSlug_scriptHash: {
          audioScriptSlug: payload.audioScriptSlug,
          contentImportId: payload.contentImportId,
          scriptHash: payload.scriptHash,
        } },
        data: {
          adapterName: synthesized.provider?.name ?? this.tts.providerName,
          byteSize: stored.size,
          checksum: synthesized.checksum,
          failureSummary: stale ? 'Script changed during generation' : null,
          mimeType: synthesized.mimeType,
          status: stale ? 'STALE' : 'READY',
          storageKey: stored.key,
          voiceConfig: {
            ...payload.voiceConfig,
            ...(synthesized.provider ? { voice: synthesized.provider.voice } : {}),
          } as Prisma.InputJsonValue,
        },
      });
      if (!stale) {
        await this.database.audioArtifact.updateMany({
          where: {
            audioScriptSlug: payload.audioScriptSlug,
            contentImportId: payload.contentImportId,
            scriptHash: { not: payload.scriptHash },
            status: { not: 'STALE' },
          },
          data: { status: 'STALE' },
        });
      }
      return { artifactId: artifact.id, status: artifact.status };
    } catch (error) {
      const retryable = error instanceof ProviderError && error.retryable;
      if (!retryable || job.attemptNumber >= job.maxAttempts) {
        await this.markArtifact(payload, {
          status: 'FAILED', failureSummary: 'Audio generation failed.',
        }).catch(() => undefined);
      }
      throw error;
    }
  }

  private markArtifact(
    payload: z.infer<typeof payloadSchema>,
    data: { readonly failureSummary: string; readonly status: 'FAILED' | 'STALE' },
  ) {
    return this.database.audioArtifact.update({
      where: { contentImportId_audioScriptSlug_scriptHash: {
        audioScriptSlug: payload.audioScriptSlug,
        contentImportId: payload.contentImportId,
        scriptHash: payload.scriptHash,
      } },
      data,
    });
  }
}
