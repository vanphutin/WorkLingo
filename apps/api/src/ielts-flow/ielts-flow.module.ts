import { Module } from '@nestjs/common';
import { IeltsStudyModule } from '../ielts-study/ielts-study.module.js';
import { IeltsFlowController } from './ielts-flow.controller.js';
import { IeltsFlowService } from './application/ielts-flow.service.js';
@Module({imports:[IeltsStudyModule],controllers:[IeltsFlowController],providers:[IeltsFlowService],exports:[IeltsFlowService]})
export class IeltsFlowModule {}
