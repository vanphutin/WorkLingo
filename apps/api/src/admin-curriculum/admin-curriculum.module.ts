import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { AdminCurriculumController } from './admin-curriculum.controller.js';
import { AdminCurriculumCommandService } from './application/admin-curriculum-command.service.js';
import { AdminCurriculumQueryService } from './application/admin-curriculum-query.service.js';
import { MutationReceiptService } from './application/mutation-receipt.service.js';

@Module({
  controllers: [AdminCurriculumController],
  exports: [AdminCurriculumCommandService, AdminCurriculumQueryService, MutationReceiptService],
  imports: [DatabaseModule],
  providers: [AdminCurriculumCommandService, AdminCurriculumQueryService, MutationReceiptService],
})
export class AdminCurriculumModule {}
