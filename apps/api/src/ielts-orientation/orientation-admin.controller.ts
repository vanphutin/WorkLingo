import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConflictResponse, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type {
  AdminOrientationDto,
  OrientationValidationResult,
  PublishOrientationResult,
} from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { sendAudioStream } from '../media/application/audio-stream-response.js';
import { OrientationAdminService } from './application/orientation-admin.service.js';
import { OrientationMediaService } from './application/orientation-media.service.js';
// Runtime imports provide ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PublishOrientationDto, UpdateOrientationDraftDto, UploadOrientationMediaDto, ValidateOrientationDraftDto } from './dto/admin-orientation.dto.js';

interface MultipartOrientationMedia {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly originalname: string;
}

@ApiTags('IELTS orientation admin')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/ielts-orientation')
export class OrientationAdminController {
  constructor(
    @Inject(OrientationAdminService) private readonly orientation: OrientationAdminService,
    @Inject(OrientationMediaService) private readonly media: OrientationMediaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Read the IELTS orientation draft and immutable version history' })
  @ApiOkResponse({ description: 'Current authoring state' })
  get(): Promise<AdminOrientationDto> {
    return this.orientation.get();
  }

  @Put('draft')
  @ApiOperation({ summary: 'Replace the IELTS orientation draft using optimistic concurrency' })
  @ApiOkResponse({ description: 'Updated draft' })
  @ApiConflictResponse({ description: 'Draft revision is stale' })
  update(@Body() input: UpdateOrientationDraftDto): Promise<AdminOrientationDto> {
    return this.orientation.updateDraft(input);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate the current IELTS orientation draft' })
  validate(@Body() input: ValidateOrientationDraftDto): Promise<OrientationValidationResult> {
    return this.orientation.validate(input);
  }

  @Post('publish')
  @ApiOperation({ summary: 'Publish an immutable IELTS orientation version' })
  @ApiCreatedResponse({ description: 'Published version' })
  publish(@Req() request: AuthenticatedRequest, @Body() input: PublishOrientationDto): Promise<PublishOrientationResult> {
    return this.orientation.publish(request.authUser.id, input);
  }

  @Post('archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive the current IELTS orientation release' })
  archive(@Req() request: AuthenticatedRequest): Promise<AdminOrientationDto> {
    return this.orientation.archive(request.authUser.id);
  }

  @Post('media')
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 20 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload local image or narration media for IELTS orientation authoring' })
  @ApiCreatedResponse({ description: 'Immutable local media metadata' })
  @ApiBody({ schema: { type: 'object', required: ['kind', 'file'], properties: {
    kind: { type: 'string', enum: ['AUDIO', 'IMAGE'] }, file: { type: 'string', format: 'binary' },
  } } })
  uploadMedia(
    @Req() request: AuthenticatedRequest,
    @Body() input: UploadOrientationMediaDto,
    @UploadedFile() file?: MultipartOrientationMedia,
  ) {
    return this.media.upload(request.authUser.id, input.kind, {
      body: file?.buffer ?? Buffer.alloc(0),
      fileName: file?.originalname ?? '',
      mimeType: file?.mimetype ?? 'application/octet-stream',
    });
  }

  @Get('media/:assetId/content')
  @ApiOperation({ summary: 'Stream authorized IELTS orientation media' })
  async streamMedia(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const content = await this.media.get(assetId);
    sendAudioStream(response, content, request.headers.range);
  }
}
