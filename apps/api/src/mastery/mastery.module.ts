import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { SystemClock } from './domain/clock.port.js';
import { MasteryService } from './application/mastery.service.js';
import { MasteryController } from './mastery.controller.js';
import { CurriculumModule } from '../curriculum/curriculum.module.js';
import { MasteryMapService } from './application/mastery-map.service.js';

@Module({
  imports: [DatabaseModule, CurriculumModule],
  controllers: [MasteryController],
  providers: [
    {
      provide: 'CLOCK',
      useClass: SystemClock,
    },
    MasteryService,
    MasteryMapService,
  ],
  exports: [MasteryService, 'CLOCK'],
})
export class MasteryModule {}
