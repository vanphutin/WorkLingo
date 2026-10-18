import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AiGatewayModule } from './ai-gateway/ai-gateway.module.js';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './common/config/app-config.module';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './health/health.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { ContentAuthoringModule } from './content-authoring/content-authoring.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { LearningSessionsModule } from './learning-sessions/learning-sessions.module.js';
import { MasteryModule } from './mastery/mastery.module.js';
import { MediaModule } from './media/media.module.js';
import { ProgressModule } from './progress/progress.module.js';
import { ProgressionModule } from './progression/progression.module.js';
import { TeacherAiModule } from './teacher-ai/teacher-ai.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { AudioSettingsModule } from './audio-settings/audio-settings.module.js';
import { EngagementModule } from './engagement/engagement.module.js';
import { AdminCurriculumModule } from './admin-curriculum/admin-curriculum.module.js';
import { AuditQueryModule } from './audit/audit-query.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { RequestContextModule } from './common/request-context/request-context.module.js';
import { CorrelationIdMiddleware } from './common/request-context/correlation-id.middleware.js';
import { SafeLoggerService } from './common/logging/safe-logger.service.js';
import { SafeExceptionFilter } from './common/http/safe-exception.filter.js';
import { RateLimitModule } from './common/rate-limit/rate-limit.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { LearningProgramsModule } from './learning-programs/learning-programs.module.js';
import { CurriculumFoundationModule } from './curriculum-foundation/curriculum-foundation.module.js';
import { IeltsOrientationModule } from './ielts-orientation/ielts-orientation.module.js';
import { IeltsBridgeModule } from './ielts-bridge/ielts-bridge.module.js';
import { IeltsIntegratedPracticeModule } from './ielts-integrated-practice/ielts-integrated-practice.module.js';
import { IeltsBandCurriculumModule } from './ielts-band-curriculum/ielts-band-curriculum.module.js';
import { IeltsMockModule } from './ielts-mock/ielts-mock.module.js';
import { IeltsFlowModule } from './ielts-flow/ielts-flow.module.js';
import { IeltsStudyModule } from './ielts-study/ielts-study.module.js';
import { AdminContentLifecycleModule } from './admin-content-lifecycle/admin-content-lifecycle.module.js';

@Module({
  imports: [
    AppConfigModule,
    RequestContextModule,
    AiGatewayModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    RateLimitModule,
    AnalyticsModule,
    CurriculumModule,
    ContentAuthoringModule,
    AdminContentLifecycleModule,
    JobsModule,
    LearningSessionsModule,
    MasteryModule,
    MediaModule,
    ProgressModule,
    ProgressionModule,
    TeacherAiModule,
    OnboardingModule,
    AudioSettingsModule,
    EngagementModule,
    AdminCurriculumModule,
    AuditQueryModule,
    OperationsModule,
    LearningProgramsModule,
    CurriculumFoundationModule,
    IeltsOrientationModule,
    IeltsBridgeModule,
    IeltsIntegratedPracticeModule,
    IeltsBandCurriculumModule,
    IeltsMockModule,
    IeltsStudyModule,
    IeltsFlowModule,
  ],
  providers: [
    SafeLoggerService,
    {
      provide: APP_FILTER,
      useClass: SafeExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
