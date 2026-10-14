import { Module } from '@nestjs/common';
import { IeltsMockAdminService } from './application/ielts-mock-admin.service.js';
import { IeltsMockLearnerService } from './application/ielts-mock-learner.service.js';
import { IeltsMockReviewService } from './application/ielts-mock-review.service.js';
import { IeltsMockAdminController } from './ielts-mock-admin.controller.js';
import { IeltsMockLearnerController } from './ielts-mock-learner.controller.js';
import { IeltsMockReviewController } from './ielts-mock-review.controller.js';
@Module({ controllers: [IeltsMockAdminController, IeltsMockLearnerController, IeltsMockReviewController], providers: [IeltsMockAdminService, IeltsMockLearnerService, IeltsMockReviewService], exports: [IeltsMockAdminService, IeltsMockLearnerService, IeltsMockReviewService] })
export class IeltsMockModule {}
