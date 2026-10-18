import { Module } from '@nestjs/common';
import { AdminContentLifecycleController } from './admin-content-lifecycle.controller.js';
import { AdminContentLifecycleService } from './admin-content-lifecycle.service.js';

@Module({ controllers: [AdminContentLifecycleController], providers: [AdminContentLifecycleService] })
export class AdminContentLifecycleModule {}
