import {BadRequestException,Body,Controller,Get,Inject,Param,ParseUUIDPipe,Patch,Post,Query,Req} from '@nestjs/common';
import {ApiOperation,ApiTags} from '@nestjs/swagger';
import {beginnerTargetSchema} from '@worklingo/contracts';
import type {AuthenticatedRequest} from '../auth/authenticated-request.js';
import {Roles} from '../auth/roles.decorator.js';
import {BeginnerAuthoringService} from './application/beginner-authoring.service.js';
// Runtime DTO imports are required for Nest ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {BeginnerCommandDto,BeginnerNestedCommandDto} from './dto/beginner-authoring.dto.js';
@ApiTags('beginner admin')
@Roles('CONTENT_ADMIN','SYSTEM_ADMIN')
@Controller('admin/beginner')
export class BeginnerAdminController{
 constructor(@Inject(BeginnerAuthoringService)private readonly authoring:BeginnerAuthoringService){}
 private target(raw:string,id:string,kind:'importId'|'missionId'){
  let input:unknown;try{input=JSON.parse(raw);}catch{throw new BadRequestException('Invalid Beginner target');}
  const parsed=beginnerTargetSchema.safeParse(input);if(!parsed.success||parsed.data[kind]!==id)throw new BadRequestException('BEGINNER_TARGET_MISMATCH');return parsed.data;
 }
 private command(input:BeginnerCommandDto,id:string){if(input.target.importId!==id)throw new BadRequestException('BEGINNER_TARGET_MISMATCH');return input;}
 @Get() @ApiOperation({summary:'Read planned Beginner curriculum and authorized test bindings'})
 workspace(@Req()req:AuthenticatedRequest){return this.authoring.getWorkspace(req.authUser);}
 @Post('drafts') @ApiOperation({summary:'Explicitly create one scoped Beginner draft'})
 create(@Req()req:AuthenticatedRequest,@Body()input:BeginnerCommandDto){return this.authoring.createDraft(req.authUser,input);}
 @Get('imports/:id') @ApiOperation({summary:'Read one exact scoped draft for Admin editing'})
 get(@Req()req:AuthenticatedRequest,@Param('id',ParseUUIDPipe)id:string,@Query('target')target:string){return this.authoring.getImport(req.authUser,this.target(target,id,'importId'));}
 @Patch('imports/:id/source') @ApiOperation({summary:'Save raw source with optimistic concurrency'})
 update(@Req()req:AuthenticatedRequest,@Param('id',ParseUUIDPipe)id:string,@Body()input:BeginnerCommandDto){return this.authoring.updateSource(req.authUser,this.command(input,id));}
 @Post('imports/:id/validate') @ApiOperation({summary:'Validate technical readiness without publication'})
 validate(@Req()req:AuthenticatedRequest,@Param('id',ParseUUIDPipe)id:string,@Body()input:BeginnerCommandDto){return this.authoring.validate(req.authUser,this.command(input,id));}
 @Post('imports/:id/review') @ApiOperation({summary:'Independent technical fixture review of exact source/audio/evidence'})
 review(@Req()req:AuthenticatedRequest,@Param('id',ParseUUIDPipe)id:string,@Body()input:BeginnerCommandDto){return this.authoring.review(req.authUser,this.command(input,id));}
 @Post('imports/:id/publish') @ApiOperation({summary:'Explicit scoped test publication; requires separate environment permission'})
 publish(@Req()req:AuthenticatedRequest,@Param('id',ParseUUIDPipe)id:string,@Body()input:BeginnerCommandDto){return this.authoring.publish(req.authUser,this.command(input,id));}
 @Post('curriculum/:kind') @ApiOperation({summary:'Explicit scoped curriculum node command'})
 node(@Req()req:AuthenticatedRequest,@Param('kind')kind:string,@Body()input:BeginnerNestedCommandDto){return this.authoring.node(req.authUser,kind,input.target,input.command);}
 @Get('missions/:id/foundation') @ApiOperation({summary:'Read exact Unit objectives and prerequisite draft'})
 foundation(@Req()req:AuthenticatedRequest,@Param('id',ParseUUIDPipe)id:string,@Query('target')target:string){return this.authoring.getFoundation(req.authUser,this.target(target,id,'missionId'));}
 @Post('missions/:id/foundation/:action') @ApiOperation({summary:'Explicit save, validate, independent review or test publication of Unit evidence'})
 foundationCommand(@Req()req:AuthenticatedRequest,@Param('id',ParseUUIDPipe)id:string,@Param('action')action:string,@Body()input:BeginnerNestedCommandDto){
  if(input.target.missionId!==id||!['save','validate','review','publish'].includes(action))throw new BadRequestException('Invalid Beginner curriculum command');
  return this.authoring.foundationCommand(req.authUser,action as 'save'|'validate'|'review'|'publish',input.target,input.command);
 }
}
