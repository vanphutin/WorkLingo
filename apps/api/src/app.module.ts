import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './common/config/app-config.module';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './health/health.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { ContentAuthoringModule } from './content-authoring/content-authoring.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { LearningSessionsModule } from './learning-sessions/learning-sessions.module.js';
import { MasteryModule } from './mastery/mastery.module.js';
import { ProgressModule } from './progress/progress.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    CurriculumModule,
    ContentAuthoringModule,
    JobsModule,
    LearningSessionsModule,
    MasteryModule,
    ProgressModule,
  ],
})
export class AppModule {}
