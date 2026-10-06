import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ContentAuthoringController } from './content-authoring.controller.js';
import { LessonVersionsController } from './lesson-versions.controller.js';
import { AudioController } from './audio.controller.js';
import { ContentImportsService } from './application/content-imports.service.js';
import { AudioGenerationService } from './application/audio-generation.service.js';
import { ContentPublisherService } from './application/content-publisher.service.js';
import { TextToSpeechPort } from './domain/text-to-speech.port.js';
import { FakeTextToSpeechAdapter } from './infrastructure/fake-tts.adapter.js';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [ContentAuthoringController, LessonVersionsController, AudioController],
  providers: [
    ContentImportsService,
    AudioGenerationService,
    ContentPublisherService,
    {
      provide: TextToSpeechPort,
      useClass: FakeTextToSpeechAdapter,
    },
  ],
  exports: [ContentImportsService, AudioGenerationService, ContentPublisherService, TextToSpeechPort],
})
export class ContentAuthoringModule {}
