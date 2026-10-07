import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { ProgressionService } from './application/progression.service.js';
import { ProgressionController } from './progression.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
