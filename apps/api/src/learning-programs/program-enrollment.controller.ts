import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ProgramProgressService } from './application/program-progress.service.js';
import { ProgramEnrollmentsService } from './application/program-enrollments.service.js';
import {Body,Controller,HttpCode,Inject,Post,Req,Get,Query,Param,ParseUUIDPipe} from '@nestjs/common';
import type {AuthenticatedRequest} from '../auth/authenticated-request.js';
import {Roles} from '../auth/roles.decorator.js';
import {ProgramContextService} from './application/program-context.service.js';
@ApiTags('program enrollment')
@Roles('LEARNER')
@Controller('me/program-enrollments')
export class ProgramEnrollmentController {
 constructor(@Inject(ProgramContextService) private readonly context:ProgramContextService, @Inject(ProgramEnrollmentsService) private readonly enrollments:ProgramEnrollmentsService, @Inject(ProgramProgressService) private readonly progress:ProgramProgressService){}
 @Get(':id/progress') @ApiOperation({summary:'Get server-owned pinned program progress'}) @ApiOkResponse({description:'Validated owned program projection response'}) getProgress(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string){return this.progress.getProgress(req.authUser.id,id);}
 @Post(':id/recalculate') @ApiOperation({summary:'Recalculate progress from server-owned session evidence'}) @ApiOkResponse({description:'Validated owned program projection response'}) @HttpCode(200) recalculate(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){return this.progress.recalculate(req.authUser.id,id,body);}
 @Get(':id/history') @ApiOperation({summary:'Get owned append-only progression history'}) @ApiOkResponse({description:'Validated owned program projection response'}) history(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Query() query:unknown){return this.progress.history(req.authUser.id,id,query);}
 @Get(':id/reviews') @ApiOperation({summary:'Get owned persisted review schedule and provenance'}) @ApiOkResponse({description:'Validated owned program projection response'}) reviews(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Query() query:unknown){return this.progress.reviews(req.authUser.id,id,query);}
 @Post(':id/reviews/:reviewId/complete') @ApiOperation({summary:'Confirm a real completed review session'}) @ApiOkResponse({description:'Validated owned program projection response'}) @HttpCode(200) completeReview(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Param('reviewId',ParseUUIDPipe) reviewId:string,@Body() body:unknown){return this.progress.completeReview(req.authUser.id,id,reviewId,body);}
 @Get() list(@Req() req:AuthenticatedRequest,@Query() query:unknown){return this.enrollments.listMine(req.authUser.id,query);}
 @Post(':id/withdraw') @HttpCode(200) withdraw(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){return this.enrollments.withdraw(req.authUser.id,id,body);}
 @Post() @HttpCode(200) enroll(@Req() req:AuthenticatedRequest,@Body() body:unknown){return this.context.enroll(req.authUser.id,body);}
}
