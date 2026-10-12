import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { AdminOperationsController } from './admin-operations.controller.js';
import { OperationsQueryService } from './application/operations-query.service.js';

@Module({
  controllers: [AdminOperationsController],
  exports: [OperationsQueryService],
  imports: [DatabaseModule],
  providers: [OperationsQueryService],
})
export class OperationsModule {}
