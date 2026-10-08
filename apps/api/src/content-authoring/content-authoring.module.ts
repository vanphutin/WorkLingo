import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { ContentAuthoringController } from './content-authoring.controller.js';
import { LessonVersionsController } from './lesson-versions.controller.js';
import { AudioController } from './audio.controller.js';
import { ContentImportsService } from './application/content-imports.service.js';
import { AudioGenerationService } from './application/audio-generation.service.js';
import { ContentPublisherService } from './application/content-publisher.service.js';
import { AudioGenerationHandler } from './application/audio-generation.handler.js';

@Module({
  imports: [AiGatewayModule, DatabaseModule, JobsModule, StorageModule],
  controllers: [ContentAuthoringController, LessonVersionsController, AudioController],
  providers: [
    ContentImportsService,
    AudioGenerationService,
    AudioGenerationHandler,
    ContentPublisherService,
  ],
  exports: [ContentImportsService, AudioGenerationService, ContentPublisherService],
})
export class ContentAuthoringModule {}
