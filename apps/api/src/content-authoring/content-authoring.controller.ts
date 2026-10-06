import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ContentAuthoringErrorCode,
  type ContentImportDto,
  type ContentPreviewDto,
  type ValidateContentImportResult,
} from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { ContentImportsService } from './application/content-imports.service.js';
import { ContentPublisherService } from './application/content-publisher.service.js';
// Runtime imports are required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  CreateContentImportDto,
  PublishContentImportDto,
  UpdateContentSourceDto,
  ValidateContentImportDto,
} from './dto/content-import.dto.js';

@ApiTags('content authoring')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/content-imports')
export class ContentAuthoringController {
  constructor(
    @Inject(ContentImportsService)
    private readonly contentImportsService: ContentImportsService,
    @Inject(ContentPublisherService)
    private readonly contentPublisherService: ContentPublisherService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new content import draft' })
  @ApiCreatedResponse({ description: 'Draft created successfully' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Administrative role required' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateContentImportDto,
  ): Promise<ContentImportDto> {
    return this.contentImportsService.create(request.authUser.id, input.rawSource);
  }

  @Get()
  @ApiOperation({ summary: 'List all content imports in reverse chronological order' })
  @ApiOkResponse({ description: 'List of content imports' })
  list(@Req() request: AuthenticatedRequest): Promise<ContentImportDto[]> {
    return this.contentImportsService.list(request.authUser.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a content import by ID' })
  @ApiOkResponse({ description: 'Content import record' })
  get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentImportDto> {
    return this.contentImportsService.get(id, request.authUser.id);
  }

  @Patch(':id/source')
  @ApiOperation({ summary: 'Update raw source of a draft with optimistic concurrency check' })
  @ApiOkResponse({ description: 'Source updated successfully' })
  @ApiConflictResponse({ description: 'Draft revision conflict' })
  updateSource(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateContentSourceDto,
  ): Promise<ContentImportDto> {
    return this.contentImportsService.updateSource(id, request.authUser.id, input);
  }

  @Post(':id/validate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate a content import draft' })
  @ApiOkResponse({ description: 'Draft validated successfully' })
  @ApiConflictResponse({ description: 'Draft revision conflict' })
  @ApiUnprocessableEntityResponse({ description: 'Draft contains validation errors' })
  async validate(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ValidateContentImportDto,
  ): Promise<ValidateContentImportResult> {
    const result = await this.contentImportsService.validate(
      id,
      request.authUser.id,
      input.expectedDraftRevision,
    );

    if (!result.canPublish) {
      const hasParseError = result.issues.some((i) => i.code.startsWith('PARSE_'));
      const code = hasParseError
        ? ContentAuthoringErrorCode.CONTENT_PARSE_FAILED
        : ContentAuthoringErrorCode.CONTENT_VALIDATION_FAILED;

      throw new UnprocessableEntityException({
        statusCode: 422,
        code,
        message: 'Lesson source contains validation errors.',
        error: {
          code,
          message: 'Lesson source contains validation errors.',
          details: result.issues,
        },
        ...result,
      });
    }

    return result;
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Get normalized preview of a draft or validated content' })
  @ApiOkResponse({ description: 'Preview of lesson content and validation issues' })
  getPreview(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentPreviewDto> {
    return this.contentImportsService.getPreview(id, request.authUser.id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Atomically publish a validated content import draft' })
  @ApiOkResponse({ description: 'Draft published successfully' })
  publish(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PublishContentImportDto,
  ) {
    return this.contentPublisherService.publish(id, request.authUser.id, input);
  }
}
