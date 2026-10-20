import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module.js';
import { MockPlaybackService } from './application/mock-playback.service.js';
import { MockRecordingService } from './application/mock-recording.service.js';
import { MockRecordingRetentionHandler } from './application/mock-recording-retention.handler.js';
import { IeltsMockMediaController } from './ielts-mock-media.controller.js';
import { MockSectionReviewService } from './application/mock-section-review.service.js';
import { MockAttemptClock } from './application/mock-attempt-clock.js';
import { StorageModule } from '../storage/storage.module.js';
import { IeltsMockAdminService } from './application/ielts-mock-admin.service.js';
import { IeltsMockLearnerService } from './application/ielts-mock-learner.service.js';
import { IeltsMockReviewService } from './application/ielts-mock-review.service.js';
import { IeltsMockAdminController } from './ielts-mock-admin.controller.js';
import { IeltsMockAttemptController } from './ielts-mock-attempt.controller.js';
import { IeltsMockLearnerController } from './ielts-mock-learner.controller.js';
import { IeltsMockReviewController } from './ielts-mock-review.controller.js';
@Module({ imports: [StorageModule, JobsModule], controllers: [IeltsMockMediaController, IeltsMockAdminController, IeltsMockLearnerController, IeltsMockAttemptController, IeltsMockReviewController], providers: [MockPlaybackService, MockRecordingService, MockRecordingRetentionHandler, MockAttemptClock, MockSectionReviewService, IeltsMockAdminService, IeltsMockLearnerService, IeltsMockReviewService], exports: [IeltsMockAdminService, IeltsMockLearnerService, IeltsMockReviewService] })
export class IeltsMockModule {}
