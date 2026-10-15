import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import type { AdminIeltsIntegratedProfileDto, IeltsIntegratedValidationResult, PublishIeltsIntegratedResult } from '@worklingo/contracts';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsIntegratedAdminService } from './application/ielts-integrated-admin.service.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { IeltsIntegratedCommandDto, SaveIeltsIntegratedDraftDto } from './dto/ielts-integrated-admin.dto.js';

@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/ielts-integrated/profiles')
export class IeltsIntegratedAdminController {
  constructor(@Inject(IeltsIntegratedAdminService) private readonly profiles: IeltsIntegratedAdminService) {}
  @Get() list(): Promise<AdminIeltsIntegratedProfileDto[]> { return this.profiles.list(); }
  @Get(':profileId') get(@Param('profileId', ParseUUIDPipe) id: string) { return this.profiles.get(id); }
  @Put(':profileId/draft') update(@Param('profileId', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest, @Body() input: SaveIeltsIntegratedDraftDto) { return this.profiles.save(request.authUser.id, id, input); }
  @Post(':profileId/validate') @HttpCode(HttpStatus.OK) validate(@Param('profileId', ParseUUIDPipe) id: string, @Body() input: IeltsIntegratedCommandDto): Promise<IeltsIntegratedValidationResult> { return this.profiles.validate(id, input); }
  @Post(':profileId/publish') publish(@Param('profileId', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest, @Body() input: IeltsIntegratedCommandDto): Promise<PublishIeltsIntegratedResult> { return this.profiles.publish(request.authUser.id, id, input); }
}
