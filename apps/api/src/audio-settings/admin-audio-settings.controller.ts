import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminAudioSettings } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { AudioSettingsService } from './application/audio-settings.service.js';
// Runtime DTO import supplies ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateAdminAudioSettingsDto } from './dto/update-admin-audio-settings.dto.js';

@ApiTags('audio settings')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/audio-settings')
export class AdminAudioSettingsController {
  constructor(
    @Inject(AudioSettingsService) private readonly settings: AudioSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get safe server text to speech capabilities and defaults' })
  @ApiOkResponse({ description: 'Non-secret provider readiness and defaults' })
  get(): Promise<AdminAudioSettings> {
    return this.settings.getAdminSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Update future server text to speech defaults' })
  @ApiOkResponse({ description: 'Updated non-secret provider defaults' })
  update(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateAdminAudioSettingsDto,
  ): Promise<AdminAudioSettings> {
    return this.settings.updateAdminSettings(request.authUser.id, input);
  }
}
