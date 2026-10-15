import { Body, ConflictException, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn } from 'class-validator';
import type { AiSettings, UpdateAiSettings } from '@worklingo/contracts';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { AiSettingsService } from './application/ai-settings.service.js';

export class UpdateAiSettingsDto implements UpdateAiSettings {
  @ApiProperty({ enum: ['system-default', 'discovery', 'openai'] })
  @IsIn(['system-default', 'discovery', 'openai'])
  preferredProvider!: UpdateAiSettings['preferredProvider'];
  @ApiProperty()
  @IsBoolean()
  fallbackEnabled!: boolean;
}
function assertAccount(request: AuthenticatedRequest): void {
  const expected = request.headers['x-worklingo-account-id'];
  if (expected !== undefined && expected !== request.authUser.id) throw new ConflictException({ code: 'ACCOUNT_CHANGED', message: 'The signed-in account has changed' });
}
export class UpdateAdminAiSettingsDto extends UpdateAiSettingsDto {
  @ApiProperty({ enum: ['discovery', 'openai'] })
  @IsIn(['discovery', 'openai'])
  declare preferredProvider: 'discovery' | 'openai';
}

@ApiTags('AI settings')
@Controller('me/ai-settings')
export class AiSettingsController {
  constructor(@Inject(AiSettingsService) private readonly settings: AiSettingsService) {}
  @Get()
  get(@Req() request: AuthenticatedRequest): Promise<AiSettings> { return this.settings.get(request.authUser.id); }
  @Patch()
  update(@Req() request: AuthenticatedRequest, @Body() input: UpdateAiSettingsDto): Promise<AiSettings> { assertAccount(request); return this.settings.update(request.authUser.id, input); }
}

@ApiTags('AI settings')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/ai-settings')
export class AdminAiSettingsController {
  constructor(@Inject(AiSettingsService) private readonly settings: AiSettingsService) {}
  @Get()
  async get(@Req() request: AuthenticatedRequest): Promise<AiSettings> { return { ...await this.settings.get(), accountId: request.authUser.id, canManageSystem: request.authUser.roles.includes('SYSTEM_ADMIN') }; }
  @Patch()
  @Roles('SYSTEM_ADMIN')
  async update(@Req() request: AuthenticatedRequest, @Body() input: UpdateAdminAiSettingsDto): Promise<AiSettings> { assertAccount(request); return { ...await this.settings.update(undefined, input, request.authUser.id), accountId: request.authUser.id, canManageSystem: true }; }
}
