import { Body, ConflictException, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPreferences } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthUserDto } from '../auth/dto/auth-user.dto';
import { UsersService } from './application/users.service';
import { UserPreferencesDto } from './dto/user-preferences.dto';

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated learner' })
  @ApiOkResponse({ type: AuthUserDto })
  getCurrentUser(@Req() request: AuthenticatedRequest): AuthUserDto {
    return request.authUser;
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get UI preferences for the authenticated account' })
  @ApiOkResponse({ type: UserPreferencesDto })
  getPreferences(@Req() request: AuthenticatedRequest): Promise<UserPreferences> {
    return this.users.getPreferences(request.authUser.id);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update UI preferences for the authenticated account' })
  @ApiOkResponse({ type: UserPreferencesDto })
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() input: UserPreferencesDto,
  ): Promise<UserPreferences> {
    const expectedAccount = request.headers['x-worklingo-account-id'];
    if (expectedAccount !== undefined && expectedAccount !== request.authUser.id) {
      throw new ConflictException({ code: 'ACCOUNT_CHANGED', message: 'The signed-in account has changed' });
    }
    return this.users.updatePreferences(request.authUser.id, input);
  }
}
