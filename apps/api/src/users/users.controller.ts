import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthUserDto } from '../auth/dto/auth-user.dto';

@ApiTags('users')
@Controller()
export class UsersController {
  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated learner' })
  @ApiOkResponse({ type: AuthUserDto })
  getCurrentUser(@Req() request: AuthenticatedRequest): AuthUserDto {
    return request.authUser;
  }
}
