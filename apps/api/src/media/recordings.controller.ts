import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiAcceptedResponse, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RecordingSubmissionResult } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { RecordingsService } from './application/recordings.service.js';
// Runtime import is required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateRecordingDto } from './dto/create-recording.dto.js';

interface MultipartAudioFile {
  readonly buffer: Buffer;
  readonly mimetype: string;
}

const MAX_CONFIGURABLE_RECORDING_BYTES = 50 * 1024 * 1024;

@ApiTags('recordings')
@Controller('activities/:activityId/recordings')
export class RecordingsController {
  constructor(@Inject(RecordingsService) private readonly recordings: RecordingsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('audio', {
    limits: { files: 1, fileSize: MAX_CONFIGURABLE_RECORDING_BYTES },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit a consented speaking recording for asynchronous evaluation' })
  @ApiAcceptedResponse({ description: 'Recording and transcription job saved' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio', 'sessionId', 'clientAttemptId', 'consentAccepted', 'consentPolicyVersion', 'consentScope'],
      properties: {
        audio: { type: 'string', format: 'binary' },
        sessionId: { type: 'string', format: 'uuid' },
        clientAttemptId: { type: 'string', format: 'uuid' },
        consentAccepted: { type: 'boolean' },
        consentPolicyVersion: { type: 'string' },
        consentScope: { type: 'string' },
      },
    },
  })
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() input: CreateRecordingDto,
    @UploadedFile() file?: MultipartAudioFile,
  ): Promise<RecordingSubmissionResult> {
    return this.recordings.submit({
      activityId,
      clientAttemptId: input.clientAttemptId,
      consentAccepted: input.consentAccepted,
      consentPolicyVersion: input.consentPolicyVersion,
      consentScope: input.consentScope,
      learnerId: request.authUser.id,
      sessionId: input.sessionId,
    }, {
      body: file?.buffer ?? Buffer.alloc(0),
      mimeType: file?.mimetype ?? 'application/octet-stream',
    });
  }
}

@ApiTags('recordings')
@Controller('recordings')
export class RecordingControlsController {
  constructor(@Inject(RecordingsService) private readonly recordings: RecordingsService) {}

  @Delete(':recordingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete retained recording audio early' })
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('recordingId', ParseUUIDPipe) recordingId: string,
  ): Promise<void> {
    return this.recordings.deleteOwned(request.authUser.id, recordingId);
  }
}
