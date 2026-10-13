import { Module } from '@nestjs/common';
import { IeltsIntegratedAdminService } from './application/ielts-integrated-admin.service.js';
import { IeltsIntegratedAdminController } from './ielts-integrated-admin.controller.js';
import { IeltsIntegratedLearnerService } from './application/ielts-integrated-learner.service.js';
import { IeltsIntegratedLearnerController } from './ielts-integrated-learner.controller.js';

@Module({
  controllers: [IeltsIntegratedAdminController, IeltsIntegratedLearnerController],
  providers: [IeltsIntegratedAdminService, IeltsIntegratedLearnerService],
  exports: [IeltsIntegratedAdminService, IeltsIntegratedLearnerService],
})
export class IeltsIntegratedPracticeModule {}
