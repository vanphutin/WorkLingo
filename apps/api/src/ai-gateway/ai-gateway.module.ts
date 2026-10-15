import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../common/config/app-config.schema.js';
import {
  TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS,
  TextToSpeechProviderRegistry,
  buildTextToSpeechProviderRegistrations,
  type TextToSpeechProviderRegistration,
} from './application/text-to-speech-provider.registry.js';
import { LanguageEvaluationPort } from './domain/language-evaluation.port.js';
import { SpeechToTextPort } from './domain/speech-to-text.port.js';
import { TextToSpeechPort } from './domain/text-to-speech.port.js';
import { FakeTextToSpeechAdapter } from './infrastructure/fake-tts.adapter.js';
import { FakeLanguageEvaluationAdapter } from './infrastructure/fake-language-evaluation.adapter.js';
import { FakeSpeechToTextAdapter } from './infrastructure/fake-speech-to-text.adapter.js';
import { MicrosoftSpeechAdapter } from './infrastructure/microsoft-speech.adapter.js';
import { OpenAiLanguageEvaluationAdapter } from './infrastructure/openai-language-evaluation.adapter.js';
import { DiscoveryLanguageEvaluationAdapter } from './infrastructure/discovery-language-evaluation.adapter.js';
import { RoutingLanguageEvaluationAdapter, type EvaluationRegistration } from './infrastructure/routing-language-evaluation.adapter.js';
import { AiSettingsService } from './application/ai-settings.service.js';
import { AdminAiSettingsController, AiSettingsController } from './ai-settings.controller.js';
import { MicrosoftTextToSpeechAdapter } from './infrastructure/microsoft-tts.adapter.js';

const AZURE_TEXT_TO_SPEECH_PORT = Symbol('AZURE_TEXT_TO_SPEECH_PORT');

@Module({
  controllers: [AiSettingsController, AdminAiSettingsController],
  providers: [
    AiSettingsService,
    {
      provide: SpeechToTextPort,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): SpeechToTextPort => {
        const ai = config.get('ai', { infer: true });
        return ai.speechToText.provider === 'microsoft'
          ? new MicrosoftSpeechAdapter({
              key: ai.speechToText.key,
              region: ai.speechToText.region,
              timeoutMs: ai.providerTimeoutMs,
            })
          : new FakeSpeechToTextAdapter();
      },
    },
    {
      provide: LanguageEvaluationPort,
      inject: [ConfigService, AiSettingsService],
      useFactory: (config: ConfigService<AppConfig, true>, settings: AiSettingsService): LanguageEvaluationPort => {
        const ai = config.get('ai', { infer: true });
        if (ai.languageEvaluation.provider === 'fake') return new FakeLanguageEvaluationAdapter({ rateLimitFailures: ai.fakeEvaluationRateLimitFailures });
        if (!ai.routing.enabled) {
          const selected = ai.languageEvaluation;
          const directConfig = { apiKey: selected.apiKey, baseUrl: selected.baseUrl, model: selected.model, timeoutMs: ai.providerTimeoutMs, maxOutputTokens: ai.routing.maxOutputTokens };
          return selected.provider === 'openai-compatible' ? new OpenAiLanguageEvaluationAdapter(directConfig) : new DiscoveryLanguageEvaluationAdapter(directConfig);
        }
        const providers: Partial<Record<'discovery' | 'openai', EvaluationRegistration>> = {};
        const { discovery, openai, maxOutputTokens } = ai.routing;
        if (discovery.apiKey) providers.discovery = {
          model: discovery.model,
          adapter: new DiscoveryLanguageEvaluationAdapter({ ...discovery, apiKey: discovery.apiKey, timeoutMs: ai.providerTimeoutMs, maxOutputTokens }),
        };
        if (openai.apiKey && openai.baseUrl && openai.model) providers.openai = {
          model: openai.model,
          adapter: new OpenAiLanguageEvaluationAdapter({ apiKey: openai.apiKey, baseUrl: openai.baseUrl, model: openai.model, timeoutMs: ai.providerTimeoutMs, maxOutputTokens }),
        };
        return new RoutingLanguageEvaluationAdapter(providers, settings);
      },
    },
    FakeTextToSpeechAdapter,
    {
      provide: AZURE_TEXT_TO_SPEECH_PORT,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<AppConfig, true>,
      ): MicrosoftTextToSpeechAdapter | null => {
        const ai = config.get('ai', { infer: true });
        const azure = ai.textToSpeech.azure;
        if (!azure.key || !azure.region) return null;
        return new MicrosoftTextToSpeechAdapter({
          key: azure.key,
          region: azure.region,
          timeoutMs: ai.providerTimeoutMs,
          voice: azure.voice,
        });
      },
    },
    {
      provide: TEXT_TO_SPEECH_PROVIDER_REGISTRATIONS,
      inject: [ConfigService, FakeTextToSpeechAdapter, AZURE_TEXT_TO_SPEECH_PORT],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        fakeProvider: FakeTextToSpeechAdapter,
        azureProvider: MicrosoftTextToSpeechAdapter | null,
      ): readonly TextToSpeechProviderRegistration[] => {
        const ai = config.get('ai', { infer: true });
        const azureVoice = ai.textToSpeech.azure.voice;
        return buildTextToSpeechProviderRegistrations({
          azureProvider,
          azureVoiceId: azureVoice,
          fakeProvider,
        });
      },
    },
    TextToSpeechProviderRegistry,
    {
      provide: TextToSpeechPort,
      inject: [ConfigService, TextToSpeechProviderRegistry],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        registry: TextToSpeechProviderRegistry,
      ): TextToSpeechPort => {
        const ai = config.get('ai', { infer: true });
        return registry.resolve(ai.textToSpeech.defaultProviderId);
      },
    },
  ],
  exports: [
    SpeechToTextPort,
    LanguageEvaluationPort,
    TextToSpeechPort,
    TextToSpeechProviderRegistry,
  ],
})
export class AiGatewayModule {}
