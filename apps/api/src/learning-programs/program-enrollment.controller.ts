import {Body,Controller,HttpCode,Inject,Post,Req} from '@nestjs/common';
import type {AuthenticatedRequest} from '../auth/authenticated-request.js';
import {Roles} from '../auth/roles.decorator.js';
import {ProgramContextService} from './application/program-context.service.js';
@Roles('LEARNER')
@Controller('me/program-enrollments')
export class ProgramEnrollmentController {
 constructor(@Inject(ProgramContextService) private readonly context:ProgramContextService){}
 @Post() @HttpCode(200) enroll(@Req() req:AuthenticatedRequest,@Body() body:unknown){return this.context.enroll(req.authUser.id,body);}
}
