import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { SystemClock } from './domain/clock.port.js';
import { MasteryService } from './application/mastery.service.js';
import { MasteryController } from './mastery.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [MasteryController],
  providers: [
    {
      provide: 'CLOCK',
      useClass: SystemClock,
    },
    MasteryService,
  ],
  exports: [MasteryService, 'CLOCK'],
})
export class MasteryModule {}
