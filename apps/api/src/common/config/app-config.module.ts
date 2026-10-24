import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { parseAppConfig } from './app-config.schema';

@Global()
@Module({
  exports: [ConfigModule],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      ignoreEnvFile: shouldIgnoreBeginnerEnvFiles(process.env),
      envFilePath: ['.env', '../../.env'],
      isGlobal: true,
      validate: parseAppConfig,
    }),
  ],
})
export class AppConfigModule {}

export function shouldIgnoreBeginnerEnvFiles(env:Record<string,string|undefined>):boolean{return env.NODE_ENV==='test'&&env.WORKLINGO_BEGINNER_ISOLATED_TEST==='1';}
