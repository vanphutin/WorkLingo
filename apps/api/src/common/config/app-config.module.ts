import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { parseAppConfig } from './app-config.schema';

@Global()
@Module({
  exports: [ConfigModule],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: parseAppConfig,
    }),
  ],
})
export class AppConfigModule {}
