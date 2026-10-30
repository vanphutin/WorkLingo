import { ProgramEnrollmentsService } from './application/program-enrollments.service.js';
import {Body,Controller,HttpCode,Inject,Post,Req,Get,Query,Param,ParseUUIDPipe} from '@nestjs/common';
import type {AuthenticatedRequest} from '../auth/authenticated-request.js';
import {Roles} from '../auth/roles.decorator.js';
import {ProgramContextService} from './application/program-context.service.js';
@Roles('LEARNER')
@Controller('me/program-enrollments')
export class ProgramEnrollmentController {
 constructor(@Inject(ProgramContextService) private readonly context:ProgramContextService, @Inject(ProgramEnrollmentsService) private readonly enrollments:ProgramEnrollmentsService){}
 @Get() list(@Req() req:AuthenticatedRequest,@Query() query:unknown){return this.enrollments.listMine(req.authUser.id,query);}
 @Post(':id/withdraw') @HttpCode(200) withdraw(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){return this.enrollments.withdraw(req.authUser.id,id,body);}
 @Post() @HttpCode(200) enroll(@Req() req:AuthenticatedRequest,@Body() body:unknown){return this.context.enroll(req.authUser.id,body);}
}
