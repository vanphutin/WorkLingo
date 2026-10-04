import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../common/config/app-config.schema';
import { ObjectStorage } from './domain/object-storage.port';
import { LocalObjectStorageAdapter } from './infrastructure/local-object-storage.adapter';

@Module({
  exports: [ObjectStorage],
  providers: [
    {
      inject: [ConfigService],
      provide: ObjectStorage,
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new LocalObjectStorageAdapter(config.get('dataDir', { infer: true })),
    },
  ],
})
export class StorageModule {}
