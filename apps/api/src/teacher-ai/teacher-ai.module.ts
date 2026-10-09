import { Inject, Injectable, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import type { AppConfig } from '../common/config/app-config.schema.js';
import { DatabaseModule } from '../common/database/database.module.js';
import { JobHandlerRegistry } from '../jobs/application/job-runner.service.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { MasteryModule } from '../mastery/mastery.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { EvaluateAttemptHandler } from './application/evaluate-attempt.handler.js';
import {
  EVALUATION_SERVICE_OPTIONS,
  EvaluationService,
} from './application/evaluation.service.js';
import {
  TRANSCRIPTION_HANDLER_OPTIONS,
  TranscribeSpeechHandler,
} from './application/transcribe-speech.handler.js';
import { EvaluationsController } from './evaluations.controller.js';

@Injectable()
class TeacherAiHandlerRegistration implements OnModuleInit {
  constructor(
    @Inject(JobHandlerRegistry) private readonly registry: JobHandlerRegistry,
    @Inject(TranscribeSpeechHandler) private readonly transcribe: TranscribeSpeechHandler,
    @Inject(EvaluateAttemptHandler) private readonly evaluate: EvaluateAttemptHandler,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.transcribe);
    this.registry.register(this.evaluate);
  }
}

@Module({
  controllers: [EvaluationsController],
  imports: [AiGatewayModule, DatabaseModule, JobsModule, MasteryModule, StorageModule],
  providers: [
    EvaluationService,
    TranscribeSpeechHandler,
    EvaluateAttemptHandler,
    TeacherAiHandlerRegistration,
    {
      provide: TRANSCRIPTION_HANDLER_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        locale: config.get('ai', { infer: true }).speechToText.locale,
        providerConfigVersion: '1',
        recordingRetentionDays: config.get('ai', { infer: true }).recordingRetentionDays,
      }),
    },
    {
      provide: EVALUATION_SERVICE_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const ai = config.get('ai', { infer: true });
        return {
          languageProviderConfigVersion: '1',
          languageProviderModel: ai.languageEvaluation.provider === 'openai-compatible'
            ? ai.languageEvaluation.model
            : null,
          languageProviderName: ai.languageEvaluation.provider,
          recordingRetentionDays: ai.recordingRetentionDays,
        };
      },
    },
  ],
  exports: [EvaluationService],
})
export class TeacherAiModule {}
