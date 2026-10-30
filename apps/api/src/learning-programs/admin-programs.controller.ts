import {Body,Controller,Get,HttpCode,Inject,Param,ParseUUIDPipe,Post,Put,Req} from '@nestjs/common';
import {type AdminProgramDto, type AdminProgramListDto} from '@worklingo/contracts';
import type {AuthenticatedRequest} from '../auth/authenticated-request.js';
import {Roles} from '../auth/roles.decorator.js';
import {AdminProgramsService} from './application/admin-programs.service.js';
@Roles('CONTENT_ADMIN','SYSTEM_ADMIN')
@Controller('admin/learning-programs')
export class AdminProgramsController {
 constructor(@Inject(AdminProgramsService) private readonly programs:AdminProgramsService){}
 @Get() list():Promise<AdminProgramListDto>{return this.programs.list();}
 @Post() create(@Req() req:AuthenticatedRequest,@Body() body:unknown):Promise<AdminProgramDto>{return this.programs.create(req.authUser.id,body);}
 @Put(':id') update(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown):Promise<AdminProgramDto>{return this.programs.update(req.authUser.id,id,body);}
 @Post(':id/publish') @HttpCode(200) publish(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown):Promise<AdminProgramDto>{return this.programs.publish(req.authUser.id,id,body);}
}

