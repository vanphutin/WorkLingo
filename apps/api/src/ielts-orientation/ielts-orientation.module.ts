import { Module } from '@nestjs/common';
import { IeltsIntroductionService } from './application/ielts-introduction.service.js';
import { IeltsIntroductionController } from './ielts-introduction.controller.js';

import { OrientationAdminService } from './application/orientation-admin.service.js';
import { OrientationLearnerService } from './application/orientation-learner.service.js';
import { OrientationMediaService } from './application/orientation-media.service.js';
import { OrientationAdminController } from './orientation-admin.controller.js';
import { OrientationLearnerController } from './orientation-learner.controller.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [OrientationAdminController, OrientationLearnerController, IeltsIntroductionController],
  providers: [OrientationAdminService, OrientationLearnerService, OrientationMediaService, IeltsIntroductionService],
  exports: [OrientationAdminService, OrientationLearnerService, OrientationMediaService],
})
export class IeltsOrientationModule {}
