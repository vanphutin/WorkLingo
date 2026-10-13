import { Module } from '@nestjs/common';

import { IeltsBridgeAdminService } from './application/ielts-bridge-admin.service.js';
import { IeltsBridgeLearnerService } from './application/ielts-bridge-learner.service.js';
import { IeltsBridgeAdminController } from './ielts-bridge-admin.controller.js';
import { IeltsBridgeLearnerController } from './ielts-bridge-learner.controller.js';

@Module({
  controllers: [IeltsBridgeAdminController, IeltsBridgeLearnerController],
  providers: [IeltsBridgeAdminService, IeltsBridgeLearnerService],
  exports: [IeltsBridgeAdminService, IeltsBridgeLearnerService],
})
export class IeltsBridgeModule {}
