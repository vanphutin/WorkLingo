import { Body, Inject, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { ProgramEnrollmentsService } from './application/program-enrollments.service.js';
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@ApiTags('Program enrollments')
@ApiResponse({ status: 403, description: 'Active program administrator required' })
@Controller('admin/learning-programs/:id/enrollments')
export class AdminProgramEnrollmentsController {
  constructor(@Inject(ProgramEnrollmentsService) private readonly enrollments: ProgramEnrollmentsService) {}
  @Get() @ApiOperation({ summary: 'List program enrollments' })
  list(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Query() query: unknown) { return this.enrollments.listAdmin(req.authUser.id, id, query); }
  @Post() @ApiOperation({ summary: 'Assign an exact published release' })
  assign(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) { return this.enrollments.assign(req.authUser.id, id, body); }
  @Post(':enrollmentId/transition') @HttpCode(200) @ApiOperation({ summary: 'Transition enrollment status without changing release pins' })
  transition(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string, @Body() body: unknown) { return this.enrollments.transition(req.authUser.id, id, enrollmentId, body); }
  @Get(':enrollmentId/history') @ApiOperation({ summary: 'Read enrollment history' })
  history(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string, @Query() query: unknown) { return this.enrollments.history(req.authUser.id, id, enrollmentId, query); }
}
