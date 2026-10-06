import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { SystemClock } from './domain/clock.port.js';
import { MasteryService } from './application/mastery.service.js';

@Module({
  imports: [DatabaseModule],
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
