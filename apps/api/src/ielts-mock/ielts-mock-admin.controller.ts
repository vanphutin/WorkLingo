import { Body, Controller, DefaultValuePipe, Get, Inject, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsMockAdminService } from './application/ielts-mock-admin.service.js';
import type { IeltsMockCommandDto, SaveIeltsMockDraftDto } from './dto/ielts-mock-admin.dto.js';
@ApiTags('admin-ielts-mocks') @Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN') @Controller('admin/ielts-mocks')
export class IeltsMockAdminController { constructor(@Inject(IeltsMockAdminService) private readonly mocks: IeltsMockAdminService) {} @Get() list(@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number) { return this.mocks.list(Math.max(0, offset)); } @Put(':id/draft') save(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() input: SaveIeltsMockDraftDto) { return this.mocks.save(req.authUser.id, id, input); } @Post(':id/validate') validate(@Param('id') id: string, @Body() input: IeltsMockCommandDto) { return this.mocks.validate(id, input); } @Post(':id/publish') publish(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() input: IeltsMockCommandDto) { return this.mocks.publish(req.authUser.id, id, input); } }
