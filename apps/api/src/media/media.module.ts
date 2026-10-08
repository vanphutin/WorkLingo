import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../common/config/app-config.schema.js';
import { DatabaseModule } from '../common/database/database.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { LearningSessionsModule } from '../learning-sessions/learning-sessions.module.js';
import { StorageModule } from '../storage/storage.module.js';
import {
  AUDIO_DURATION_READER,
  AUDIO_UPLOAD_LIMITS,
  RecordingsService,
} from './application/recordings.service.js';
import { readAudioDuration } from './domain/audio-upload-policy.js';
import { RecordingsController } from './recordings.controller.js';

@Module({
  imports: [DatabaseModule, JobsModule, LearningSessionsModule, StorageModule],
  controllers: [RecordingsController],
  providers: [
    RecordingsService,
    { provide: AUDIO_DURATION_READER, useValue: readAudioDuration },
    {
      provide: AUDIO_UPLOAD_LIMITS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const ai = config.get('ai', { infer: true });
        return {
          maxBytes: ai.recordingMaxBytes,
          maxDurationSeconds: ai.recordingMaxDurationSeconds,
        };
      },
    },
  ],
  exports: [RecordingsService],
})
export class MediaModule {}
