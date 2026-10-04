import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthService } from '../application/auth.service';
import { SESSION_COOKIE_NAME } from '../auth.constants';
import type { AuthenticatedRequest } from '../authenticated-request';
import { IS_PUBLIC_ROUTE } from '../public.decorator';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionToken = this.readCookie(
      request.headers.cookie,
      SESSION_COOKIE_NAME,
    );
    if (!sessionToken) {
      throw new UnauthorizedException('Authentication required');
    }

    request.authUser = await this.authService.authenticate(sessionToken);
    request.authSessionToken = sessionToken;
    return true;
  }

  private readCookie(header: string | undefined, name: string): string | undefined {
    if (!header) return undefined;

    for (const segment of header.split(';')) {
      const separator = segment.indexOf('=');
      if (separator < 0) continue;
      if (segment.slice(0, separator).trim() !== name) continue;

      try {
        return decodeURIComponent(segment.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
}
