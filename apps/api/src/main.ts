import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import type { AppConfig } from './common/config/app-config.schema';
import { configureContentSourceBodyParser } from './common/http/content-source-body-parser';
import { SafeLoggerService } from './common/logging/safe-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(SafeLoggerService);
  app.useLogger(logger);

  configureContentSourceBodyParser(app);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const port = config.get('apiPort', { infer: true });
  await app.listen(port, '127.0.0.1');
}

void bootstrap();
