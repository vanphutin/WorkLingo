import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { TopicGenerationService } from './topic-generation.service.js';
// Runtime import supplies global ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { GenerateIntermediateTopicDto } from './intermediate-topics.dto.js';

@ApiTags('intermediate topic generation')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@ApiForbiddenResponse({ description: 'Content or system administrator required' })
@Controller('admin/intermediate-topics')
export class TopicGenerationController {
  constructor(@Inject(TopicGenerationService) private readonly generation: TopicGenerationService) {}
  @Post('generate') @HttpCode(200)
  @ApiOperation({ summary: 'Generate an editable complete topic using the explicitly selected AI; never saves or approves' })
  @ApiOkResponse({ description: 'Validated lesson candidate, stage plan and provider provenance' })
  @RateLimit({ keyType: 'USER_AND_OPERATION', limit: 3, scope: 'intermediate-topics:generate', windowSeconds: 60 })
  generate(@Body() input: GenerateIntermediateTopicDto) { return this.generation.generate(input); }
}
