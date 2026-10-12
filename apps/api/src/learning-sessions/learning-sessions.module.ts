import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { CurriculumModule } from '../curriculum/curriculum.module.js';
import { MasteryModule } from '../mastery/mastery.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../common/config/app-config.schema.js';
import {
  ACTIVITY_DRAFT_OPTIONS,
  ActivityDraftsService,
} from './application/activity-drafts.service.js';
import { LearnerAudioService } from './application/learner-audio.service.js';
import { LearningSessionsService } from './application/learning-sessions.service.js';
import { SessionCreationService } from './application/session-creation.service.js';
import { LearningSessionsController } from './learning-sessions.controller.js';

import { EngagementModule } from '../engagement/engagement.module.js';

@Module({
  controllers: [LearningSessionsController],
  exports: [LearningSessionsService, SessionCreationService],
  imports: [DatabaseModule, CurriculumModule, MasteryModule, JobsModule, StorageModule, EngagementModule],
  providers: [
    LearningSessionsService,
    SessionCreationService,
    ActivityDraftsService,
    LearnerAudioService,
    {
      provide: ACTIVITY_DRAFT_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        retentionDays: config.get('ai', { infer: true }).draftRetentionDays,
      }),
    },
  ],
})
export class LearningSessionsModule {}
