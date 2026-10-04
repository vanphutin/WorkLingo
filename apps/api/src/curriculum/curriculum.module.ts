import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { CurriculumService } from './application/curriculum.service.js';

@Module({ imports: [DatabaseModule], providers: [CurriculumService], exports: [CurriculumService] })
export class CurriculumModule {}
