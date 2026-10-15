import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aiProviderIdSchema, aiSettingsSchema, updateAiSettingsSchema, updateAdminAiSettingsSchema, type AiRoutingPreference, type AiSettings, type UpdateAiSettings } from '@worklingo/contracts';
import type { AppConfig } from '../../common/config/app-config.schema.js';
import { PrismaService } from '../../common/database/prisma.service.js';

@Injectable()
export class AiSettingsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService, @Inject(ConfigService) private readonly config: ConfigService<AppConfig, true>) {}

  async resolve(userId?: string): Promise<AiRoutingPreference> {
    const system = await this.systemPreference();
    if (!userId || !this.config.get('ai', { infer: true }).routing.enabled) return system;
    const row = await this.database.aiRoutingSetting.findUnique({ where: { id: userId } });
    // Database rows also contain persistence fields; explicitly select the public preference.
    const preference = row ? updateAiSettingsSchema.safeParse({ preferredProvider: row.preferredProvider, fallbackEnabled: row.fallbackEnabled }) : null;
    if (!preference?.success) return system;
    return {
      preferredProvider: preference.data.preferredProvider === 'system-default' ? system.preferredProvider : preference.data.preferredProvider,
      fallbackEnabled: system.fallbackEnabled && preference.data.fallbackEnabled,
    };
  }

  async get(userId?: string): Promise<AiSettings> {
    const system = await this.systemPreference();
    const row = userId ? await this.database.aiRoutingSetting.findUnique({ where: { id: userId } }) : null;
    const preferredProvider = userId ? row?.preferredProvider ?? 'system-default' : system.preferredProvider;
    const fallbackEnabled = userId ? row?.fallbackEnabled ?? true : system.fallbackEnabled;
    const ai = this.config.get('ai', { infer: true });
    return aiSettingsSchema.parse({
      accountId: userId ?? null, canManageSystem: false,
      preferredProvider, fallbackEnabled,
      effectiveProvider: !ai.routing.enabled || preferredProvider === 'system-default' ? system.preferredProvider : preferredProvider,
      effectiveFallbackEnabled: fallbackEnabled && system.fallbackEnabled,
      systemFallbackEnabled: system.fallbackEnabled,
      simulation: ai.languageEvaluation.provider === 'fake',
      routingEnabled: ai.routing.enabled,
      maxOutputTokens: ai.routing.maxOutputTokens,
      providers: this.capabilities(),
    });
  }

  async update(userId: string | undefined, input: UpdateAiSettings, actorId?: string): Promise<AiSettings> {
    if (!this.config.get('ai', { infer: true }).routing.enabled) throw new UnprocessableEntityException({ code: 'AI_ROUTING_DISABLED', message: 'AI routing is managed by server configuration.', statusCode: 422 });
    const preference = userId ? updateAiSettingsSchema.parse(input) : updateAdminAiSettingsSchema.parse(input);
    if (preference.preferredProvider !== 'system-default' && !this.capabilities().some(p => p.id === preference.preferredProvider && p.available)) {
      throw new UnprocessableEntityException({ code: 'AI_PROVIDER_UNAVAILABLE', message: 'The selected AI provider is not configured.', statusCode: 422 });
    }
    const data = { preferredProvider: preference.preferredProvider, fallbackEnabled: preference.fallbackEnabled };
    await this.database.$transaction(async transaction => {
      const old = await transaction.aiRoutingSetting.findUnique({ where: { id: userId ?? 'system' } });
      await transaction.aiRoutingSetting.upsert({
        where: { id: userId ?? 'system' },
        create: { id: userId ?? 'system', userId: userId ?? null, ...data }, update: data,
      });
      if (!userId && actorId) await transaction.auditLog.create({ data: {
        action: 'ai.settings.updated', actorId, resourceType: 'AiRoutingSetting', resourceId: 'system',
        oldState: old ? { preferredProvider: old.preferredProvider, fallbackEnabled: old.fallbackEnabled } : { preferredProvider: this.config.get('ai', { infer: true }).routing.defaultProvider, fallbackEnabled: this.config.get('ai', { infer: true }).routing.fallbackEnabled },
        newState: data,
      } });
    });
    return this.get(userId);
  }

  private async systemPreference(): Promise<AiRoutingPreference> {
    const ai = this.config.get('ai', { infer: true });
    const routing = ai.routing;
    if (!routing.enabled) return { preferredProvider: ai.languageEvaluation.provider === 'openai-compatible' ? 'openai' : 'discovery', fallbackEnabled: false };
    const row = await this.database.aiRoutingSetting.findUnique({ where: { id: 'system' } });
    return {
      preferredProvider: aiProviderIdSchema.safeParse(row?.preferredProvider).data ?? routing.defaultProvider,
      fallbackEnabled: routing.fallbackEnabled && (row?.fallbackEnabled ?? true),
    };
  }

  private capabilities(): AiSettings['providers'] {
    const ai = this.config.get('ai', { infer: true });
    const live = ai.languageEvaluation.provider !== 'fake';
    return [
      { id: 'discovery', available: live && Boolean(ai.routing.discovery.apiKey), model: ai.routing.discovery.model },
      { id: 'openai', available: live && Boolean(ai.routing.openai.apiKey && ai.routing.openai.baseUrl && ai.routing.openai.model), model: ai.routing.openai.model ?? null },
    ];
  }
}
