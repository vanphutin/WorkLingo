import { Module } from '@nestjs/common';

import { IeltsBridgeAdminService } from './application/ielts-bridge-admin.service.js';
import { IeltsBridgeAdminController } from './ielts-bridge-admin.controller.js';

@Module({
  controllers: [IeltsBridgeAdminController],
  providers: [IeltsBridgeAdminService],
  exports: [IeltsBridgeAdminService],
})
export class IeltsBridgeModule {}
