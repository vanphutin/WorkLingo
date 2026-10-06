import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './application/jobs.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
