import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  function createMockContext(authUser?: { roles: string[] }): ExecutionContext {
    const request = { authUser };
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access when no roles are required on handler or class', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const context = createMockContext({ roles: ['LEARNER'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when authenticated user has one of the required roles', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['CONTENT_ADMIN', 'SYSTEM_ADMIN']),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const context = createMockContext({ roles: ['CONTENT_ADMIN'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when user does not have any of the required roles', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['CONTENT_ADMIN', 'SYSTEM_ADMIN']),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const context = createMockContext({ roles: ['LEARNER'] });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('returns false when no user is attached to the request', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['CONTENT_ADMIN']),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const context = createMockContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });
});
