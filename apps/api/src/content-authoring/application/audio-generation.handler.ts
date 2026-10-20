import { createHash } from 'node:crypto';

import { Inject, Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { audioScriptFingerprintText, parseLessonSource, spokenScript } from '@worklingo/content-format';
import { assertNarrationReviewed, narrationReviewIssues } from './audio-narration.js';
import { z } from 'zod';

import { TextToSpeechProviderRegistry } from '../../ai-gateway/application/text-to-speech-provider.registry.js';
import { ProviderError } from '../../ai-gateway/domain/provider-errors.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { JobHandlerRegistry } from '../../jobs/application/job-runner.service.js';
import type { ClaimedJob, JobHandler } from '../../jobs/domain/job-handler.port.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';

const payloadSchema = z.object({
  artifactId: z.string().uuid(),
  audioScriptSlug: z.string().min(1),
  contentImportId: z.string().uuid(),
  providerId: z.string().min(1),
  scriptHash: z.string().min(1),
  variantKey: z.string().min(1),
  voiceConfig: z.record(z.string(), z.unknown()),
  voiceId: z.string().min(1),
}).strict();

@Injectable()
export class AudioGenerationHandler implements JobHandler, OnModuleInit {
  readonly type = 'GENERATE_AUDIO';

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
    @Inject(TextToSpeechProviderRegistry)
    private readonly ttsProviders: TextToSpeechProviderRegistry,
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
      const document = parseLessonSource(contentImport.rawSource).document;
      assertNarrationReviewed(document);
      const script = document.audioScripts
        .find((candidate) => candidate.slug === payload.audioScriptSlug);
      if (!script) throw new Error('Reviewed audio script is no longer available');
      const currentHash = createHash('sha256').update(audioScriptFingerprintText(script)).digest('hex');
      if (currentHash !== payload.scriptHash) {
        await this.markArtifact(payload, { status: 'STALE', failureSummary: 'Script changed before generation' });
        return { audioScriptSlug: payload.audioScriptSlug, status: 'STALE' };
      }
      this.ttsProviders.assertVoiceSupported(payload.providerId, payload.voiceId);
      const provider = this.ttsProviders.resolve(payload.providerId);
      const candidate = await this.database.audioArtifact.findFirstOrThrow({
        where: {
          adapterName: payload.providerId,
          audioScriptSlug: payload.audioScriptSlug,
          contentImportId: payload.contentImportId,
          id: payload.artifactId,
          scriptHash: payload.scriptHash,
          status: 'GENERATING',
          variantKey: payload.variantKey,
        },
      });
      const synthesized = await provider.synthesize({
        script: spokenScript(script),
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
      const stale = !latestScript || (latest && narrationReviewIssues(parseLessonSource(latest.rawSource).document).some(i => i.severity === 'error'))
        || createHash('sha256').update(audioScriptFingerprintText(latestScript)).digest('hex') !== payload.scriptHash;
      const artifact = await this.database.audioArtifact.updateMany({
        where: { id: candidate.id, status: 'GENERATING' },
        data: {
          adapterName: synthesized.provider?.name ?? provider.providerName,
          byteSize: stored.size,
          checksum: synthesized.checksum,
          failureSummary: stale ? 'Script changed during generation' : null,
          mimeType: synthesized.mimeType,
          status: stale ? 'STALE' : 'READY',
          storageKey: stored.key,
          voiceConfig: {
            ...payload.voiceConfig,
            ...(synthesized.provider ? { voice: synthesized.provider.voice } : {}),
            ...(synthesized.provider?.speakerVoices ? {
              speakerVoices: synthesized.provider.speakerVoices.map((assignment) => ({ ...assignment })),
            } : {}),
          } as Prisma.InputJsonValue,
        },
      });
      if (artifact.count !== 1) throw new Error('Audio candidate is no longer mutable');
      return { artifactId: candidate.id, status: stale ? 'STALE' : 'READY' };
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
    return this.database.audioArtifact.updateMany({
      where: {
        id: payload.artifactId,
        status: 'GENERATING',
      },
      data,
    });
  }
}
