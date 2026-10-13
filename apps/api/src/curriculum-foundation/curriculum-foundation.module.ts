import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { FoundationCurriculumService } from './application/foundation-curriculum.service.js';
import { FoundationAdminController } from './foundation-admin.controller.js';

@Module({ imports: [DatabaseModule], controllers: [FoundationAdminController],
  providers: [FoundationCurriculumService], exports: [FoundationCurriculumService] })
export class CurriculumFoundationModule {}
