import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthService } from './application/auth.service';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from './auth.constants';
import type { AuthenticatedRequest } from './authenticated-request';
import { AuthUserDto } from './dto/auth-user.dto';
// Runtime imports are required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LoginDto } from './dto/login.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a learner account' })
  @ApiCreatedResponse({ type: AuthUserDto })
  @ApiConflictResponse({ description: 'Email is already registered' })
  async register(
    @Body() input: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserDto> {
    const result = await this.authService.register(input);
    this.setSessionCookie(response, result.sessionToken);
    return result.user;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserDto> {
    const result = await this.authService.login(input);
    this.setSessionCookie(response, result.sessionToken);
    return result.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out the current session' })
  @ApiNoContentResponse()
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(request.authSessionToken);
    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  private setSessionCookie(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: SESSION_DURATION_MS,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
  }
}
