import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './common/config/app-config.module';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './health/health.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { LearningSessionsModule } from './learning-sessions/learning-sessions.module.js';
import { ProgressModule } from './progress/progress.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    CurriculumModule,
    LearningSessionsModule,
    ProgressModule,
  ],
})
export class AppModule {}
