import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Put, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsBandAdminService } from './application/ielts-band-admin.service.js';
import type { IeltsBandCurriculumCommandDto, SaveIeltsBandCurriculumDraftDto } from './dto/ielts-band-admin.dto.js';

@ApiTags('admin-ielts-band-curriculum')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/ielts-band-curriculum')
export class IeltsBandAdminController {
  constructor(@Inject(IeltsBandAdminService) private readonly curriculum: IeltsBandAdminService) {}
  @Get() @ApiOperation({ summary: 'Read the IELTS band curriculum workspace' }) get() { return this.curriculum.get(); }
  @Put('draft') @ApiOperation({ summary: 'Save the IELTS band curriculum draft' }) save(@Req() request: AuthenticatedRequest, @Body() input: SaveIeltsBandCurriculumDraftDto) { return this.curriculum.save(request.authUser.id, input); }
  @Post('validate') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Validate the IELTS band curriculum draft' }) validate(@Body() input: IeltsBandCurriculumCommandDto) { return this.curriculum.validate(input); }
  @Post('publish') @ApiOperation({ summary: 'Publish an immutable IELTS band curriculum version' }) publish(@Req() request: AuthenticatedRequest, @Body() input: IeltsBandCurriculumCommandDto) { return this.curriculum.publish(request.authUser.id, input); }
}
