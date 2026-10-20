import { Body, Controller, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { AdminContentLifecycleService } from './admin-content-lifecycle.service.js';
// Nest needs runtime DTO classes to emit request validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RemoveAdminContentDto, RemoveAdminContentParamsDto, RemoveAdminContentResultDto } from './dto/remove-admin-content.dto.js';

@ApiTags('admin-content-lifecycle')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/content-lifecycle')
export class AdminContentLifecycleController {
  constructor(@Inject(AdminContentLifecycleService) private readonly lifecycle: AdminContentLifecycleService) {}

  @Post(':kind/:id/remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete an unpublished draft or archive its current publication, preserving history' })
  @ApiOkResponse({ type: RemoveAdminContentResultDto })
  @ApiConflictResponse({ description: 'Stale revision, changed removal action, reused idempotency key or referenced content' })
  remove(@Req() req: AuthenticatedRequest, @Param() params: RemoveAdminContentParamsDto, @Body() input: RemoveAdminContentDto): Promise<RemoveAdminContentResultDto> {
    return this.lifecycle.remove(req.authUser.id, params.kind, params.id, input);
  }
}
