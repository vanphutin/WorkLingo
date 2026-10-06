import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type {
  AudioArtifactDto,
  GenerateAudioResult,
} from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { AudioGenerationService } from './application/audio-generation.service.js';
// Runtime import is required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { GenerateAudioDto } from './dto/generate-audio.dto.js';

@ApiTags('content audio')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin')
export class AudioController {
  constructor(
    @Inject(AudioGenerationService)
    private readonly audioService: AudioGenerationService,
  ) {}

  @Post('content-imports/:id/generate-audio')
  @HttpCode(202)
  @ApiOperation({ summary: 'Initiate background TTS audio generation for an authored script' })
  @ApiAcceptedResponse({ description: 'Audio generation job accepted' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Administrative role required' })
  generateAudio(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: GenerateAudioDto,
  ): Promise<GenerateAudioResult> {
    return this.audioService.generateAudio(id, request.authUser.id, input);
  }

  @Get('content-imports/:id/audio')
  @ApiOperation({ summary: 'List all audio artifacts for a content import' })
  @ApiOkResponse({ description: 'List of audio artifacts' })
  listAudio(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AudioArtifactDto[]> {
    return this.audioService.listAudio(id, request.authUser.id);
  }

  @Get('audio-artifacts/:id/content')
  @ApiOperation({ summary: 'Authorized binary stream of generated audio for admin playback' })
  @ApiOkResponse({ description: 'Audio stream binary' })
  async streamAudioContent(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const { artifact, audioBytes } = await this.audioService.getArtifact(
      id,
      request.authUser.id,
    );

    response.setHeader('Content-Type', artifact.mimeType);
    response.setHeader('Content-Length', artifact.byteSize);
    response.setHeader('Accept-Ranges', 'bytes');
    response.end(audioBytes);
  }
}
