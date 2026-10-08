import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../common/config/app-config.schema.js';
import { DatabaseModule } from '../common/database/database.module.js';
import { JobsController } from './jobs.controller.js';
import {
  JOB_RUNNER_OPTIONS,
  JobHandlerRegistry,
  JobRunnerService,
  createJobRunnerOptions,
} from './application/job-runner.service.js';
import { JOB_DEFAULT_OPTIONS, JobsService } from './application/jobs.service.js';
import { JobDispatcher } from './domain/job-dispatcher.port.js';

@Module({
  imports: [DatabaseModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    {
      provide: JOB_DEFAULT_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        maxAttempts: config.get('ai', { infer: true }).maxAttempts,
      }),
    },
    JobHandlerRegistry,
    JobRunnerService,
    { provide: JobDispatcher, useExisting: JobsService },
    {
      provide: JOB_RUNNER_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const jobs = config.get('jobs', { infer: true });
        return createJobRunnerOptions({
          enabled: jobs.workerEnabled,
          leaseMs: jobs.leaseMs,
          pollIntervalMs: jobs.pollIntervalMs,
        });
      },
    },
  ],
  exports: [JobsService, JobDispatcher, JobHandlerRegistry, JobRunnerService],
})
export class JobsModule {}
