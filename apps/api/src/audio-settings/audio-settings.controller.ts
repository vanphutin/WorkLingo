import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AudioSettings } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { AudioSettingsService } from './application/audio-settings.service.js';
// Runtime DTO import supplies ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateAudioSettingsDto } from './dto/update-audio-settings.dto.js';

@ApiTags('audio settings')
@Roles('LEARNER')
@Controller('me/audio-settings')
export class AudioSettingsController {
  constructor(
    @Inject(AudioSettingsService) private readonly settings: AudioSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get audio playback settings for the authenticated learner' })
  @ApiOkResponse({ description: 'Owner-scoped learner audio settings' })
  get(@Req() request: AuthenticatedRequest): Promise<AudioSettings> {
    return this.settings.getLearnerSettings(request.authUser.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update audio playback settings for the authenticated learner' })
  @ApiOkResponse({ description: 'Updated owner-scoped learner audio settings' })
  update(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateAudioSettingsDto,
  ): Promise<AudioSettings> {
    return this.settings.updateLearnerSettings(request.authUser.id, input);
  }
}
