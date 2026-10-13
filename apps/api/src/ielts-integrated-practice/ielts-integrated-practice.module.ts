import { Module } from '@nestjs/common';
import { IeltsIntegratedAdminService } from './application/ielts-integrated-admin.service.js';
import { IeltsIntegratedAdminController } from './ielts-integrated-admin.controller.js';

@Module({ controllers: [IeltsIntegratedAdminController], providers: [IeltsIntegratedAdminService], exports: [IeltsIntegratedAdminService] })
export class IeltsIntegratedPracticeModule {}
