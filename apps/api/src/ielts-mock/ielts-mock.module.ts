import { Module } from '@nestjs/common';
import { IeltsMockAdminService } from './application/ielts-mock-admin.service.js';
import { IeltsMockAdminController } from './ielts-mock-admin.controller.js';
@Module({ controllers: [IeltsMockAdminController], providers: [IeltsMockAdminService], exports: [IeltsMockAdminService] })
export class IeltsMockModule {}
