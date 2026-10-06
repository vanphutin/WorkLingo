import {
  Controller,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { ContentPublisherService } from './application/content-publisher.service.js';

@ApiTags('content authoring')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/lesson-versions')
export class LessonVersionsController {
  constructor(
    @Inject(ContentPublisherService)
    private readonly contentPublisherService: ContentPublisherService,
  ) {}

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive a published lesson version' })
  @ApiOkResponse({ description: 'Lesson version archived successfully' })
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contentPublisherService.archiveLessonVersion(id, request.authUser.id);
  }
}
