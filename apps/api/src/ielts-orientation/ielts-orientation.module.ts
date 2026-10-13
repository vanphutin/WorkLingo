import { Module } from '@nestjs/common';

import { OrientationAdminService } from './application/orientation-admin.service.js';
import { OrientationMediaService } from './application/orientation-media.service.js';
import { OrientationAdminController } from './orientation-admin.controller.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [OrientationAdminController],
  providers: [OrientationAdminService, OrientationMediaService],
  exports: [OrientationAdminService, OrientationMediaService],
})
export class IeltsOrientationModule {}
