import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsMockAdminService } from './application/ielts-mock-admin.service.js';
// Nest needs runtime DTO classes to emit request validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateIeltsMockDto, IeltsMockCommandDto, SaveIeltsMockDraftDto } from './dto/ielts-mock-admin.dto.js';

@ApiTags('admin-ielts-mocks')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/ielts-mocks')
export class IeltsMockAdminController {
  constructor(@Inject(IeltsMockAdminService) private readonly mocks: IeltsMockAdminService) {}

  @Get()
  list(@Query('cursor') cursor?: string) { return this.mocks.list(cursor); }

  @Post()
  @ApiOperation({ summary: 'Create an independent IELTS mock draft paper' })
  @ApiCreatedResponse({ description: 'The created draft paper in the AdminIeltsMockDto format' })
  create(@Req() req: AuthenticatedRequest, @Body() input: CreateIeltsMockDto) { return this.mocks.create(req.authUser.id, input); }

  @Put(':id/draft')
  save(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() input: SaveIeltsMockDraftDto) { return this.mocks.save(req.authUser.id, id, input); }

  @Post(':id/validate')
  validate(@Param('id') id: string, @Body() input: IeltsMockCommandDto) { return this.mocks.validate(id, input); }

  @Post(':id/publish')
  publish(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() input: IeltsMockCommandDto) { return this.mocks.publish(req.authUser.id, id, input); }
}
