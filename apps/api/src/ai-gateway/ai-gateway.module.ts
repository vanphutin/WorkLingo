import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../common/config/app-config.schema.js';
import { LanguageEvaluationPort } from './domain/language-evaluation.port.js';
import { SpeechToTextPort } from './domain/speech-to-text.port.js';
import { FakeLanguageEvaluationAdapter } from './infrastructure/fake-language-evaluation.adapter.js';
import { FakeSpeechToTextAdapter } from './infrastructure/fake-speech-to-text.adapter.js';
import { MicrosoftSpeechAdapter } from './infrastructure/microsoft-speech.adapter.js';
import { OpenAiLanguageEvaluationAdapter } from './infrastructure/openai-language-evaluation.adapter.js';

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
          : new FakeLanguageEvaluationAdapter();
      },
    },
  ],
  exports: [SpeechToTextPort, LanguageEvaluationPort],
})
export class AiGatewayModule {}
