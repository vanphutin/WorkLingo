import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AuditQueryService } from './application/audit-query.service.js';

@Module({
  controllers: [AdminAuditController],
  exports: [AuditQueryService],
  imports: [DatabaseModule],
  providers: [AuditQueryService],
})
export class AuditQueryModule {}
