import { Module } from '@nestjs/common';

import { OrientationAdminService } from './application/orientation-admin.service.js';
import { OrientationLearnerService } from './application/orientation-learner.service.js';
import { OrientationMediaService } from './application/orientation-media.service.js';
import { OrientationAdminController } from './orientation-admin.controller.js';
import { OrientationLearnerController } from './orientation-learner.controller.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [OrientationAdminController, OrientationLearnerController],
  providers: [OrientationAdminService, OrientationLearnerService, OrientationMediaService],
  exports: [OrientationAdminService, OrientationLearnerService, OrientationMediaService],
})
export class IeltsOrientationModule {}
