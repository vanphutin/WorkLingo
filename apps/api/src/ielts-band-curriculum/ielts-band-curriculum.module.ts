import { Module } from '@nestjs/common';
import { IeltsBandAdminService } from './application/ielts-band-admin.service.js';
import { IeltsBandAdminController } from './ielts-band-admin.controller.js';

@Module({ controllers: [IeltsBandAdminController], providers: [IeltsBandAdminService], exports: [IeltsBandAdminService] })
export class IeltsBandCurriculumModule {}
