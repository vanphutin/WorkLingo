import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  imports: [StorageModule],
  providers: [HealthService],
})
export class HealthModule {}
