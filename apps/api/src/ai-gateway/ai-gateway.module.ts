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
import { MicrosoftTextToSpeechAdapter } from './infrastructure/microsoft-tts.adapter.js';

const AZURE_TEXT_TO_SPEECH_PORT = Symbol('AZURE_TEXT_TO_SPEECH_PORT');

@Module({
  providers: [
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
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): LanguageEvaluationPort => {
        const ai = config.get('ai', { infer: true });
        return ai.languageEvaluation.provider === 'openai-compatible'
          ? new OpenAiLanguageEvaluationAdapter({
              apiKey: ai.languageEvaluation.apiKey,
              baseUrl: ai.languageEvaluation.baseUrl,
              model: ai.languageEvaluation.model,
              timeoutMs: ai.providerTimeoutMs,
            })
          : new FakeLanguageEvaluationAdapter({
              rateLimitFailures: ai.fakeEvaluationRateLimitFailures,
            });
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
