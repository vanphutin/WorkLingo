import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsUUID, Max, Min } from 'class-validator';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { sendAudioStream } from '../media/application/audio-stream-response.js';
import { MockPlaybackService } from './application/mock-playback.service.js';
import { MockRecordingService } from './application/mock-recording.service.js';

export class StartMockPlaybackDto { @ApiProperty({ format: 'uuid' }) @IsUUID() clientPlayId!: string; }
export class UploadMockRecordingDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientRecordingId!: string;
  @ApiProperty({ minimum: 1, maximum: 3 }) @Type(() => Number) @IsInt() @Min(1) @Max(3) part!: number;
  @ApiProperty() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() consent!: boolean;
}
const limits = { fieldArrayIndexLimit: 0, files: 1, fileSize: 50 * 1024 * 1024 };

@ApiTags('IELTS mock media')
@ApiOkResponse({ description: 'Owned playback lease or recording' })
@Roles('LEARNER')
@Controller('me/ielts-mocks/attempts')
export class IeltsMockMediaController {
  constructor(@Inject(MockPlaybackService) private readonly playback: MockPlaybackService, @Inject(MockRecordingService) private readonly recordings: MockRecordingService) {}
  @Post(':attemptId/audio/:assetId/playback') @HttpCode(200) @ApiOperation({ summary: 'Start one user-initiated playback idempotently' }) start(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Param('assetId', ParseUUIDPipe) assetId: string, @Body() input: StartMockPlaybackDto) { return this.playback.start(request.authUser.id, attemptId, assetId, input.clientPlayId); }
  @Post(':attemptId/audio/:assetId/playback/:leaseId/activate') @HttpCode(200) activate(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId:string, @Param('assetId', ParseUUIDPipe) assetId:string, @Param('leaseId', ParseUUIDPipe) leaseId:string) { return this.playback.activate(request.authUser.id,attemptId,assetId,leaseId); }
  @Get(':attemptId/audio/:assetId/playback') @ApiOperation({ summary: 'Restore an owned live playback without consuming a new play' }) current(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Param('assetId', ParseUUIDPipe) assetId: string) { return this.playback.current(request.authUser.id, attemptId, assetId); }
  @Post(':attemptId/recordings') @UseInterceptors(FileInterceptor('audio', { limits })) @ApiConsumes('multipart/form-data') @ApiOperation({ summary: 'Persist consented Speaking audio without a transcription provider' }) upload(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Body() input: UploadMockRecordingDto, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) { return this.recordings.upload(request.authUser.id, attemptId, input, { body: file?.buffer ?? Buffer.alloc(0), mimeType: file?.mimetype ?? 'application/octet-stream' }); }
  @Get(':attemptId/recordings') @ApiOperation({ summary: 'Read the owner retained Speaking recordings' }) list(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId: string) { return this.recordings.listOwned(request.authUser.id, attemptId); }
  @Get(':attemptId/recordings/:recordingId/content') @ApiOperation({ summary: 'Play a retained owner recording' }) async content(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Param('recordingId', ParseUUIDPipe) recordingId: string, @Res() response: Response) { sendAudioStream(response, await this.recordings.read(request.authUser.id, attemptId, recordingId), request.headers.range); }
}
