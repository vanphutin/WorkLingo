import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AdminAudioSettings,
  AudioSettings,
  AudioSourceId,
  TtsProviderCapability,
} from '@worklingo/contracts';

import {
  TextToSpeechProviderRegistry,
  TtsProviderSelectionError,
} from '../../ai-gateway/application/text-to-speech-provider.registry.js';
import type { TtsProviderDescriptor } from '../../ai-gateway/domain/text-to-speech.port.js';
import type { AppConfig } from '../../common/config/app-config.schema.js';
import { PrismaService } from '../../common/database/prisma.service.js';

const AUDIO_SOURCE_IDS = new Set<AudioSourceId>([
  'system-default',
  'published-audio',
  'browser-tts',
]);

interface LearnerSettingsUpdate {
  readonly browserVoiceId?: string | null;
  readonly sourceId: string;
}

interface AdminSettingsUpdate {
  readonly defaultVoiceId?: string | null;
  readonly providerId: string;
}

@Injectable()
export class AudioSettingsService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(TextToSpeechProviderRegistry)
    private readonly providers: TextToSpeechProviderRegistry,
    @Inject(ConfigService) private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async getLearnerSettings(learnerId: string): Promise<AudioSettings> {
    const profile = await this.database.learnerProfile.findUnique({
      select: { audioSourceId: true, browserVoiceId: true },
      where: { userId: learnerId },
    });
    if (!profile) throw new NotFoundException('Learner profile not found');
    return {
      browserVoiceId: profile.browserVoiceId,
      sourceId: this.assertAudioSource(profile.audioSourceId),
    };
  }

  async updateLearnerSettings(
    learnerId: string,
    input: LearnerSettingsUpdate,
  ): Promise<AudioSettings> {
    const sourceId = this.assertAudioSource(input.sourceId);
    const profile = await this.database.learnerProfile.update({
      data: {
        audioSourceId: sourceId,
        ...(input.browserVoiceId !== undefined
          ? { browserVoiceId: input.browserVoiceId }
          : {}),
      },
      select: { audioSourceId: true, browserVoiceId: true },
      where: { userId: learnerId },
    });
    return {
      browserVoiceId: profile.browserVoiceId,
      sourceId: this.assertAudioSource(profile.audioSourceId),
    };
  }

  async getAdminSettings(): Promise<AdminAudioSettings> {
    const row = await this.database.audioSystemSetting.findUnique({
      where: { id: 'default' },
    });
    const descriptors = this.providers.list();
    const configured = this.config.get('ai', { infer: true }).textToSpeech;
    const providerId = row?.providerId ?? configured.defaultProviderId;
    const selected = descriptors.find((provider) => provider.id === providerId);
    if (!selected) {
      throw new TtsProviderSelectionError(
        'TTS_PROVIDER_UNAVAILABLE',
        'The configured text to speech provider is unavailable.',
      );
    }

    return {
      defaultVoiceId: row ? row.defaultVoiceId : selected.defaultVoiceId,
      providerId: selected.id,
      providers: descriptors.map((descriptor) => this.toCapability(descriptor)),
    };
  }

  async updateAdminSettings(
    actorId: string,
    input: AdminSettingsUpdate,
  ): Promise<AdminAudioSettings> {
    const descriptor = this.providers.list().find(
      (provider) => provider.id === input.providerId,
    );
    if (!descriptor?.available) {
      throw new TtsProviderSelectionError(
        'TTS_PROVIDER_UNAVAILABLE',
        'The selected text to speech provider is unavailable.',
      );
    }
    const defaultVoiceId = input.defaultVoiceId === undefined
      ? descriptor.defaultVoiceId
      : input.defaultVoiceId;
    if (defaultVoiceId !== null) {
      this.providers.assertVoiceSupported(descriptor.id, defaultVoiceId);
    }

    await this.database.$transaction(async (transaction) => {
      const existing = await transaction.audioSystemSetting.findUnique({
        where: { id: 'default' },
      });
      const oldState = existing
        ? {
            defaultVoiceId: existing.defaultVoiceId,
            providerId: existing.providerId,
          }
        : await this.defaultAdminSelection();
      await transaction.audioSystemSetting.upsert({
        create: {
          defaultVoiceId,
          id: 'default',
          providerId: descriptor.id,
          updatedById: actorId,
        },
        update: {
          defaultVoiceId,
          providerId: descriptor.id,
          updatedById: actorId,
        },
        where: { id: 'default' },
      });
      await transaction.auditLog.create({
        data: {
          action: 'audio.settings.updated',
          actorId,
          newState: { defaultVoiceId, providerId: descriptor.id },
          oldState,
          resourceId: 'default',
          resourceType: 'AudioSystemSetting',
        },
      });
    });

    return this.getAdminSettings();
  }

  private assertAudioSource(sourceId: string): AudioSourceId {
    if (!AUDIO_SOURCE_IDS.has(sourceId as AudioSourceId)) {
      throw new UnprocessableEntityException({
        code: 'AUDIO_SOURCE_UNSUPPORTED',
        message: 'The selected learner audio source is unsupported.',
        statusCode: 422,
      });
    }
    return sourceId as AudioSourceId;
  }

  private async defaultAdminSelection(): Promise<{
    defaultVoiceId: string;
    providerId: string;
  }> {
    const providerId = this.config.get('ai', { infer: true }).textToSpeech.defaultProviderId;
    const descriptor = this.providers.list().find((provider) => provider.id === providerId);
    if (!descriptor) {
      throw new TtsProviderSelectionError(
        'TTS_PROVIDER_UNAVAILABLE',
        'The configured text to speech provider is unavailable.',
      );
    }
    return { defaultVoiceId: descriptor.defaultVoiceId, providerId: descriptor.id };
  }

  private toCapability(descriptor: TtsProviderDescriptor): TtsProviderCapability {
    return {
      available: descriptor.available,
      defaultVoiceId: descriptor.defaultVoiceId,
      displayName: descriptor.displayName,
      id: descriptor.id,
      simulation: !descriptor.releaseQuality,
      supportedLocales: ['en-US'],
    };
  }
}
